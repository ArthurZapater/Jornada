import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { gravar, ler, remover } from '../utils/storage';

const CHAVE = 'jornada:tema';
const COR_BARRA = { claro: '#e6efe9', escuro: '#0f1917' };

const TemaContext = createContext(null);

/** 'claro' | 'escuro' quando a pessoa escolheu; 'sistema' enquanto não escolher. */
function preferenciaSalva() {
  const salvo = ler(CHAVE);
  return salvo === 'claro' || salvo === 'escuro' ? salvo : 'sistema';
}

const temaDoSistema = () => (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');

export function TemaProvider({ children }) {
  const [preferencia, setPreferencia] = useState(preferenciaSalva);
  const [doSistema, setDoSistema] = useState(temaDoSistema);
  const tema = preferencia === 'sistema' ? doSistema : preferencia;

  // useLayoutEffect: aplica o atributo antes da pintura, evitando piscada.
  useLayoutEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[tema]);
  }, [tema]);

  // Acompanha a mudança no sistema; só vale enquanto a preferência for "sistema".
  useEffect(() => {
    const consulta = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!consulta) return undefined;
    const aoMudar = (evento) => setDoSistema(evento.matches ? 'escuro' : 'claro');
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  const definir = useCallback((nova) => {
    if (nova === 'sistema') remover(CHAVE);
    else gravar(CHAVE, nova);
    setPreferencia(nova);
  }, []);

  const alternar = useCallback(() => definir(tema === 'escuro' ? 'claro' : 'escuro'), [definir, tema]);

  const valor = useMemo(
    () => ({ tema, preferencia, escuro: tema === 'escuro', alternar, definir }),
    [tema, preferencia, alternar, definir],
  );
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error('useTema deve ser usado dentro de <TemaProvider>');
  return contexto;
}
