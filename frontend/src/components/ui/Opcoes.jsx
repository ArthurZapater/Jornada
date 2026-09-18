import { Check } from 'lucide-react';

/**
 * Pergunta de escolha em pílulas. Toque de novo desmarca: toda pergunta do perfil
 * é opcional, então precisa dar para voltar a "não respondido".
 *
 * @param multiplo lista de valores em vez de um só
 * @param exclusiva valor que desmarca os outros (ex.: "Nenhuma")
 */
export default function GrupoOpcoes({ id, legenda, dica, opcoes, valor, onChange, multiplo = false, exclusiva, className = '' }) {
  const marcado = (v) => (multiplo ? valor.includes(v) : valor === v);

  function tocar(v) {
    if (!multiplo) return onChange(valor === v ? null : v);
    if (valor.includes(v)) return onChange(valor.filter((x) => x !== v));
    if (v === exclusiva) return onChange([v]);
    return onChange([...valor.filter((x) => x !== exclusiva), v]);
  }

  return (
    <fieldset id={id} className={className}>
      <legend className="mb-2 text-sm font-medium">{legenda}</legend>
      {dica && <p className="-mt-1 mb-2.5 text-xs text-salvia-600">{dica}</p>}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => {
          const ativo = marcado(opcao.valor);
          return (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => tocar(opcao.valor)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${
                ativo ? 'bg-petroleo-800 text-white ring-petroleo-800' : 'bg-superficie/65 text-texto ring-borda hover:bg-superficie'
              }`}
            >
              {ativo && <Check size={14} strokeWidth={2.6} aria-hidden="true" />}
              {opcao.rotulo}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
