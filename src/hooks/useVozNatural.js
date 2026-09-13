import { useCallback, useEffect, useRef, useState } from 'react';
import { contextoDeAudio } from '../utils/sons';
import { useSinteseDeFala } from './useSinteseDeFala';

// Voz do assistente: primeiro tenta a voz natural (OpenAI, pela função /api/voz, que
// guarda a chave no servidor); se ela não responder — desenvolvimento local, sem
// internet, limite atingido, chave não configurada —, cai para a voz do aparelho
// (speechSynthesis). A conversa nunca fica muda por causa da voz natural.
//
// VELOCIDADE: gerar o áudio de uma resposta inteira leva segundos. Por isso a
// resposta é dividida — a primeira frase sozinha, o resto em blocos — e todos os
// pedidos saem juntos. A primeira frase fica pronta rápido e já começa a tocar
// enquanto as outras terminam de chegar.

const ROTA = '/api/voz';
const PRAZO_MS = 15_000;
const LIMITE_TEXTO = 1200;
const CACHE_MAX = 24;
/** Tamanho alvo dos blocos depois da primeira frase. */
const BLOCO_CARACTERES = 260;

// CELULAR: iPhone (e navegadores que seguem a regra de autoplay à risca) só deixam um
// <audio> tocar som se ele foi iniciado dentro de um toque. A resposta chega segundos
// depois do toque na bolinha, então o MP3 era recusado e a conversa caía na voz
// robótica do aparelho. A saída é destravar() — tocar um silêncio no MESMO elemento,
// dentro do toque — e reaproveitar esse elemento em todas as falas.

const ehIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

let urlDoSilencio = null;
/** WAV de 50 ms em silêncio, como blob (a CSP libera blob: em media-src, não data:). */
function silencio() {
  if (urlDoSilencio) return urlDoSilencio;
  const amostras = 400;
  const dados = new DataView(new ArrayBuffer(44 + amostras));
  const escrever = (pos, texto) => [...texto].forEach((c, i) => dados.setUint8(pos + i, c.charCodeAt(0)));
  escrever(0, 'RIFF');
  dados.setUint32(4, 36 + amostras, true);
  escrever(8, 'WAVEfmt ');
  dados.setUint32(16, 16, true);
  dados.setUint16(20, 1, true);
  dados.setUint16(22, 1, true);
  dados.setUint32(24, 8000, true);
  dados.setUint32(28, 8000, true);
  dados.setUint16(32, 1, true);
  dados.setUint16(34, 8, true);
  escrever(36, 'data');
  dados.setUint32(40, amostras, true);
  for (let i = 0; i < amostras; i += 1) dados.setUint8(44 + i, 128);
  urlDoSilencio = URL.createObjectURL(new Blob([dados.buffer], { type: 'audio/wav' }));
  return urlDoSilencio;
}

/** Por que a fala saiu com a voz do aparelho — aparece no painel da conversa. */
export const MOTIVOS_VOZ_RESERVA = {
  desligada: 'a voz natural está desligada em Configurações',
  indisponivel: 'a voz natural não está configurada no servidor',
  rede: 'a voz natural não respondeu a tempo',
  bloqueio: 'o navegador bloqueou o áudio da voz natural',
};

/** Respostas que dizem "não adianta tentar de novo nesta sessão". */
const SEM_VOZ_NATURAL = new Set([404, 405, 501, 503]);

class FalhaDeVoz extends Error {
  constructor(status) {
    super(`voz natural indisponível (${status})`);
    this.status = status;
  }
}

/** Primeira frase sozinha (sai rápido); o resto agrupado em blocos por frase. */
export function dividirParaFala(texto) {
  const frases = texto.match(/[^.!?]+[.!?]*/g)?.map((f) => f.trim()).filter(Boolean) ?? [];
  if (frases.length <= 1) return frases;
  const [primeira, ...resto] = frases;
  const blocos = [primeira];
  let atual = '';
  resto.forEach((frase) => {
    if (atual && atual.length + frase.length + 1 > BLOCO_CARACTERES) {
      blocos.push(atual);
      atual = frase;
    } else {
      atual = atual ? `${atual} ${frase}` : frase;
    }
  });
  if (atual) blocos.push(atual);
  return blocos;
}

