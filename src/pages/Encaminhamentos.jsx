import { ArrowRight, CalendarPlus, Forward } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ConteudoAssincrono, Vazio } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import SecurityNote from '../components/ui/SecurityNote';
import ServiceHero from '../components/ui/ServiceHero';
import StatusBadge from '../components/ui/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { listarEncaminhamentos } from '../services/encaminhamentoService';
import { formatarData } from '../utils/format';

export default function Encaminhamentos() {
  const encaminhamentos = useAsync(listarEncaminhamentos, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Encaminhamentos" subtitulo="Acompanhe seus pedidos para especialistas." compartilhar />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
        <div className="space-y-4">
          <ServiceHero icone={Forward} titulo="Encaminhamentos" descricao="Do clínico ao especialista, sem perder nenhuma etapa." />
          <SecurityNote />
        </div>

        <ConteudoAssincrono estado={encaminhamentos} vazio={<Vazio icone={Forward} titulo="Nenhum encaminhamento" descricao="Quando seu médico emitir um, ele aparece aqui." />}>
          {(lista) => {
            const ativos = lista.filter((e) => e.status !== 'CONCLUIDO');
            const historico = lista.filter((e) => e.status === 'CONCLUIDO');
            return (
              <div className="space-y-6">
                <Secao titulo="Encaminhamentos ativos">
                  {ativos.length ? ativos.map((e) => <Cartao key={e.id} encaminhamento={e} />) : <p className="text-sm text-salvia-600">Nenhum encaminhamento ativo.</p>}
                </Secao>
                {historico.length > 0 && (
                  <Secao titulo="Histórico">
                    {historico.map((e) => <Cartao key={e.id} encaminhamento={e} />)}
                  </Secao>
                )}
              </div>
            );
          }}
        </ConteudoAssincrono>
      </div>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-salvia-600">{titulo}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Cartao({ encaminhamento: e }) {
  const concluido = e.status === 'CONCLUIDO';
  const dados = concluido
    ? [
        { rotulo: 'Emissão', valor: formatarData(e.dataEmissao) },
        { rotulo: 'Atendido em', valor: formatarData(e.dataConclusao) },
        { rotulo: 'Unidade', valor: e.unidadeDestino.nome },
      ]
    : [
        { rotulo: 'Emissão', valor: formatarData(e.dataEmissao) },
        { rotulo: 'Validade', valor: formatarData(e.validade) },
        { rotulo: 'Unidade destino', valor: e.unidadeDestino.nome },
      ];

  return (
    <article className={`@container rounded-3xl p-5 ring-1 ring-white ${concluido ? 'bg-white/45' : 'glass-strong'}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{e.especialidadeDestino.nome}</h3>
          <p className="text-sm text-salvia-600">
            {e.medicoOrigem} · {e.especialidadeOrigem}
          </p>
        </div>
        <StatusBadge status={e.status} />
      </header>
      <p className="mt-3 text-sm">{e.motivo}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white/60 p-3 @md:grid-cols-3">
        {dados.map(({ rotulo, valor }) => (
          <div key={rotulo}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-salvia-600">{rotulo}</dt>
            <dd className="text-sm font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
      {e.status === 'ATIVO' && (
        <Button as={Link} to={`/consultas/agendar?especialidade=${e.especialidadeDestino.id}`} icone={CalendarPlus} iconeFim={ArrowRight} className="mt-4" tamanho="sm">
          Agendar com especialista
        </Button>
      )}
    </article>
  );
}
