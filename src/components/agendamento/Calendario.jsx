import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { nomeDoMes, toISODate } from '../../utils/format';

const DIAS_SEMANA = [
  ['D', 'Domingo'], ['S', 'Segunda'], ['T', 'Terça'], ['Q', 'Quarta'],
  ['Q', 'Quinta'], ['S', 'Sexta'], ['S', 'Sábado'],
];

export default function Calendario({
  ano,
  mes,
  diasDisponiveis = [],
  selecionado,
  onSelecionar,
  onMudarMes,
  podeVoltar,
  podeAvancar,
  carregando = false,
}) {
  const disponiveis = new Set(diasDisponiveis);
  const vazios = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const celulas = [...Array(vazios).fill(null), ...Array.from({ length: totalDias }, (_, i) => i + 1)];

  const botaoMes =
    'grid h-9 w-9 place-items-center rounded-full text-acento transition hover:bg-salvia-100 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => onMudarMes(-1)} disabled={!podeVoltar} className={botaoMes} aria-label="Mês anterior">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p className="flex items-center gap-2 font-semibold" aria-live="polite">
          {nomeDoMes(mes)} {ano}
          {carregando && <LoaderCircle size={14} className="animate-spin text-salvia-600" aria-label="Carregando dias" />}
        </p>
        <button type="button" onClick={() => onMudarMes(1)} disabled={!podeAvancar} className={botaoMes} aria-label="Próximo mês">
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DIAS_SEMANA.map(([letra, nome], i) => (
          <abbr key={i} title={nome} className="py-1 text-xs font-semibold text-salvia-600 no-underline">
            {letra}
          </abbr>
        ))}
        {celulas.map((dia, i) => {
          if (!dia) return <span key={`vazio-${i}`} />;
          const iso = toISODate(new Date(ano, mes, dia));
          const livre = disponiveis.has(iso);
          const ativo = iso === selecionado;
          return (
            <button
              key={iso}
              type="button"
              disabled={!livre || carregando}
              onClick={() => onSelecionar(iso)}
              aria-pressed={ativo}
              aria-label={`${dia} de ${nomeDoMes(mes)}${livre ? ', disponível' : ', indisponível'}`}
              className={`mx-auto grid aspect-square w-full max-w-11 place-items-center rounded-xl text-sm transition ${
                ativo
                  ? 'bg-petroleo-800 font-semibold text-white shadow-md'
                  : livre
                    ? 'bg-salvia-100 font-medium text-texto hover:bg-salvia-200'
                    : 'text-texto/35'
              }`}
            >
              {dia}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-4 text-xs text-salvia-600" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-salvia-100 ring-1 ring-salvia-200" /> Disponível</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-petroleo-800" /> Selecionado</span>
      </div>
    </div>
  );
}