/**
 * Acorda a função da Vercel antes da primeira resposta: um pedido vazio é recusado
 * na hora (422), sem chamar a OpenAI, mas deixa a função pronta. Poupa a partida a
 * frio, que é o que mais atrasa a primeira fala.
 */
export function aquecerVozNatural() {
  fetch(ROTA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
}

/**
 * @param natural preferência "Voz natural" de Configurações
 * @returns {{falar: (texto: string) => Promise<boolean>, parar: () => void, destravar: () => void,
 *   falando: boolean, origem: 'natural'|'aparelho'|null, motivo: keyof MOTIVOS_VOZ_RESERVA|null,
 *   lerNivel: () => number}}
 */
export function useVozNatural({ vozURI = null, velocidade = 1, natural = true } = {}) {
  const reserva = useSinteseDeFala({ vozURI, velocidade });
  const [falando, setFalando] = useState(false);
  const [origem, setOrigem] = useState(null);
  const [motivo, setMotivo] = useState(null);
  const erroDeReproducao = useRef(null);
  const audio = useRef(null);
  const analisador = useRef(null);
  const amostras = useRef(null);
  const rodada = useRef(0);
  const encerrarPendente = useRef(null);
  const requisicoes = useRef(new Set());
  const indisponivel = useRef(false);
  const cache = useRef(new Map());

  const pararReserva = reserva.parar;
  const falarReserva = reserva.falar;

  const parar = useCallback(() => {
    rodada.current += 1;
    requisicoes.current.forEach((controle) => controle.abort());
    requisicoes.current.clear();
    encerrarPendente.current?.(false);
    if (audio.current) audio.current.pause();
    pararReserva();
    setFalando(false);
  }, [pararReserva]);

  useEffect(() => {
    const guardados = cache.current;
    return () => {
      parar();
      guardados.forEach((url) => URL.revokeObjectURL(url));
      guardados.clear();
    };
  }, [parar]);

  /** Um único <audio> para a sessão: é ele que fica destravado pelo toque. */
  const elementoDeAudio = useCallback(() => {
    if (audio.current) return audio.current;
    const el = new Audio();
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    audio.current = el;
    return el;
  }, []);

  /**
   * Medidor de volume para a bolinha. Só com o contexto já tocando (ligado a um
   * contexto suspenso, o áudio sairia mudo) e nunca no iPhone, onde passar o áudio
   * pelo Web Audio pode silenciá-lo quando o sistema suspende o contexto.
   */
  function ligarMedidor(el) {
    if (analisador.current || ehIOS()) return;
    const ctx = contextoDeAudio();
    if (ctx?.state !== 'running') return;
    try {
      const fonte = ctx.createMediaElementSource(el);
      const no = ctx.createAnalyser();
      no.fftSize = 256;
      fonte.connect(no).connect(ctx.destination);
      analisador.current = no;
      amostras.current = new Uint8Array(no.frequencyBinCount);
    } catch {
      /* sem medidor de volume; o áudio toca normalmente */
    }
  }

  /** Chame DENTRO do toque que abre a conversa: libera o <audio> para as falas seguintes. */
  const destravar = useCallback(() => {
    const el = elementoDeAudio();
    const url = silencio();
    try {
      el.muted = true;
      el.src = url;
      const tocando = el.play();
      const soltar = () => {
        el.muted = false;
        // Só pausa se ninguém trocou a fonte nesse meio-tempo (uma fala de verdade).
        if (el.src === url) el.pause();
      };
      if (tocando?.then) tocando.then(soltar, soltar);
      else soltar();
    } catch {
      el.muted = false;
    }
  }, [elementoDeAudio]);

  async function baixarAudio(texto) {
    const guardado = cache.current.get(texto);
    if (guardado) return guardado;
    const controle = new AbortController();
    requisicoes.current.add(controle);
    const prazo = setTimeout(() => controle.abort(), PRAZO_MS);
    try {
      const resposta = await fetch(ROTA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
        signal: controle.signal,
      });
      const tipo = resposta.headers.get('content-type') ?? '';
      if (!resposta.ok || !tipo.startsWith('audio/')) throw new FalhaDeVoz(resposta.ok ? 404 : resposta.status);
      const url = URL.createObjectURL(await resposta.blob());
      cache.current.set(texto, url);
      if (cache.current.size > CACHE_MAX) {
        const [maisAntigo, urlAntiga] = cache.current.entries().next().value;
        URL.revokeObjectURL(urlAntiga);
        cache.current.delete(maisAntigo);
      }
      return url;
    } finally {
      clearTimeout(prazo);
      requisicoes.current.delete(controle);
    }
  }

  function tocar(url, minha) {
    const el = elementoDeAudio();
    return new Promise((resolve) => {
      let resolvida = false;
      const encerrar = (completa) => {
        if (resolvida) return;
        resolvida = true;
        el.onended = null;
        el.onerror = null;
        if (rodada.current === minha) encerrarPendente.current = null;
        resolve(completa);
      };
      encerrarPendente.current = encerrar;
      el.onended = () => encerrar(true);
      el.onerror = () => {
        erroDeReproducao.current = 'rede';
        encerrar(false);
      };
      ligarMedidor(el);
      el.muted = false;
      el.src = url;
      el.playbackRate = velocidade;
      el.play().catch((erro) => {
        erroDeReproducao.current = erro?.name === 'NotAllowedError' ? 'bloqueio' : 'rede';
        encerrar(false);
      });
    });
  }

  async function falarNoAparelho(texto, minha, porque) {
    if (rodada.current !== minha) return false;
    setOrigem('aparelho');
    setMotivo(porque);
    const completa = await falarReserva(texto);
    if (rodada.current === minha) setFalando(false);
    return completa;
  }

  const falar = async (textoOriginal) => {
    const texto = (textoOriginal ?? '').replace(/\s+/g, ' ').trim().slice(0, LIMITE_TEXTO);
    if (!texto) return false;
    parar();
    const minha = rodada.current;
    setFalando(true);

    if (!natural || indisponivel.current) return falarNoAparelho(texto, minha, natural ? 'indisponivel' : 'desligada');

    const partes = dividirParaFala(texto);
    // Todos os pedidos saem já; cada parte toca assim que a anterior acaba.
    const downloads = partes.map((parte) => {
      const pedido = baixarAudio(parte);
      pedido.catch(() => {});
      return pedido;
    });

    for (let i = 0; i < partes.length; i += 1) {
      let url;
      try {
        url = await downloads[i];
      } catch (erro) {
        if (rodada.current !== minha) return false;
        const semVoz = erro instanceof FalhaDeVoz && SEM_VOZ_NATURAL.has(erro.status);
        if (semVoz) indisponivel.current = true;
        // O que faltava falar vai com a voz do aparelho.
        return falarNoAparelho(partes.slice(i).join(' '), minha, semVoz ? 'indisponivel' : 'rede');
      }
      if (rodada.current !== minha) return false;
      setOrigem('natural');
      setMotivo(null);
      erroDeReproducao.current = null;
      const completa = await tocar(url, minha);
      if (rodada.current !== minha) return false;
      if (!completa) return falarNoAparelho(partes.slice(i).join(' '), minha, erroDeReproducao.current ?? 'bloqueio');
    }
    setFalando(false);
    return true;
  };

  /** Volume atual da voz natural, de 0 a 1 — anima a bolinha. 0 na voz do aparelho. */
  const lerNivel = useCallback(() => {
    const no = analisador.current;
    const dados = amostras.current;
    if (!no || !dados || audio.current?.paused) return 0;
    no.getByteFrequencyData(dados);
    let soma = 0;
    for (let i = 0; i < dados.length; i += 1) soma += dados[i];
    return Math.min(1, soma / dados.length / 110);
  }, []);

  return { falar, parar, destravar, falando, origem, motivo, lerNivel };
}
