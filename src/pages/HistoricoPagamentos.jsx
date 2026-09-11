import { CircleCheck, TriangleAlert } from 'lucide-react';
import { LogoMark } from '../components/brand/Logo';
import { ConteudoAssincrono, Vazio } from '../components/ui/Feedback';
import LeafArt from '../components/ui/LeafArt';
import PageHeader from '../components/ui/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { listarHistorico } from '../services/pagamentoService';
import { formatarData, formatarMoeda } from '../utils/format';

export default function HistoricoPagamentos() {
  const historico = useAsync(listarHistorico, []);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Histórico de pagamentos" subtitulo="Todas as mensalidades quitadas." voltarPara="/pagamento" />
      <ConteudoAssincrono
        estado={historico}
        vazio={<Vazio icone={CircleCheck} titulo="Nenhum pagamento registrado" descricao="Suas mensalidades pagas aparecem aqui." />}
      >
        {(lista) => {
          const anos = [...new Set(lista.map((m) => m.competencia.slice(0, 4)))];
          const totalPorAno = (ano) =>
            lista.filter((m) => m.competencia.startsWith(ano)).reduce((soma, m) => soma + m.valor, 0);
          return (
            <div className="space-y-6">
              <section className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-petroleo-600 via-petroleo-800 to-petroleo-950 p-6 text-white">
                <LeafArt tom="escuro" className="-right-10 -top-6 h-52 w-80" />
                <p className="relative flex items-center gap-2 text-xs uppercase tracking-widest text-white/75">
                  <LogoMark variante="claro" className="h-5 w-5" /> Total pago em {anos[0]}
                </p>
                <p className="relative mt-1 text-3xl font-semibold">{formatarMoeda(totalPorAno(anos[0]))}</p>
              </section>

              {anos.map((ano) => (
                <section key={ano} aria-labelledby={`ano-${ano}`}>
                  <h2 id={`ano-${ano}`} className="mb-3 text-xs font-semibold uppercase tracking-wider text-salvia-600">
                    {ano}
                  </h2>
                  <ul className="glass-strong divide-y divide-salvia-100 overflow-hidden rounded-3xl">
                    {lista
                      .filter((m) => m.competencia.startsWith(ano))
                      .map((m) => {
                        const comAtraso = m.status === 'PAGA_COM_ATRASO';
                        return (
                          <li key={m.id} className="flex items-center gap-4 px-4 py-3.5">
                            {comAtraso ? (
                              <TriangleAlert size={20} className="shrink-0 text-ambar-700" aria-hidden="true" />
                            ) : (
                              <CircleCheck size={20} className="shrink-0 text-acento" aria-hidden="true" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">Mensalidade — {m.rotuloCompetencia}</span>
                              <span className="block text-sm text-salvia-600">
                                Pago em {formatarData(m.dataPagamento)} · {m.rotuloForma}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block font-semibold">{m.valorFormatado}</span>
                              <span
                                className={`text-xs font-semibold ${comAtraso ? 'text-ambar-700' : 'text-salvia-600'}`}
                              >
                                {comAtraso ? 'Com multa' : 'Pago'}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              ))}
            </div>
          );
        }}
      </ConteudoAssincrono>
    </div>
  );
}
