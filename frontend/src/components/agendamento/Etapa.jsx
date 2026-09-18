import { Check } from 'lucide-react';

/**
 * Uma etapa do fluxo de agendamento.
 * estado: 'concluida' (mostra o resumo + "Alterar") | 'ativa' (mostra as opções) | 'pendente'
 */
export default function Etapa({ numero, titulo, estado, resumo, onAlterar, children }) {
  const concluida = estado === 'concluida';
  const ativa = estado === 'ativa';
  return (
    <section
      className={`rounded-3xl p-4 transition sm:p-5 ${estado === 'pendente' ? 'bg-superficie/35 ring-1 ring-borda/60' : 'glass-strong'}`}
      aria-current={ativa ? 'step' : undefined}
    >
      <header className="flex items-center gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
            concluida
              ? 'bg-petroleo-800 text-white'
              : ativa
                ? 'bg-salvia-100 text-acento ring-2 ring-petroleo-700'
                : 'bg-superficie/70 text-salvia-600'
          }`}
        >
          {concluida ? <Check size={16} strokeWidth={2.6} aria-label="Etapa concluída" /> : numero}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-salvia-600">{titulo}</h2>
          {concluida && resumo && <p className="truncate font-semibold">{resumo}</p>}
        </div>
        {concluida && onAlterar && (
          <button
            type="button"
            onClick={onAlterar}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-acento transition hover:bg-superficie/80"
          >
            Alterar
          </button>
        )}
      </header>
      {ativa && <div className="mt-4">{children}</div>}
    </section>
  );
}
