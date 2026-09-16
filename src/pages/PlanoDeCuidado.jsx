import { ArrowRight, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Carregando, MensagemErro } from '../components/ui/Feedback';
import LeafArt from '../components/ui/LeafArt';
import PageHeader from '../components/ui/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { calcularScore } from '../services/riscoService';
import { formatarData, toISODate } from '../utils/format';
import { resumirAreasDoCuidado } from '../utils/planoDeCuidado';

const CORES_FAIXA = {
  BAIXO: { anel: 'text-acento', chip: 'bg-salvia-100 text-acento' },
  MODERADO: { anel: 'text-acento', chip: 'bg-nevoa-100 text-acento' },
  ALTO: { anel: 'text-ambar-700', chip: 'bg-ambar-50 text-ambar-700' },
  MUITO_ALTO: { anel: 'text-alerta-600', chip: 'bg-alerta-50 text-alerta-600' },
};

const PONTOS_MAXIMOS_FATOR = {
  SEGMENTO: 22,
  CRONICA: 14,
  EXAMES: 24,
  ACOMPANHAMENTO: 12,
  ENCAMINHAMENTO: 8,
  ADESAO: 8,
  HABITOS: 16,
  FAMILIA: 6,
};

const NIVEIS = {
  PRECISA_ATENCAO: { rotulo: 'Precisa de atenção', classe: 'bg-alerta-50 text-alerta-600' },
  PODE_MELHORAR: { rotulo: 'Pode melhorar', classe: 'bg-ambar-50 text-ambar-700' },
  OTIMO: { rotulo: 'Ótimo', classe: 'bg-salvia-100 text-acento' },
};

const DESCRICOES_AREA = {
  CRONICA: 'Condições crônicas já informadas no seu perfil.',
  EXAMES: 'Resultados de exames recentes com alteração.',
  ACOMPANHAMENTO: 'Frequência de consultas concluídas no último ano.',
  ENCAMINHAMENTO: 'Encaminhamentos que ainda estão em aberto.',
  ADESAO: 'Cancelamentos de consulta nos últimos 6 meses.',
  HABITOS: 'Hábitos de rotina respondidos no seu perfil.',
  FAMILIA: 'Histórico da família informado no cadastro.',
};

const COMENTARIOS_NIVEL = {
  PRECISA_ATENCAO: 'Precisa de atenção: priorize este ponto nas próximas semanas.',
  PODE_MELHORAR: 'Pode melhorar: ajustes graduais já ajudam no seu score.',
  OTIMO: 'Ótimo: sua rotina aqui está ajudando a manter um bom resultado.',
};

function nivelDoFator(fator) {
  if (fator.pontos <= 0) return { chave: 'OTIMO', ...NIVEIS.OTIMO };
  const maximo = PONTOS_MAXIMOS_FATOR[fator.chave] ?? 1;
  const proporcao = fator.pontos / maximo;
  if (proporcao >= 0.5) return { chave: 'PRECISA_ATENCAO', ...NIVEIS.PRECISA_ATENCAO };
  return { chave: 'PODE_MELHORAR', ...NIVEIS.PODE_MELHORAR };
}

function textoAtualizacao(dataCalculo) {
  return toISODate(dataCalculo) === toISODate(new Date())
    ? 'Atualizado hoje'
    : `Atualizado em ${formatarData(dataCalculo)}`;
}

export default function PlanoDeCuidado() {
  const [versao, setVersao] = useState(0);
  const estado = useAsync(() => calcularScore(), [versao]);
  const recarregar = () => setVersao((atual) => atual + 1);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Meu plano de cuidado"
        subtitulo="Acompanhe seu score e veja onde reforçar sua rotina de saúde."
        acao={
          <Button variante="secundario" tamanho="sm" icone={RefreshCw} onClick={recarregar} disabled={estado.carregando}>
            Recalcular
          </Button>
        }
      />
      {estado.carregando && !estado.dados ? (
        <Carregando texto="Calculando seu plano de cuidado..." />
      ) : estado.erro ? <MensagemErro mensagem={estado.erro.message} onTentarNovamente={recarregar} /> : <Conteudo dados={estado.dados} versao={versao} />}
    </div>
  );
}

