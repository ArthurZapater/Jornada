import { useCallback, useEffect, useRef, useState } from 'react';
import { usePreferencias } from '../contexts/PreferenciasContext';
import { enviarPergunta } from '../services/chatbotService';
import { normalizar } from '../utils/format';
import { destravarAudio, modoDaSessaoDeAudio, tocarSom } from '../utils/sons';
import { sinalizarAtividade } from './useInatividade';
import { reconhecimentoDisponivel, useReconhecimentoDeFala } from './useReconhecimentoDeFala';
import { prepararVoz } from './useSinteseDeFala';
import { aquecerVozNatural, useVozNatural } from './useVozNatural';

// Conversa por voz: a pessoa fala, o assistente responde falando e volta a ouvir.
// Usada pelo ConversaProvider do layout, então funciona em qualquer tela. As respostas são as MESMAS do chat (enviarPergunta), e cada troca
// entra na conversa escrita.
//
// Freios do ciclo automático de microfone:
// - só começa com um toque (iniciar() precisa ser chamado dentro do clique);
// - só ouve depois que a voz do assistente termina, para não transcrever a si mesmo;
// - silêncio pausa a conversa em vez de religar o microfone sem fim;
// - sair da aba desliga tudo na hora; "tchau" encerra.

export const conversaPorVozDisponivel = () => reconhecimentoDisponivel();

const PEDIDO_PARA_ENCERRAR = /^(tchau|ate mais|ate logo|encerrar|encerra|pode parar|parar|sair|so isso|era so isso|obrigad[oa],? (era )?so isso)\b/;

/** O que vai para a voz: texto e itens, sem sinais que soam estranhos lidos em voz alta. */
export function textoParaFala(resposta) {
  return [resposta.texto, ...(resposta.itens ?? [])]
    .map((trecho) => trecho.replace(/\s+—\s+/g, ', ').replace(/(\p{L})\/(\p{Lu}{2})\b/gu, '$1, $2').trim())
    .map((trecho) => (/[.!?]$/.test(trecho) ? trecho : `${trecho}.`))
    .join(' ');
}

/**
 * @param aoInteragir recebe cada interação (pergunta + resposta) para entrar no chat
 * @returns fase: 'inativa' | 'ouvindo' | 'pensando' | 'falando' | 'pausada'
 */
export function useConversaPorVoz({ aoInteragir }) {
  const { preferencias } = usePreferencias();
  const [fase, setFase] = useState('inativa');
  const [legenda, setLegenda] = useState({ autor: null, texto: '', link: null });
  const ativa = useRef(false);
  const interagir = useRef(aoInteragir);

  useEffect(() => {
    interagir.current = aoInteragir;
  }, [aoInteragir]);

  const voz = useVozNatural({
    vozURI: preferencias.vozURI,
    velocidade: preferencias.velocidadeVoz,
    natural: preferencias.vozNatural,
  });
  const fala = useReconhecimentoDeFala({
    aoTranscrever: (trecho) => setLegenda((atual) => ({ autor: 'voce', texto: atual.autor === 'voce' ? `${atual.texto} ${trecho}` : trecho })),
    aoConcluir: (ditado) => responder(ditado),
    aoEncerrarSemFala: () => ativa.current && setFase((atual) => (atual === 'ouvindo' ? 'pausada' : atual)),
  });

  function ouvir({ comSom = true } = {}) {
    if (!ativa.current) return;
    voz.parar();
    modoDaSessaoDeAudio('auto');
    const abriu = fala.iniciar();
    if (abriu && comSom) tocarSom('ouvir');
    setFase(abriu ? 'ouvindo' : 'pausada');
  }

  async function falarEOuvir(texto) {
    setFase('falando');
    modoDaSessaoDeAudio('playback');
    const terminou = await voz.falar(texto);
    // Interrompida (toque, encerrar) não religa o microfone.
    if (terminou && ativa.current) ouvir();
  }

  async function responder(ditado) {
    if (!ativa.current) return;
    sinalizarAtividade();
    setLegenda({ autor: 'voce', texto: ditado });

    if (PEDIDO_PARA_ENCERRAR.test(normalizar(ditado))) {
      setLegenda({ autor: 'assistente', texto: 'Até mais! Quando precisar, é só chamar.' });
      setFase('falando');
      modoDaSessaoDeAudio('playback');
      await voz.falar('Até mais! Quando precisar, é só chamar.');
      if (ativa.current) encerrar();
      return;
    }

    setFase('pensando');
    try {
      const interacao = await enviarPergunta(ditado, { latenciaMs: 120 });
      if (!ativa.current) return;
      interagir.current?.(interacao);
      setLegenda({ autor: 'assistente', texto: interacao.resposta.texto, link: interacao.resposta.link });
      falarEOuvir(textoParaFala(interacao.resposta));
    } catch {
      if (!ativa.current) return;
      const falha = 'Não consegui responder agora. Tente de novo em instantes.';
      setLegenda({ autor: 'assistente', texto: falha });
      falarEOuvir(falha);
    }
  }

  /** Chame DENTRO do toque: destrava áudio e voz (iOS/Safari) e abre o microfone. */
  function iniciar() {
    if (ativa.current) return;
    destravarAudio();
    prepararVoz();
    if (preferencias.vozNatural) {
      voz.destravar();
      aquecerVozNatural();
    }
    ativa.current = true;
    setLegenda({ autor: null, texto: '', link: null });
    tocarSom('inicio');
    // Sem saudação falada: como no Gemini, o som avisa e o microfone já abre.
    ouvir({ comSom: false });
  }

  const encerrar = useCallback(() => {
    if (!ativa.current) return;
    ativa.current = false;
    fala.cancelar();
    voz.parar();
    modoDaSessaoDeAudio('auto');
    tocarSom('fim');
    setFase('inativa');
    setLegenda({ autor: null, texto: '', link: null });
    // fala.cancelar e voz.parar são estáveis; voz.parar muda só com a voz reserva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fala.cancelar, voz.parar]);

  /** Toque na bolinha: ouvindo, entrega o que foi dito; falando ou pausada, volta a ouvir. */
  function tocarNaBolinha() {
    if (fase === 'ouvindo') fala.parar();
    else if (fase === 'falando' || fase === 'pausada') ouvir();
  }

  // Aba em segundo plano: nada de microfone aberto nem voz falando sozinha.
  useEffect(() => {
    const aoEsconder = () => {
      if (!document.hidden || !ativa.current) return;
      fala.cancelar();
      voz.parar();
      setFase('pausada');
    };
    document.addEventListener('visibilitychange', aoEsconder);
    return () => document.removeEventListener('visibilitychange', aoEsconder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fala.cancelar, voz.parar]);

  // Saiu da área logada (logout, sessão expirada): encerra de vez.
  useEffect(
    () => () => {
      ativa.current = false;
    },
    [],
  );

  return {
    fase,
    ativa: fase !== 'inativa',
    legenda,
    parcial: fala.parcial,
    erro: fala.erro,
    origemDaVoz: voz.origem,
    motivoDaVozReserva: voz.motivo,
    lerNivel: voz.lerNivel,
    iniciar,
    encerrar,
    tocarNaBolinha,
  };
}
