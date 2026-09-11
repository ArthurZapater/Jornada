import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar';

export default function MenuUsuario() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const fecharAoClicarFora = (e) => !raiz.current?.contains(e.target) && setAberto(false);
    const fecharComEsc = (e) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEsc);
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEsc);
    };
  }, [aberto]);

  function sair() {
    logout();
    navigate('/login', { replace: true });
  }

  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-salvia-100';

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex items-center gap-3 rounded-full bg-superficie/65 py-1 pl-1 pr-4 ring-1 ring-borda transition hover:bg-superficie"
      >
        <Avatar nome={usuario.nome} tamanho="sm" />
        <span className="text-[15px] font-medium">{usuario.nome}</span>
        <ChevronDown size={18} className={`transition ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {aberto && (
        <div role="menu" className="glass-strong absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl p-2">
          <Link role="menuitem" to="/perfil" className={item} onClick={() => setAberto(false)}>
            <UserRound size={18} aria-hidden="true" /> Meu perfil
          </Link>
          <Link role="menuitem" to="/notificacoes" className={item} onClick={() => setAberto(false)}>
            <Bell size={18} aria-hidden="true" /> Notificações
          </Link>
          <button role="menuitem" type="button" onClick={sair} className={`${item} text-alerta-600 hover:bg-alerta-50`}>
            <LogOut size={18} aria-hidden="true" /> Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}
