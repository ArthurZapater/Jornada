import { diaEMes } from '../../utils/format';

/** Bloco de data em destaque (dia grande + mês) dos cards de consulta. */
export default function DataBloco({ data, apagado = false, className = '' }) {
  const { dia, mes } = diaEMes(data);
  return (
    <span
      className={`flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl ${
        apagado
          ? 'bg-salvia-100 text-acento'
          : 'bg-linear-to-br from-petroleo-600 to-petroleo-900 text-white shadow-[0_10px_20px_-12px_rgb(27_75_65/0.9)]'
      } ${className}`}
    >
      <span className="text-2xl font-semibold leading-none">{dia}</span>
      <span className="mt-1 text-sm">{mes}</span>
    </span>
  );
}
