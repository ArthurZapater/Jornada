import { iniciais } from '../../utils/format';

const TAMANHOS = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-2xl',
};

export default function Avatar({ nome, tamanho = 'md', className = '' }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br from-petroleo-700 to-petroleo-900 font-semibold text-white ring-2 ring-white/80 ${TAMANHOS[tamanho]} ${className}`}
      aria-hidden="true"
    >
      {iniciais(nome)}
    </span>
  );
}
