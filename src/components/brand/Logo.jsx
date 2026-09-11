import { useId } from 'react';

/** Símbolo da Jornada: duas folhas formando um broto. */
export function LogoMark({ className = 'h-9 w-9', variante = 'padrao' }) {
  const id = useId();
  const claro = variante === 'claro';
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-e`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={claro ? '#ffffff' : '#3f7d6b'} />
          <stop offset="1" stopColor={claro ? '#cfe3d7' : '#1b4b41'} />
        </linearGradient>
        <linearGradient id={`${id}-d`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={claro ? '#e9f3ed' : '#9cc3ad'} />
          <stop offset="1" stopColor={claro ? '#9cc3ad' : '#2f6e60'} />
        </linearGradient>
      </defs>
      <path d="M19 35C9 33 4 22 7 8c9 3 14 13 12 27Z" fill={`url(#${id}-e)`} />
      <path d="M21 35c10-2 15-13 12-27-9 3-14 13-12 27Z" fill={`url(#${id}-d)`} />
    </svg>
  );
}

const TAMANHOS = {
  sm: { marca: 'h-7 w-7', texto: 'text-xl' },
  md: { marca: 'h-9 w-9', texto: 'text-[1.7rem]' },
  lg: { marca: 'h-12 w-12', texto: 'text-4xl' },
};

export default function Logo({ tamanho = 'md', className = '' }) {
  const t = TAMANHOS[tamanho];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={t.marca} />
      <span className={`${t.texto} font-bold tracking-tight text-acento`}>Jornada</span>
    </span>
  );
}
