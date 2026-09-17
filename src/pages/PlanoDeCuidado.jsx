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
import { nivelDaArea, resumirAreasDoCuidado } from '../utils/planoDeCuidado';

const CORES_FAIXA = {
  BAIXO: { anel: 'text-acento', chip: 'bg-salvia-100 text-acento' },
  MODERADO: { anel: 'text-ambar-700', chip: 'bg-ambar-50 text-ambar-700' },
  ALTO: { anel: 'text-alerta-600', chip: 'bg-alerta-50 text-alerta-600' },
  MUITO_ALTO: { anel: 'text-alerta-700', chip: 'bg-alerta-50 text-alerta-700' },
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
        acao={<Button variante="secundario" tamanho="sm" icone={RefreshCw} onClick={recarregar} disabled={estado.carregando}>Recalcular</Button>}
      />
      {estado.carregando && !estado.dados ? (
        <Carregando texto="Calculando seu plano de cuidado..." />
      ) : estado.erro ? <MensagemErro mensagem={estado.erro.message} onTentarNovamente={recarregar} /> : <Conteudo dados={estado.dados} />}
    </div>
  );
}

function Conteudo({ dados }) {
  const cores = CORES_FAIXA[dados.faixa.id] ?? CORES_FAIXA.MODERADO;
  const areas = useMemo(() => resumirAreasDoCuidado(dados.fatores), [dados.fatores]);
  const fatoresVisiveis = dados.fatores.filter((f) => f.chave !== 'IDADE' && f.chave !== 'SEGMENTO');
  const maiores = fatoresVisiveis.filter((f) => f.pontos > 0);
  const neutros = fatoresVisiveis.filter((f) => f.pontos === 0);

  return (
    <div className="space-y-5">
      <section className="glass relative overflow-visible rounded-[2rem] p-6 lg:p-8">
        <LeafArt className="-right-10 -top-8 h-56 w-80" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
            <Medidor score={dados.score} dataCalculo={dados.dataCalculo} areas={areas} />
            <div className="min-w-0 max-w-xl text-center sm:text-left">
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${cores.chip}`}>Risco {dados.faixa.rotulo.toLowerCase()}</span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{dados.faixa.descricao}</h2>
              <p className="mt-1 text-salvia-600">{textoAtualizacao(dados.dataCalculo)}</p>
              <p className="mt-3 text-sm text-salvia-600">Indicador de acompanhamento da sua jornada de cuidado. Não é diagnóstico médico.</p>
            </div>
          </div>
          <Link to="/assistente" className="inline-flex shrink-0 items-center justify-center gap-2 self-center rounded-full bg-superficie/75 px-4 py-2 text-sm font-semibold text-acento ring-1 ring-borda transition hover:bg-superficie">
            Falar com assistente <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="recomendacoes">
        <h2 id="recomendacoes" className="mb-3 px-1 font-semibold">O que fazer agora</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dados.recomendacoes.slice(0, 4).map((r) => (
            <Link key={r.titulo} to={r.para} className="glass-strong group flex items-start gap-3 rounded-3xl p-4 transition hover:bg-superficie/90">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{r.titulo}</span>
                <span className="block text-sm text-salvia-600">{r.descricao}</span>
              </span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-salvia-100 text-acento transition group-hover:bg-petroleo-800 group-hover:text-white"><ArrowRight size={15} aria-hidden="true" /></span>
            </Link>
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
                <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${nivel.classe}`}>{nivel.rotulo}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Medidor({ score, dataCalculo }) {
  const [progressoAnimado, setProgressoAnimado] = useState(0);
  const centro = 60;
  const raio = 48;
  const inicio = 180;
  const abertura = 180;
  const gap = 3;

  useEffect(() => {
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = null;
    const duracao = reduzirMovimento ? 0 : 1000;
    const inicioAnimacao = performance.now();

    const animar = (agora) => {
      const progresso = duracao === 0 ? 1 : Math.min((agora - inicioAnimacao) / duracao, 1);
      const easing = 1 - Math.pow(1 - progresso, 3);
      setProgressoAnimado(easing);
      if (progresso < 1) frame = requestAnimationFrame(animar);
    };

    frame = requestAnimationFrame(animar);
    return () => { if (frame) cancelAnimationFrame(frame); };
  }, [score, dataCalculo]);

  const scoreLimitado = Math.max(0, Math.min(100, score));
  const scoreAnimado = Math.round(scoreLimitado * progressoAnimado);
  const nivelGeral = nivelDaArea(scoreAnimado);

  const ponto = (angulo, r = raio) => {
    const rad = (angulo * Math.PI) / 180;
    return [centro + r * Math.cos(rad), centro + r * Math.sin(rad)];
  };

  const arco = (anguloInicial, anguloFinal, r = raio) => {
    const [x1, y1] = ponto(anguloInicial, r);
    const [x2, y2] = ponto(anguloFinal, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  const niveis = [
    { inicio: 0, fim: 25, rotulo: 'Cuidado prioritário', cor: 'text-red-500' },
    { inicio: 25, fim: 50, rotulo: 'Cuidado ativo', cor: 'text-orange-500' },
    { inicio: 50, fim: 75, rotulo: 'Em evolução', cor: 'text-yellow-400' },
    { inicio: 75, fim: 100, rotulo: 'Equilíbrio', cor: 'text-green-500' },
  ];

  const segmentos = niveis.map((nivel, index) => {
    const anguloInicial = inicio + (nivel.inicio / 100) * abertura + (index === 0 ? 0 : gap / 2);
    const anguloFinal = inicio + (nivel.fim / 100) * abertura - (index === niveis.length - 1 ? 0 : gap / 2);
    const largura = Math.max(0, Math.min(scoreAnimado, nivel.fim) - nivel.inicio);
    const progressoSegmento = largura / (nivel.fim - nivel.inicio);
    const anguloPreenchido = anguloInicial + (anguloFinal - anguloInicial) * progressoSegmento;
    return { ...nivel, anguloInicial, anguloFinal, anguloPreenchido, progressoSegmento };
  });

  const coresVivas = [
    { trilho: 'text-red-500', brilho: 'drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]' },
    { trilho: 'text-orange-500', brilho: 'drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]' },
    { trilho: 'text-yellow-400', brilho: 'drop-shadow-[0_0_6px_rgba(250,204,21,0.55)]' },
    { trilho: 'text-green-500', brilho: 'drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]' },
  ];

  return (
    <div className="relative h-72 w-72 shrink-0" aria-label={`Score geral ${score} de 100. Medidor semicircular de saúde com quatro níveis.`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" strokeWidth="1" className="text-salvia-100/20" />

        {segmentos.map((segmentoAtual, index) => (
          <g key={segmentoAtual.inicio} className={`${coresVivas[index].trilho} ${coresVivas[index].brilho}`}>
            <path
              d={arco(segmentoAtual.anguloInicial, segmentoAtual.anguloFinal)}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.16"
            />
            {segmentoAtual.progressoSegmento > 0 && (
              <path
                d={arco(segmentoAtual.anguloInicial, segmentoAtual.anguloPreenchido)}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
              />
            )}
          </g>
        ))}

        {niveis.slice(1).map((nivel) => {
          const anguloMarcador = inicio + (nivel.inicio / 100) * abertura;
          const [x1, y1] = ponto(anguloMarcador, 53);
          const [x2, y2] = ponto(anguloMarcador, 58);
          return <line key={`marcador-${nivel.inicio}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5" className="text-salvia-300/80" />;
        })}

        <circle cx="60" cy="60" r="35" fill="currentColor" className="text-superficie" />
        <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth="1" className="text-salvia-100/30" />
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <div className="mt-5 text-center">
          <span className="block text-xs font-medium text-salvia-600">Seu score</span>
          <span className="mt-1 block text-[2.7rem] font-semibold leading-none tracking-tight text-petroleo-800">{scoreAnimado}</span>
          <span className="mt-1 block text-sm font-medium text-salvia-600">de 100</span>
          <span className={`mx-auto mt-3 block w-fit rounded-full px-3 py-1 text-xs font-semibold ${nivelGeral.chave === 'OTIMO' ? 'bg-salvia-100 text-acento' : nivelGeral.chave === 'PODE_MELHORAR' ? 'bg-ambar-50 text-ambar-700' : 'bg-alerta-50 text-alerta-600'}`}>
            {nivelGeral.rotulo}
          </span>
        </div>
      </div>

      <div className="absolute left-[-0.7rem] bottom-[12%] flex items-center gap-1 whitespace-nowrap">
        <span className="text-[0.67rem] font-semibold text-red-500">Cuidado prioritário</span>
        <span className="h-px w-4 bg-red-500" />
      </div>

      <div className="absolute left-[13%] top-[20%] flex items-center gap-1 whitespace-nowrap">
        <span className="h-px w-4 bg-orange-500" />
        <span className="text-[0.67rem] font-semibold text-orange-500">Cuidado ativo</span>
      </div>

      <div className="absolute right-[8%] top-[20%] flex items-center gap-1 whitespace-nowrap">
        <span className="text-[0.67rem] font-semibold text-yellow-400">Em evolução</span>
        <span className="h-px w-4 bg-yellow-400" />
      </div>

      <div className="absolute right-[-0.35rem] bottom-[12%] flex items-center gap-1 whitespace-nowrap">
        <span className="h-px w-4 bg-green-500" />
        <span className="text-[0.67rem] font-semibold text-green-500">Equilíbrio</span>
      </div>
    </div>
  );
}
