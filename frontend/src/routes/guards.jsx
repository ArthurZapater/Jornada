import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ler } from '../utils/storage';

export const CHAVE_ONBOARDING = 'jornada:onboarding-visto';
export const ROTA_QUESTIONARIO = '/completar-perfil';

export function RotaProtegida() {
  const { autenticado, usuario } = useAuth();
  const location = useLocation();
  if (!autenticado) {
    const destino = ler(CHAVE_ONBOARDING, false) ? '/login' : '/boas-vindas';
    return <Navigate to={destino} replace state={{ de: location }} />;
  }
  // Primeiro acesso: antes de qualquer tela, o questionário do perfil. "Responder
  // depois" muda o status para ADIADO e libera o app.
  if (usuario.questionario === 'PENDENTE' && location.pathname !== ROTA_QUESTIONARIO) {
    return <Navigate to={ROTA_QUESTIONARIO} replace state={{ de: location }} />;
  }
  return <Outlet />;
}

export function RotaPublica() {
  const { autenticado } = useAuth();
  const location = useLocation();
  if (autenticado) return <Navigate to={location.state?.de?.pathname ?? '/'} replace />;
  return <Outlet />;
}
