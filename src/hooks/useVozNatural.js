import { useCallback, useEffect, useRef, useState } from 'react';
import { contextoDeAudio } from '../utils/sons';
import { useSinteseDeFala } from './useSinteseDeFala';

// Voz do assistente: primeiro tenta a voz natural (OpenAI, pela função /api/voz, que
// guarda a chave no servidor); se ela não responder — desenvolvimento local, sem
// internet, limite atingido, chave não configurada —, cai para a voz do aparelho
// (speechSynthesis). A conversa nunca fica muda por causa da voz natural.

const ROTA = '/api/voz';
const PRAZO_MS = 15_000;
const LIMITE_TEXTO = 1200;
const CACHE_MAX = 12;

/** Respostas que dizem "não adianta tentar de novo nesta sessão". */
const SEM_VOZ_NATURAL = new Set([404, 405, 501, 503]);

class FalhaDeVoz extends Error {
  constructor(status) {
    super(`voz natural indisponível (${status})`);
    this.status = status;
  }
}

/**
 * @param natural preferência "Voz natural" de Configurações
 * @returns {{falar: (texto: string) => Promise<boolean>, parar: () => void, falando: boolean,
 *   origem: 'natural'|'aparelho'|null, lerNivel: () => number, suportado: boolean}}
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
  const requisicao = useRef(null);
  const indisponivel = useRef(false);
  const cache = useRef(new Map());

  const pararReserva = reserva.parar;
  const falarReserva = reserva.falar;

  const parar = useCallback(() => {
    rodada.current += 1;
    requisicao.current?.abort();
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
    requisicao.current = controle;
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
        if (rodada.current === minha) {
          setFalando(false);
          encerrarPendente.current = null;
        }
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

  const falar = async (textoOriginal) => {
    const texto = (textoOriginal ?? '').replace(/\s+/g, ' ').trim().slice(0, LIMITE_TEXTO);
    if (!texto) return false;
    parar();
    const minha = rodada.current;
    setFalando(true);

    if (natural && !indisponivel.current) {
      try {
        const url = await baixarAudio(texto);
        if (rodada.current !== minha) return false;
        setOrigem('natural');
        const completa = await tocar(url, minha);
        // Tocou e foi interrompida, ou terminou: não repete com a outra voz.
        if (completa || rodada.current !== minha) return completa;
      } catch (erro) {
        if (rodada.current !== minha) return false;
        if (erro instanceof FalhaDeVoz && SEM_VOZ_NATURAL.has(erro.status)) indisponivel.current = true;
      }
    }

    if (rodada.current !== minha) return false;
    setOrigem('aparelho');
    const completa = await falarReserva(texto);
    if (rodada.current === minha) setFalando(false);
    return completa;
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

  return { falar, parar, falando, origem, lerNivel, suportado: true };
}
