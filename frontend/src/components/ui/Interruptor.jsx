import { motion } from 'motion/react';
import { MOLA } from './animacoes';

/** Liga/desliga acessível (role="switch"), no formato de linha de ajustes do iOS. */
export default function Interruptor({ id, rotulo, descricao, ligado, onChange, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3.5 ${className}`}>
      <span className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer font-medium">
          {rotulo}
        </label>
        {descricao && (
          <span id={`${id}-descricao`} className="block text-sm text-salvia-600">
            {descricao}
          </span>
        )}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-describedby={descricao ? `${id}-descricao` : undefined}
        onClick={() => onChange(!ligado)}
        className={`relative flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
          ligado ? 'justify-end bg-petroleo-800' : 'justify-start bg-salvia-400'
        }`}
      >
        <motion.span layout transition={MOLA} className="block h-5 w-5 rounded-full bg-superficie shadow-sm" />
      </button>
    </div>
  );
}
