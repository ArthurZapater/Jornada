import { ArrowRight, Bell, Bluetooth, CalendarDays, CreditCard, FileText, FlaskConical, HeartPulse, House, MapPin, UserRound } from 'lucide-react';

export const NAV_PRINCIPAL = [
  { to: '/', rotulo: 'Início', icone: House, end: true },
  { to: '/consultas', rotulo: 'Consultas', icone: CalendarDays },
  { to: '/exames', rotulo: 'Exames', icone: FlaskConical },
  { to: '/resultados', rotulo: 'Resultados', icone: FileText },
  { to: '/encaminhamentos', rotulo: 'Encaminhamentos', icone: ArrowRight },
  { to: '/rede', rotulo: 'Rede credenciada', icone: MapPin },
  { to: '/plano-de-cuidado', rotulo: 'Plano de cuidado', icone: HeartPulse },
  { to: '/conexoes', rotulo: 'Conexões', icone: Bluetooth },
  { to: '/pagamento', rotulo: 'Pagamento', icone: CreditCard },
];

export const NAV_MOBILE = [
  { to: '/', rotulo: 'Início', icone: House, end: true },
  { to: '/exames', rotulo: 'Exames', icone: FlaskConical },
  { to: '/conexoes', rotulo: 'Conexões', icone: Bluetooth },
  { to: '/notificacoes', rotulo: 'Notificações', icone: Bell },
  { to: '/perfil', rotulo: 'Perfil', icone: UserRound },
];
