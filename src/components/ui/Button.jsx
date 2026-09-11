import { LoaderCircle } from 'lucide-react';

const VARIANTES = {
  primario:
    'bg-petroleo-800 text-white shadow-[0_12px_24px_-12px_rgb(27_75_65/0.8)] hover:bg-petroleo-700 active:bg-petroleo-900',
  secundario: 'bg-white/75 text-petroleo-800 ring-1 ring-white shadow-sm hover:bg-white',
  fantasma: 'text-petroleo-800 hover:bg-white/60',
  perigo: 'bg-alerta-50 text-alerta-600 hover:bg-alerta-100',
};

const TAMANHOS = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-14 px-7 text-base',
};

/** Botão em pílula. Aceita `as={Link}` para navegação com a mesma aparência. */
export default function Button({
  as: Componente = 'button',
  variante = 'primario',
  tamanho = 'md',
  icone: Icone,
  iconeFim: IconeFim,
  bloco = false,
  carregando = false,
  disabled,
  className = '',
  children,
  ...props
}) {
  const propsDeBotao =
    Componente === 'button' ? { type: props.type ?? 'button', disabled: disabled || carregando } : {};
  return (
    <Componente
      className={`relative inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${bloco ? 'w-full' : ''} ${className}`}
      aria-busy={carregando || undefined}
      {...props}
      {...propsDeBotao}
    >
      {carregando ? (
        <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
      ) : (
        Icone && <Icone size={18} aria-hidden="true" />
      )}
      <span>{children}</span>
      {IconeFim && <IconeFim size={18} aria-hidden="true" className={bloco ? 'absolute right-6' : ''} />}
    </Componente>
  );
}
