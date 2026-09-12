import { useEffect, useRef } from 'react';
import { INATIVIDADE_MS, registrarAtividade } from '../services/segurancaService';

const EVENTOS_DE_ATIVIDADE = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
/** Rolagem dispara muito; não faz sentido gravar a marca a cada evento. */
const INTERVALO_DA_MARCA_MS = 10_000;

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
