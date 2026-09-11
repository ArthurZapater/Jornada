import { useEffect, useRef } from 'react';
import { INATIVIDADE_MS } from '../services/segurancaService';

const EVENTOS_DE_ATIVIDADE = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

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
    const reiniciar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), limiteMs);
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