function Conteudo({ dados, versao }) {
  const cores = CORES_FAIXA[dados.faixa.id];
  const areas = useMemo(() => resumirAreasDoCuidado(dados.fatores), [dados.fatores]);
  const fatoresVisiveis = dados.fatores.filter((f) => f.chave !== 'IDADE' && f.chave !== 'SEGMENTO');
  const maiores = fatoresVisiveis.filter((f) => f.pontos > 0);
  const neutros = fatoresVisiveis.filter((f) => f.pontos === 0);

  return (
    <div className="space-y-5">
      <section className="glass relative overflow-hidden rounded-[2rem] p-6 lg:p-8">
        <LeafArt className="-right-10 -top-8 h-56 w-80" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
            <Medidor key={`${dados.dataCalculo}-${versao}`} score={dados.score} cor={cores.anel} />
            <div className="min-w-0 text-center sm:text-left">
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${cores.chip}`}>
                Risco {dados.faixa.rotulo.toLowerCase()}
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{dados.faixa.descricao}</h2>
              <p className="mt-1 text-salvia-600">{textoAtualizacao(dados.dataCalculo)}</p>
              <p className="mt-3 text-sm text-salvia-600">Indicador de acompanhamento da sua jornada de cuidado. Não é diagnóstico médico.</p>
            </div>
          </div>
          <Link
            to="/assistente"
            className="inline-flex items-center justify-center gap-2 self-center rounded-full bg-superficie/75 px-4 py-2 text-sm font-semibold text-acento ring-1 ring-borda transition hover:bg-superficie"
          >
            Falar com assistente <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="recomendacoes">
        <h2 id="recomendacoes" className="mb-3 px-1 font-semibold">O que fazer agora</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dados.recomendacoes.slice(0, 4).map((r) => (
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

      <section aria-labelledby="areas-score">
        <h2 id="areas-score" className="mb-3 px-1 font-semibold">Áreas da jornada</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {areas.map((area) => (
            <article key={area.chave} className="glass-strong rounded-3xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{area.rotulo}</h3>
                  <p className="text-sm text-salvia-600">{area.descricao}</p>
                </div>
                <p className="text-right leading-tight">
                  <span className="block text-xl font-semibold">{area.score}</span>
                  <span className="text-xs text-salvia-600">de 100</span>
                </p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-salvia-100">
                <div className="h-full rounded-full bg-petroleo-800 transition-all" style={{ width: `${area.score}%` }} aria-hidden="true" />
              </div>
              <p className="mt-2 text-sm text-salvia-600">{area.status}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="fatores">
        <h2 id="fatores" className="mb-3 px-1 font-semibold">Detalhe das áreas</h2>
        <ul className="glass-strong divide-y divide-salvia-100 overflow-hidden rounded-3xl">
          {[...maiores, ...neutros].map((fator) => {
            const nivel = nivelDoFator(fator);
            return (
              <li key={fator.chave} className="flex items-center gap-4 px-4 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{fator.rotulo}</span>
                  <span className="mt-0.5 block text-sm text-salvia-600">{fator.detalhe}</span>
                  <ul className="mt-1 space-y-0.5 text-sm text-salvia-600">
                    <li>• O que é: {DESCRICOES_AREA[fator.chave] ?? 'Fator considerado no cálculo do score.'}</li>
                    <li>• Comentário: {COMENTARIOS_NIVEL[nivel.chave]}</li>
                  </ul>
                </span>
                <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${nivel.classe}`}>
                  {nivel.rotulo}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Medidor({ score, cor }) {
  const raio = 52;
  const circunferencia = 2 * Math.PI * raio;
  const [scoreAnimado, setScoreAnimado] = useState(0);

  useEffect(() => {
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = null;
    const duracao = reduzirMovimento ? 0 : 1000;
    const inicio = performance.now();

    const animar = (agora) => {
      const progresso = duracao === 0 ? 1 : Math.min((agora - inicio) / duracao, 1);
      const valor = Math.round(score * progresso);
      setScoreAnimado((anterior) => (anterior === valor ? anterior : valor));
      if (progresso < 1) frame = requestAnimationFrame(animar);
    };
    frame = requestAnimationFrame(animar);

    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [score]);

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
          strokeDashoffset={circunferencia * (1 - scoreAnimado / 100)}
          className={cor}
        />
      </svg>
      <p className="relative text-center">
        <span className="block text-4xl font-semibold leading-none">{scoreAnimado}</span>
        <span className="text-xs text-salvia-600">de 100</span>
      </p>
    </div>
  );
}
