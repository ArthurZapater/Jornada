import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ler } from '../utils/storage';

export const CHAVE_ONBOARDING = 'jornada:onboarding-visto';

export function RotaProtegida() {
  const { autenticado } = useAuth();
  const location = useLocation();
  if (!autenticado) {
    const destino = ler(CHAVE_ONBOARDING, false) ? '/login' : '/boas-vindas';
    return <Navigate to={destino} replace state={{ de: location }} />;
  }
  return <Outlet />;
}

export function RotaPublica() {
  const { autenticado } = useAuth();
  const location = useLocation();
  if (autenticado) return <Navigate to={location.state?.de?.pathname ?? '/'} replace />;
  return <Outlet />;
}
