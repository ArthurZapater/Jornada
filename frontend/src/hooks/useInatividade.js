import { useEffect, useRef } from 'react';
import { INATIVIDADE_MS, registrarAtividade } from '../services/segurancaService';

/** Uso que não passa por toque nem teclado (ex.: conversa por voz) avisa por este evento. */
const EVENTO_DE_USO = 'jornada:atividade';
const EVENTOS_DE_ATIVIDADE = ['pointerdown', 'keydown', 'scroll', 'touchstart', EVENTO_DE_USO];
/** Rolagem dispara muito; não faz sentido gravar a marca a cada evento. */
const INTERVALO_DA_MARCA_MS = 10_000;

/** Conta como interação: quem conversa só falando não pode ter a sessão derrubada no meio. */
export function sinalizarAtividade() {
  window.dispatchEvent(new Event(EVENTO_DE_USO));
}

/**
 * Encerra a sessão após um período sem interação — protege a conta em
 * computador compartilhado, cenário comum em unidade de atendimento.
 */
export function useInatividade({ ativo, aoExpirar, limiteMs = INATIVIDADE_MS }) {
  const callback = useRef(aoExpirar);

  useEffect(() => {
    callback.current = aoExpirar;
  }, [aoExpirar]);

  useEffect(() => {
    if (!ativo) return;
    let timer;
    let marcadoEm = 0;
    const reiniciar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), limiteMs);
      const agora = Date.now();
      if (agora - marcadoEm > INTERVALO_DA_MARCA_MS) {
        marcadoEm = agora;
        registrarAtividade(agora);
      }
    };
    reiniciar();
    EVENTOS_DE_ATIVIDADE.forEach((evento) => window.addEventListener(evento, reiniciar, { passive: true }));
    document.addEventListener('visibilitychange', reiniciar);
    return () => {
      clearTimeout(timer);
      EVENTOS_DE_ATIVIDADE.forEach((evento) => window.removeEventListener(evento, reiniciar));
      document.removeEventListener('visibilitychange', reiniciar);
    };
  }, [ativo, limiteMs]);
}
