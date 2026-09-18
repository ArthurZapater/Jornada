import { Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useTema } from '../../contexts/TemaContext';
import { MOLA } from '../ui/animacoes';

export default function BotaoTema() {
  const { escuro, alternar } = useTema();
  const Icone = escuro ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={escuro}
      title={escuro ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      aria-label={escuro ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      className="grid h-11 w-11 place-items-center rounded-full bg-superficie/65 text-acento ring-1 ring-borda transition hover:bg-superficie"
    >
      <motion.span
        key={escuro ? 'sol' : 'lua'}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={MOLA}
        className="grid place-items-center"
      >
        <Icone size={20} aria-hidden="true" />
      </motion.span>
    </button>
  );
}
