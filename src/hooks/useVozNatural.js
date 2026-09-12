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
 * @returns {{falar: (texto: string) => Promise<boolean>, parar: () => void, falando: boolean,
 *   origem: 'natural'|'aparelho'|null, lerNivel: () => number}}
 */
export function useVozNatural({ vozURI = null, velocidade = 1, natural = true } = {}) {
  const reserva = useSinteseDeFala({ vozURI, velocidade });
  const [falando, setFalando] = useState(false);
  const [origem, setOrigem] = useState(null);
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

  /** Um único <audio> para a sessão: o analisador só pode ser ligado a ele uma vez. */
  function elementoDeAudio() {
    if (audio.current) return audio.current;
    const el = new Audio();
    el.preload = 'auto';
    audio.current = el;
    const ctx = contextoDeAudio();
    // Ligado ao contexto só se ele já estiver tocando; ligado a um contexto suspenso,
    // o áudio sairia mudo.
    if (ctx?.state === 'running') {
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
    return el;
  }

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
      el.onerror = () => encerrar(false);
      el.src = url;
      el.playbackRate = velocidade;
      el.play().catch(() => encerrar(false));
    });
  }

  async function falarNoAparelho(texto, minha) {
    if (rodada.current !== minha) return false;
    setOrigem('aparelho');
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

    if (!natural || indisponivel.current) return falarNoAparelho(texto, minha);

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
        if (erro instanceof FalhaDeVoz && SEM_VOZ_NATURAL.has(erro.status)) indisponivel.current = true;
        // O que faltava falar vai com a voz do aparelho.
        return falarNoAparelho(partes.slice(i).join(' '), minha);
      }
      if (rodada.current !== minha) return false;
      setOrigem('natural');
      const completa = await tocar(url, minha);
      if (rodada.current !== minha) return false;
      if (!completa) return falarNoAparelho(partes.slice(i).join(' '), minha);
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

  return { falar, parar, falando, origem, lerNivel };
}
