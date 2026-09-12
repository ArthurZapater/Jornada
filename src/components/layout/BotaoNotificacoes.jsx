import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotificacoes } from '../../contexts/NotificacoesContext';

export default function BotaoNotificacoes() {
  const { naoLidas } = useNotificacoes();
  const rotulo = naoLidas ? `Notificações, ${naoLidas} não lidas` : 'Notificações';
  return (
    <Link
      to="/notificacoes"
      aria-label={rotulo}
      className="relative grid h-11 w-11 place-items-center rounded-full bg-superficie/65 text-acento ring-1 ring-borda transition hover:bg-superficie"
    >
      <Bell size={20} aria-hidden="true" />
      {naoLidas > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-petroleo-800 px-1 text-[0.6875rem] font-semibold text-white ring-2 ring-borda" aria-hidden="true">
          {naoLidas}
        </span>
      )}
    </Link>
  );
}
