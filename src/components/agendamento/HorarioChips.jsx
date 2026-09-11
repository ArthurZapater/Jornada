export default function HorarioChips({ horarios, selecionado, onSelecionar }) {
  if (!horarios.length) {
    return <p className="text-sm text-salvia-600">Nenhum horário livre nesta data. Escolha outro dia.</p>;
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Horários disponíveis">
      {horarios.map((horario) => {
        const ativo = horario === selecionado;
        return (
          <button
            key={horario}
            type="button"
            onClick={() => onSelecionar(horario)}
            aria-pressed={ativo}
            className={`h-11 rounded-full text-sm font-semibold ring-1 transition ${
              ativo
                ? 'bg-petroleo-800 text-white ring-petroleo-800'
                : 'bg-white/80 text-petroleo-900 ring-salvia-200 hover:ring-petroleo-600'
            }`}
          >
            {horario}
          </button>
        );
      })}
    </div>
  );
}
