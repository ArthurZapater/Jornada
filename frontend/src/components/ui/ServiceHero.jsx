import IconTile from './IconTile';
import LeafArt from './LeafArt';

const FUNDOS = {
  verde: 'bg-linear-to-br from-superficie/85 via-salvia-100/85 to-salvia-200/80',
  lilas: 'bg-linear-to-br from-superficie/85 via-lilas-100/85 to-lilas-200/80',
};

/** Hero card das telas de serviço (Consulta médica, Exames, Encaminhamentos...). */
export default function ServiceHero({ icone, titulo, descricao, tom = 'verde', children }) {
  return (
    <section className={`relative overflow-hidden rounded-[1.75rem] p-6 shadow-[var(--shadow-glass)] ring-1 ring-borda/80 lg:p-7 ${FUNDOS[tom]}`}>
      <LeafArt tom={tom} className="-right-6 -top-4 h-56 w-80" />
      <div className="relative">
        <IconTile icone={icone} tom={tom === 'lilas' ? 'lilasSolido' : 'solido'} tamanho="lg" />
        <h2 className="mt-5 text-2xl font-semibold tracking-tight lg:text-[1.75rem]">{titulo}</h2>
        <p className="mt-1.5 max-w-xs text-[0.9375rem] text-salvia-600">{descricao}</p>
        {children}
      </div>
    </section>
  );
}
