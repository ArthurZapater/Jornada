import { createContext, useCallback, useContext, useRef } from 'react';
import { useConversaPorVoz } from '../hooks/useConversaPorVoz';

// A conversa por voz mora no layout, não numa tela: o botão abre a bolinha em qualquer
// página e a conversa continua ao navegar (ex.: tocar em "Ver resultados" no meio
// dela). O chat, quando está aberto, registra-se para receber cada troca na hora;
// fora dele, as trocas ficam no histórico e aparecem quando o chat abrir.

const ConversaContext = createContext(null);

export function ConversaProvider({ children }) {
  const ouvinte = useRef(null);
  const aoInteragir = useCallback((interacao) => ouvinte.current?.(interacao), []);
  const conversa = useConversaPorVoz({ aoInteragir });

  /** @returns função que desfaz o registro — use como retorno do useEffect. */
  const registrarOuvinte = useCallback((funcao) => {
    ouvinte.current = funcao;
    return () => {
      if (ouvinte.current === funcao) ouvinte.current = null;
    };
  }, []);

  return <ConversaContext.Provider value={{ ...conversa, registrarOuvinte }}>{children}</ConversaContext.Provider>;
}

export function useConversa() {
  const contexto = useContext(ConversaContext);
  if (!contexto) throw new Error('useConversa deve ser usado dentro de <ConversaProvider>');
  return contexto;
}
