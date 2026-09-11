import { Search, X } from 'lucide-react';

export function CampoBusca({ valor, onChange, placeholder, rotulo = 'Buscar', className = '' }) {
  return (
    <div className={`glass-strong flex h-12 items-center gap-2.5 rounded-full px-4 focus-within:ring-2 focus-within:ring-petroleo-600 ${className}`}>
      <Search size={18} className="shrink-0 text-salvia-600" aria-hidden="true" />
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={rotulo}
        className="h-full w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-salvia-600 [&::-webkit-search-cancel-button]:hidden"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="grid h-7 w-7 place-items-center rounded-full text-salvia-600 hover:bg-superficie"
          aria-label="Limpar busca"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function FiltroChips({ opcoes, valor, onChange, rotulo }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={rotulo}>
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => onChange(opcao.valor)}
            aria-pressed={ativo}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium ring-1 transition ${
              ativo
                ? 'bg-petroleo-800 text-white ring-petroleo-800'
                : 'bg-superficie/65 text-texto ring-borda hover:bg-superficie'
            }`}
          >
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}
