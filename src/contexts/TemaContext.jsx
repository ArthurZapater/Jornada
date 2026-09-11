import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { gravar, ler } from '../utils/storage';

const CHAVE = 'jornada:tema';
const COR_BARRA = { claro: '#e6efe9', escuro: '#0f1917' };

const TemaContext = createContext(null);

/** Preferência salva; na primeira visita, segue o sistema operacional. */
function temaInicial() {
  const salvo = ler(CHAVE);
  if (salvo === 'claro' || salvo === 'escuro') return salvo;
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  // useLayoutEffect: aplica o atributo antes da pintura, evitando piscada.
  useLayoutEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[tema]);
  }, [tema]);

  // Enquanto o usuário não escolher, acompanha a mudança no sistema.
  useEffect(() => {
    if (ler(CHAVE)) return;
    const consulta = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!consulta) return;
    const aoMudar = (evento) => setTema(evento.matches ? 'escuro' : 'claro');
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  const alternar = useCallback(() => {
    setTema((atual) => {
      const novo = atual === 'escuro' ? 'claro' : 'escuro';
      gravar(CHAVE, novo);
      return novo;
    });
  }, []);

  const valor = useMemo(() => ({ tema, escuro: tema === 'escuro', alternar }), [tema, alternar]);
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error('useTema deve ser usado dentro de <TemaProvider>');
  return contexto;
}
