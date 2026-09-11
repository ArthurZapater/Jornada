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
          className="h-full w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-salvia-600"
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
