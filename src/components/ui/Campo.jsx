/** Campo de formulário com rótulo, ícone, mensagem de erro e dica acessíveis. */
export default function Campo({ id, rotulo, erro, dica, icone: Icone, acessorio, className = '', ...props }) {
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {rotulo}
      </label>
      <div
        className={`flex h-12 items-center gap-2.5 rounded-2xl bg-superficie/80 px-4 ring-1 transition focus-within:ring-2 ${
          erro ? 'ring-alerta-600' : 'ring-salvia-200 focus-within:ring-petroleo-600'
        }`}
      >
        {Icone && <Icone size={18} className="shrink-0 text-salvia-600" aria-hidden="true" />}
        <input
          id={id}
          className="h-full w-full min-w-0 bg-transparent text-[0.9375rem] outline-none placeholder:text-salvia-600"
          aria-invalid={Boolean(erro)}
          aria-describedby={descricao}
          {...props}
        />
        {acessorio}
      </div>
      {erro ? (
        <p id={`${id}-erro`} className="mt-1.5 text-sm text-alerta-600">
          {erro}
        </p>
      ) : (
        dica && (
          <p id={`${id}-dica`} className="mt-1.5 text-xs text-salvia-600">
            {dica}
          </p>
        )
      )}
    </div>
  );
}

/** Texto de várias linhas, com contador quando há limite. */
export function AreaDeTexto({ id, rotulo, dica, maxLength, value = '', className = '', ...props }) {
  const descricao = dica || maxLength ? `${id}-dica` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {rotulo}
      </label>
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        aria-describedby={descricao}
        rows={3}
        className="block w-full resize-y rounded-2xl bg-superficie/80 px-4 py-3 text-[0.9375rem] outline-none ring-1 ring-salvia-200 transition placeholder:text-salvia-600 focus:ring-2 focus:ring-petroleo-600"
        {...props}
      />
      {descricao && (
        <p id={descricao} className="mt-1.5 flex justify-between gap-3 text-xs text-salvia-600">
          <span>{dica}</span>
          {maxLength && <span aria-hidden="true">{value.length}/{maxLength}</span>}
        </p>
      )}
    </div>
  );
}

/** Lista suspensa nativa no visual dos campos. */
export function CampoSelecao({ id, rotulo, opcoes, vazio = 'Selecione', className = '', ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {rotulo}
      </label>
      <select
        id={id}
        className="h-12 w-full rounded-2xl bg-superficie/80 px-4 text-[0.9375rem] outline-none ring-1 ring-salvia-200 transition focus:ring-2 focus:ring-petroleo-600"
        {...props}
      >
        <option value="">{vazio}</option>
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}
