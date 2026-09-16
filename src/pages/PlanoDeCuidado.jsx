import { ArrowRight, Info, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Carregando, MensagemErro } from '../components/ui/Feedback';
import LeafArt from '../components/ui/LeafArt';
import PageHeader from '../components/ui/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { calcularScore } from '../services/riscoService';
import { formatarData } from '../utils/format';

const CORES_FAIXA = {
  BAIXO: { anel: 'text-acento', chip: 'bg-salvia-100 text-acento' },
  MODERADO: { anel: 'text-acento', chip: 'bg-nevoa-100 text-acento' },
  ALTO: { anel: 'text-ambar-700', chip: 'bg-ambar-50 text-ambar-700' },
  MUITO_ALTO: { anel: 'text-alerta-600', chip: 'bg-alerta-50 text-alerta-600' },
};

export default function PlanoDeCuidado() {
  const estado = useAsync(calcularScore, []);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Meu plano de cuidado"
        subtitulo="O que mais pesa na sua saúde hoje e o que fazer em seguida."
        acao={
          <Button variante="secundario" tamanho="sm" icone={RefreshCw} onClick={estado.recarregar}>
            Recalcular
          </Button>
        }
      />
      {estado.carregando && !estado.dados ? (
        <Carregando texto="Calculando seu plano de cuidado..." />
      ) : estado.erro ? (
        <MensagemErro mensagem={estado.erro.message} onTentarNovamente={estado.recarregar} />
      ) : (
        <Conteudo dados={estado.dados} />
      )}
    </div>
  );
}

function Conteudo({ dados }) {
  const cores = CORES_FAIXA[dados.faixa.id];
  const maiores = dados.fatores.filter((f) => f.pontos > 0);
  const neutros = dados.fatores.filter((f) => f.pontos === 0);

  return (
    <div className="space-y-5">
      <section className="glass relative overflow-hidden rounded-[2rem] p-6 lg:p-8">
        <LeafArt className="-right-10 -top-8 h-56 w-80" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Medidor score={dados.score} cor={cores.anel} />
          <div className="min-w-0 text-center sm:text-left">
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${cores.chip}`}>
              Risco {dados.faixa.rotulo.toLowerCase()}
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{dados.faixa.descricao}</h2>
            <p className="mt-1 text-salvia-600">
              Calculado em {formatarData(dados.dataCalculo)} · modelo {dados.versaoModelo}
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-3xl bg-superficie/55 p-4 ring-1 ring-borda/70">
        <Info size={20} className="mt-0.5 shrink-0 text-acento" aria-hidden="true" />
        <p className="text-sm">
          <span className="font-medium">Como este número é calculado</span>
          <span className="block text-salvia-600">
            Aqui, quanto maior o score, mais saudável é o cenário atual.
            {' '}
            Uma soma de pontos por regras fixas (idade, perfil de cuidado, exames alterados, acompanhamento e adesão) —
            não é inteligência artificial nem diagnóstico. Todos os fatores estão listados abaixo, e nenhum resultado
            substitui a avaliação de um profissional de saúde.
          </span>
        </p>
      </div>

      <section aria-labelledby="fatores">
        <h2 id="fatores" className="mb-3 px-1 font-semibold">O que pesou no seu score</h2>
        <ul className="glass-strong divide-y divide-salvia-100 overflow-hidden rounded-3xl">
          {[...maiores, ...neutros].map((fator) => (
            <li key={fator.chave} className="flex items-center gap-4 px-4 py-3.5">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{fator.rotulo}</span>
                <span className="block text-sm text-salvia-600">{fator.detalhe}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                  fator.pontos > 0 ? 'bg-ambar-50 text-ambar-700' : 'bg-salvia-100 text-acento'
                }`}
              >
                {fator.pontos > 0 ? `+${fator.pontos}` : '0'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="recomendacoes">
        <h2 id="recomendacoes" className="mb-3 px-1 font-semibold">Próximos passos sugeridos</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dados.recomendacoes.map((r) => (
            <Link
              key={r.titulo}
              to={r.para}
              className="glass-strong group flex items-start gap-3 rounded-3xl p-4 transition hover:bg-superficie/90"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{r.titulo}</span>
                <span className="block text-sm text-salvia-600">{r.descricao}</span>
              </span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-salvia-100 text-acento transition group-hover:bg-petroleo-800 group-hover:text-white">
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Medidor({ score, cor }) {
  const raio = 52;
  const circunferencia = 2 * Math.PI * raio;
  return (
    <div className="relative grid h-36 w-36 shrink-0 place-items-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={raio} fill="none" stroke="currentColor" strokeWidth="10" className="text-white/70" />
        <circle
          cx="60"
          cy="60"
          r={raio}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - score / 100)}
          className={cor}
        />
      </svg>
      <p className="relative text-center">
        <span className="block text-4xl font-semibold leading-none">{score}</span>
        <span className="block text-[0.625rem] font-medium uppercase tracking-[0.12em] text-salvia-600">Saúde</span>
        <span className="text-xs text-salvia-600">de 100</span>
      </p>
    </div>
  );
}
