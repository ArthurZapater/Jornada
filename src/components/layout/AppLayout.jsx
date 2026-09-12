import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AudioLines, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificacoes } from '../../contexts/NotificacoesContext';
import Logo from '../brand/Logo';
import Avatar from '../ui/Avatar';
import { Carregando } from '../ui/Feedback';
import BotaoNotificacoes from './BotaoNotificacoes';
import BotaoTema from './BotaoTema';
import BuscaGlobal from './BuscaGlobal';
import MenuUsuario from './MenuUsuario';
import Sidebar from './Sidebar';
import { MOLA, transicaoPagina } from '../ui/animacoes';
import { NAV_MOBILE } from './navegacao';
import { conversaPorVozDisponivel, prepararVoz } from '../../hooks/useSinteseDeFala';

const ConversaPorVoz = lazy(() => import('../assistente/ConversaPorVoz'));

export default function AppLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-superficie focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <div className="lg:pl-72">
        <header className="hidden items-center gap-6 px-8 pb-2 pt-4 lg:flex">
          <BuscaGlobal className="max-w-xl flex-1" />
          <div className="ml-auto flex items-center gap-3">
            <BotaoTema />
            <BotaoNotificacoes />
            <MenuUsuario />
          </div>
        </header>
        {pathname === '/' && <BarraSuperiorMobile />}
        <main id="conteudo" className="px-4 pb-32 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pr-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pathname} {...transicaoPagina}>
              <Suspense fallback={<Carregando />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {!pathname.startsWith('/assistente') && <AtalhosAssistente />}
      <NavegacaoInferior />
    </div>
  );
}

/** Atalhos para o assistente, presentes em todas as telas: conversar por voz e abrir o chat. */
function AtalhosAssistente() {
  const [conversando, setConversando] = useState(false);
  // A tela da conversa só é baixada no primeiro toque; depois fica montada para animar a saída.
  const [usada, setUsada] = useState(false);
  const fechar = useCallback(() => setConversando(false), []);

  return (
    <div className="fixed bottom-24 right-4 z-30 flex items-center gap-2 lg:bottom-6 lg:right-6">
      {conversaPorVozDisponivel() && (
        <button
          type="button"
          onClick={() => {
            prepararVoz(); // dentro do toque: iOS só libera a voz assim
            setUsada(true);
            setConversando(true);
          }}
          className="glass-strong flex h-12 items-center gap-2 rounded-full px-3.5 font-semibold text-acento transition hover:bg-superficie sm:px-4"
        >
          <AudioLines size={20} aria-hidden="true" />
          <span className="hidden sm:inline">Conversar</span>
          <span className="sr-only sm:hidden">Conversar com o assistente por voz</span>
        </button>
      )}
      <Link
        to="/assistente"
        className="flex h-12 items-center gap-2 rounded-full bg-petroleo-800 px-3.5 font-semibold text-white shadow-[0_16px_32px_-12px_rgb(20_58_51/0.8)] transition hover:bg-petroleo-700 sm:px-4"
      >
        <Sparkles size={20} aria-hidden="true" />
        <span className="hidden sm:inline">Assistente</span>
        <span className="sr-only sm:hidden">Abrir assistente</span>
      </Link>
      {usada && (
        <Suspense fallback={null}>
          <ConversaPorVoz aberta={conversando} aoFechar={fechar} />
        </Suspense>
      )}
    </div>
  );
}

function BarraSuperiorMobile() {
  const { usuario } = useAuth();
  return (
    <header className="flex items-center justify-between px-5 pt-5 lg:hidden">
      <Link to="/" aria-label="Jornada — início">
        <Logo tamanho="sm" />
      </Link>
      <div className="flex items-center gap-2">
        <BotaoTema />
        <BotaoNotificacoes />
        <Link to="/perfil" aria-label="Meu perfil">
          <Avatar nome={usuario.nome} foto={usuario.fotoUrl} tamanho="sm" />
        </Link>
      </div>
    </header>
  );
}

function NavegacaoInferior() {
  const { naoLidas } = useNotificacoes();
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
      <ul className="glass-strong mx-auto flex max-w-md justify-around rounded-[1.75rem] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV_MOBILE.map(({ to, rotulo, icone: Icone, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-1 text-[0.6875rem] font-medium ${isActive ? 'text-acento' : 'text-salvia-600'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative grid h-8 w-14 place-items-center">
                    {isActive && (
                      <motion.span
                        layoutId="pilula-navegacao-mobile"
                        transition={MOLA}
                        className="absolute inset-0 rounded-full bg-salvia-100"
                      />
                    )}
                    <Icone size={21} strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" className="relative" />
                    {to === '/notificacoes' && naoLidas > 0 && (
                      <span className="absolute right-3 top-0.5 h-2.5 w-2.5 rounded-full bg-petroleo-800 ring-2 ring-borda" aria-label={`${naoLidas} não lidas`} />
                    )}
                  </span>
                  {rotulo}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
