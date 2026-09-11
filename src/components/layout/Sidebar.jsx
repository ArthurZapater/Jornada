import { HeartPulse } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, NavLink } from 'react-router-dom';
import Logo from '../brand/Logo';
import { MOLA } from '../ui/animacoes';
import { NAV_PRINCIPAL } from './navegacao';

export default function Sidebar() {
  return (
    <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-64 flex-col rounded-[2rem] p-5 lg:flex">
      <Link to="/" className="mb-8 mt-2 px-3" aria-label="Jornada — início">
        <Logo />
      </Link>
      <nav aria-label="Menu principal">
        <ul className="space-y-1.5">
          {NAV_PRINCIPAL.map(({ to, rotulo, icone: Icone, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition ${
                    isActive ? 'text-white' : 'text-petroleo-900 hover:bg-white/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="pilula-navegacao"
                        transition={MOLA}
                        className="absolute inset-0 rounded-2xl bg-petroleo-800 shadow-[0_12px_24px_-14px_rgb(27_75_65/0.9)]"
                      />
                    )}
                    <Icone size={20} strokeWidth={1.9} aria-hidden="true" className="relative" />
                    <span className="relative">{rotulo}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto flex items-center gap-3 rounded-3xl bg-white/55 p-4 ring-1 ring-white/70">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-petroleo-700" aria-hidden="true">
          <HeartPulse size={20} />
        </span>
        <p className="text-sm leading-snug text-petroleo-900">
          Cuidar de você
          <br />é o nosso destino.
        </p>
      </div>
    </aside>
  );
}
