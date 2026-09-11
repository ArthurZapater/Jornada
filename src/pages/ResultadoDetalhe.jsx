import { CalendarPlus, FileText, Hourglass, Printer, TriangleAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Carregando, MensagemErro } from '../components/ui/Feedback';
import IconTile from '../components/ui/IconTile';
import LeafArt from '../components/ui/LeafArt';
import PageHeader from '../components/ui/PageHeader';
import SecurityNote from '../components/ui/SecurityNote';
import StatusBadge from '../components/ui/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { obterExame } from '../services/exameService';
import { formatarData } from '../utils/format';

export default function ResultadoDetalhe() {
  const { id } = useParams();
  const exame = useAsync(() => obterExame(id), [id]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Laudo do exame" voltarPara="/resultados" compartilhar />
      {exame.carregando && !exame.dados ? (
        <Carregando />
      ) : exame.erro ? (
        <MensagemErro mensagem={exame.erro.message} />
      ) : (
        <Detalhe exame={exame.dados} />
      )}
    </div>
  );
}

function Detalhe({ exame }) {
  const { resultado } = exame;
  const alterados = resultado?.itens.filter((i) => i.alterado).length ?? 0;
  const meta = [
    { rotulo: 'Solicitado por', valor: exame.medicoSolicitante ?? 'Autossolicitação' },
    { rotulo: 'Unidade', valor: exame.unidade.nome },
    { rotulo: 'Realizado em', valor: exame.dataRealizacao ? formatarData(exame.dataRealizacao) : '—' },
    { rotulo: 'Liberado em', valor: resultado ? formatarData(resultado.dataDisponibilizacao) : '—' },
  ];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-superficie/85 via-salvia-100/85 to-salvia-200/80 p-6 ring-1 ring-borda/80 shadow-[var(--shadow-glass)]">
        <LeafArt className="-right-8 -top-6 h-52 w-80" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <IconTile icone={FileText} tom="solido" tamanho="lg" />
            <StatusBadge status={exame.status} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">{exame.tipoExame.nome}</h2>
          <p className="text-salvia-600">{exame.tipoExame.categoria}</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {meta.map(({ rotulo, valor }) => (
              <div key={rotulo}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-salvia-600">{rotulo}</dt>
                <dd className="text-sm font-medium">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {!resultado ? (
        <div className="glass-strong flex items-center gap-4 rounded-3xl p-5">
          <IconTile icone={Hourglass} tom="ambar" />
          <p>
            <span className="block font-semibold">Resultado em processamento</span>
            <span className="text-sm text-salvia-600">Você receberá uma notificação assim que o laudo for liberado.</span>
          </p>
        </div>
      ) : (
        <>
          {alterados > 0 && (
            <div className="flex items-start gap-3 rounded-3xl bg-ambar-50 p-4 ring-1 ring-borda/70">
              <TriangleAlert size={20} className="mt-0.5 shrink-0 text-ambar-700" aria-hidden="true" />
              <p className="text-sm">
                <span className="font-semibold">
                  {alterados} {alterados === 1 ? 'valor fora' : 'valores fora'} da referência.
                </span>{' '}
                Converse com seu médico antes de tirar conclusões.
              </p>
            </div>
          )}

          <section className="glass-strong overflow-hidden rounded-3xl" aria-labelledby="valores">
            <h3 id="valores" className="px-5 pt-5 font-semibold">Resultados</h3>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-salvia-600">
                    <th scope="col" className="px-5 py-2 font-semibold">Parâmetro</th>
                    <th scope="col" className="px-5 py-2 font-semibold">Resultado</th>
                    <th scope="col" className="px-5 py-2 font-semibold">Referência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-salvia-100">
                  {resultado.itens.map((item) => (
                    <tr key={item.parametro}>
                      <th scope="row" className="px-5 py-3 text-left font-medium">{item.parametro}</th>
                      <td className={`px-5 py-3 ${item.alterado ? 'font-semibold text-ambar-700' : ''}`}>
                        {item.valor}
                        {item.alterado && <span className="ml-2 rounded-full bg-ambar-50 px-2 py-0.5 text-xs">Alterado</span>}
                      </td>
                      <td className="px-5 py-3 text-salvia-600">{item.referencia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass-strong rounded-3xl p-5" aria-labelledby="conclusao">
            <h3 id="conclusao" className="font-semibold">Conclusão do laudo</h3>
            <p className="mt-2">{resultado.laudo}</p>
            <p className="mt-3 text-sm text-salvia-600">Responsável técnico: {resultado.responsavel}</p>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button variante="secundario" tamanho="lg" icone={Printer} onClick={() => window.print()}>
              Imprimir laudo
            </Button>
            <Button as={Link} to="/consultas/agendar?especialidade=1" tamanho="lg" icone={CalendarPlus}>
              Agendar retorno
            </Button>
          </div>
        </>
      )}
      <SecurityNote />
    </div>
  );
}
