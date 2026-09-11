import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import { useInatividade } from '../hooks/useInatividade';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(() => authService.getSessao());
  const [encerradaPorInatividade, setEncerradaPorInatividade] = useState(false);

  const login = useCallback(async (credenciais) => {
    const nova = await authService.login(credenciais);
    setEncerradaPorInatividade(false);
    setSessao(nova);
    return nova;
  }, []);

  const cadastrar = useCallback(async (dados) => {
    const nova = await authService.cadastrar(dados);
    setEncerradaPorInatividade(false);
    setSessao(nova);
    return nova;
  }, []);

  const logout = useCallback((motivo = 'LOGOUT') => {
    authService.logout(motivo);
    setSessao(null);
  }, []);

  // Sessao esquecida aberta em computador compartilhado encerra sozinha.
  const expirarPorInatividade = useCallback(() => {
    setEncerradaPorInatividade(true);
    logout('SESSAO_EXPIRADA');
  }, [logout]);

  useInatividade({ ativo: Boolean(sessao), aoExpirar: expirarPorInatividade });

  const valor = useMemo(
    () => ({
      usuario: sessao?.beneficiario ?? null,
      token: sessao?.token ?? null,
      autenticado: Boolean(sessao),
      encerradaPorInatividade,
      login,
      cadastrar,
      logout,
    }),
    [sessao, encerradaPorInatividade, login, cadastrar, logout],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return contexto;
}
