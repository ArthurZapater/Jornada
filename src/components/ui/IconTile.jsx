const TONS = {
  verde: 'bg-salvia-100 text-petroleo-800',
  solido: 'bg-linear-to-br from-petroleo-700 to-petroleo-900 text-white shadow-[0_8px_18px_-10px_rgb(27_75_65/0.9)]',
  lilas: 'bg-lilas-100 text-lilas-600',
  lilasSolido: 'bg-linear-to-br from-lilas-500 to-lilas-600 text-white shadow-[0_8px_18px_-10px_rgb(88_92_154/0.9)]',
  vidro: 'bg-white/80 text-petroleo-800 ring-1 ring-white',
  alerta: 'bg-alerta-50 text-alerta-600',
  ambar: 'bg-ambar-50 text-ambar-700',
};

const TAMANHOS = {
  sm: { caixa: 'h-10 w-10 rounded-xl', icone: 19 },
  md: { caixa: 'h-12 w-12 rounded-2xl', icone: 22 },
  lg: { caixa: 'h-16 w-16 rounded-[1.25rem]', icone: 30 },
};

/** Ícone dentro de quadrado arredondado — padrão visual dos cards da Jornada. */
export default function IconTile({ icone: Icone, tom = 'verde', tamanho = 'md', className = '' }) {
  const t = TAMANHOS[tamanho];
  return (
    <span className={`grid shrink-0 place-items-center ${t.caixa} ${TONS[tom]} ${className}`} aria-hidden="true">
      <Icone size={t.icone} strokeWidth={1.9} />
    </span>
  );
}
