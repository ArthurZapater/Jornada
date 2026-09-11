import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(() => authService.getSessao());

  const login = useCallback(async (credenciais) => {
    const nova = await authService.login(credenciais);
    setSessao(nova);
    return nova;
  }, []);

  const cadastrar = useCallback(async (dados) => {
    const nova = await authService.cadastrar(dados);
    setSessao(nova);
    return nova;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setSessao(null);
  }, []);

  const valor = useMemo(
    () => ({
      usuario: sessao?.beneficiario ?? null,
      token: sessao?.token ?? null,
      autenticado: Boolean(sessao),
      login,
      cadastrar,
      logout,
    }),
    [sessao, login, cadastrar, logout],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return contexto;
}
