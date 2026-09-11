import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import * as notificacaoService from '../services/notificacaoService';

const NotificacoesContext = createContext(null);

export function NotificacoesProvider({ children }) {
  const { autenticado } = useAuth();
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    if (!autenticado) return;
    setCarregando(true);
    try {
      setNotificacoes(await notificacaoService.listarNotificacoes());
    } catch {
      /* mantém a lista atual; o badge não deve quebrar a tela */
    } finally {
      setCarregando(false);
    }
  }, [autenticado]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const marcarComoLida = useCallback(async (id) => {
    setNotificacoes((lista) => lista.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    await notificacaoService.marcarComoLida(id);
  }, []);

  const marcarTodasComoLidas = useCallback(async () => {
    setNotificacoes((lista) => lista.map((n) => ({ ...n, lida: true })));
    await notificacaoService.marcarTodasComoLidas();
  }, []);

  const valor = useMemo(() => {
    // Após o logout a lista antiga fica no estado, mas nunca é exposta.
    const visiveis = autenticado ? notificacoes : [];
    return {
      notificacoes: visiveis,
      naoLidas: visiveis.filter((n) => !n.lida).length,
      carregando,
      carregar,
      marcarComoLida,
      marcarTodasComoLidas,
    };
  }, [autenticado, notificacoes, carregando, carregar, marcarComoLida, marcarTodasComoLidas]);

  return <NotificacoesContext.Provider value={valor}>{children}</NotificacoesContext.Provider>;
}

export function useNotificacoes() {
  const contexto = useContext(NotificacoesContext);
  if (!contexto) throw new Error('useNotificacoes deve ser usado dentro de <NotificacoesProvider>');
  return contexto;
}
