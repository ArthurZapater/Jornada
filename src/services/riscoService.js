// Módulo "risco": score de risco clínico — V1 HEURÍSTICA.
//
// Isto NÃO é inteligência artificial e NÃO é diagnóstico. É uma soma de pontos
// por regras fixas, escolhidas a partir dos perfis de cuidado do briefing da
// Unimed. Cada fator que pontuou volta junto com o score, para o resultado ser
// sempre explicável ao beneficiário e auditável.
//
// Evolução prevista: calcularScore() é o único ponto a trocar quando houver um
// modelo treinado; o histórico fica em scoresRisco para comparar versões.
import { getDb, porId, proximoId, salvar } from './mockDb';
import { ApiError, idLogado, simularRequisicao } from './http';
import { idade, toISODate } from '../utils/format';
import { CONDICOES_CRONICAS, PERFIL_VAZIO, rotuloDe, rotulosComOutra, rotulosDe } from '../utils/perfilSaude';

export const VERSAO_MODELO = 'V1-heuristica';

const FAIXAS = [
  { id: 'BAIXO', rotulo: 'Baixo', limite: 25, descricao: 'Siga com a rotina de prevenção.' },
  { id: 'MODERADO', rotulo: 'Moderado', limite: 50, descricao: 'Vale reforçar o acompanhamento.' },
  { id: 'ALTO', rotulo: 'Alto', limite: 75, descricao: 'Recomendamos atenção nas próximas semanas.' },
  { id: 'MUITO_ALTO', rotulo: 'Muito alto', limite: 101, descricao: 'Procure acompanhamento o quanto antes.' },
];

const PONTOS_IDADE = [
  { ate: 30, pontos: 0, rotulo: 'menos de 30 anos' },
  { ate: 45, pontos: 6, rotulo: '30 a 44 anos' },
  { ate: 60, pontos: 12, rotulo: '45 a 59 anos' },
  { ate: 200, pontos: 18, rotulo: '60 anos ou mais' },
];

const PONTOS_SEGMENTO = { JOVEM: 0, ADULTO: 6, IDOSO: 14, CRONICO: 22 };
const ROTULO_SEGMENTO = { JOVEM: 'Jovem', ADULTO: 'Adulto', IDOSO: 'Idoso', CRONICO: 'Condição crônica' };

const faixaDe = (score) => FAIXAS.find((f) => score < f.limite) ?? FAIXAS.at(-1);

function mesesAtras(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return toISODate(d);
}

/** Calcula, salva e devolve o score com todos os fatores considerados. */
export function calcularScore() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    const beneficiario = porId(db.beneficiarios, id);
    if (!beneficiario) throw new ApiError('Beneficiário não encontrado.', 404);

    const limite12m = mesesAtras(12);
    const limite6m = mesesAtras(6);
    const consultas = db.consultas.filter((c) => c.beneficiarioId === id);
    const exames = db.exames.filter((e) => e.beneficiarioId === id);
    const fatores = [];

    const anos = idade(beneficiario.dataNascimento);
    const faixaIdade = PONTOS_IDADE.find((f) => anos < f.ate);
    fatores.push({ chave: 'IDADE', rotulo: 'Faixa etária', detalhe: `${anos} anos (${faixaIdade.rotulo})`, pontos: faixaIdade.pontos });

    fatores.push({
      chave: 'SEGMENTO',
      rotulo: 'Perfil de cuidado',
      detalhe: ROTULO_SEGMENTO[beneficiario.segmento] ?? beneficiario.segmento,
      pontos: PONTOS_SEGMENTO[beneficiario.segmento] ?? 0,
    });

    const perfil = { ...PERFIL_VAZIO, ...(beneficiario.perfilSaude ?? {}) };
    const condicoes = rotulosDe('condicoes', perfil.condicoes.filter((c) => CONDICOES_CRONICAS.includes(c)));
    fatores.push({
      chave: 'CRONICA',
      rotulo: 'Condição crônica declarada',
      detalhe: condicoes.length
        ? condicoes.join(', ')
        : beneficiario.condicaoCronica ? 'Sim, informada no cadastro' : 'Não informada',
      pontos: beneficiario.condicaoCronica ? 14 : 0,
    });

    const alterados = exames.filter((exame) => {
      if ((exame.dataRealizacao ?? '') < limite12m) return false;
      return db.resultados.find((r) => r.exameId === exame.id)?.itens.some((item) => item.alterado);
    });
    fatores.push({
      chave: 'EXAMES',
      rotulo: 'Exames alterados (12 meses)',
      detalhe: alterados.length
        ? alterados.map((e) => porId(db.tiposExame, e.tipoExameId).nome).join(', ')
        : 'Nenhum valor fora da referência',
      pontos: Math.min(alterados.length * 8, 24),
    });

    const consultasRecentes = consultas.filter((c) => c.status === 'CONCLUIDA' && c.dataHora >= limite12m);
    fatores.push({
      chave: 'ACOMPANHAMENTO',
      rotulo: 'Acompanhamento médico',
      detalhe: consultasRecentes.length
        ? `${consultasRecentes.length} consulta(s) nos últimos 12 meses`
        : 'Sem consultas nos últimos 12 meses',
      pontos: consultasRecentes.length ? 0 : 12,
    });

    const pendentes = db.encaminhamentos.filter((e) => e.beneficiarioId === id && e.status !== 'CONCLUIDO');
    fatores.push({
      chave: 'ENCAMINHAMENTO',
      rotulo: 'Encaminhamentos em aberto',
      detalhe: pendentes.length
        ? pendentes.map((e) => porId(db.especialidades, e.especialidadeDestinoId).nome).join(', ')
        : 'Nenhum pendente',
      pontos: pendentes.length ? 8 : 0,
    });

    const canceladas = consultas.filter((c) => c.status === 'CANCELADA' && c.dataHora >= limite6m);
    fatores.push({
      chave: 'ADESAO',
      rotulo: 'Consultas canceladas (6 meses)',
      detalhe: canceladas.length ? `${canceladas.length} cancelamento(s)` : 'Nenhum cancelamento',
      pontos: Math.min(canceladas.length * 4, 8),
    });

    // Fatores do perfil de saúde: só pontuam com resposta. Sem resposta, aparecem
    // com 0 ponto e o convite para responder — não dá para presumir hábito.
    const pontosHabitos = { FUMANTE: 8, EX: 2 }[perfil.tabagismo] ?? 0;
    const pontosAtividade = perfil.atividadeFisica === 'SEDENTARIO' ? 5 : 0;
    const pontosSono = perfil.sono === 'POUCO' ? 3 : 0;
    const habitosRespondidos = [perfil.tabagismo, perfil.atividadeFisica, perfil.sono].filter(Boolean);
    fatores.push({
      chave: 'HABITOS',
      rotulo: 'Hábitos (perfil de saúde)',
      detalhe: habitosRespondidos.length
        ? [
            perfil.tabagismo && rotuloDe('tabagismo', perfil.tabagismo),
            perfil.atividadeFisica && `exercício: ${rotuloDe('atividadeFisica', perfil.atividadeFisica).toLowerCase()}`,
            perfil.sono && `sono: ${rotuloDe('sono', perfil.sono).toLowerCase()}`,
          ].filter(Boolean).join(' · ')
        : 'Não respondido no perfil de saúde',
      pontos: pontosHabitos + pontosAtividade + pontosSono,
    });

    const familia = rotulosComOutra('historicoFamiliar', perfil.historicoFamiliar, perfil.historicoFamiliarOutra);
    fatores.push({
      chave: 'FAMILIA',
      rotulo: 'Histórico familiar',
      detalhe: familia.length ? familia.join(', ') : 'Nenhum caso informado',
      pontos: Math.min(perfil.historicoFamiliar.length * 2, 6),
    });

    const scoreRisco = Math.min(100, fatores.reduce((soma, f) => soma + f.pontos, 0));
    const score = 100 - scoreRisco;
    const faixa = faixaDe(scoreRisco);
    const registro = {
      id: proximoId(db, 'scores'),
      beneficiarioId: id,
      score,
      faixa: faixa.id,
      versaoModelo: VERSAO_MODELO,
      fatoresConsiderados: fatores,
      dataCalculo: new Date().toISOString(),
    };
    db.scoresRisco.push(registro);
    salvar(db);

    return {
      score,
      faixa,
      versaoModelo: VERSAO_MODELO,
      dataCalculo: registro.dataCalculo,
      fatores: [...fatores].sort((a, b) => b.pontos - a.pontos),
      recomendacoes: montarRecomendacoes(fatores, beneficiario),
    };
  }, 450);
}

/** Cada recomendação nasce de um fator que pontuou — nenhuma é genérica. */
function montarRecomendacoes(fatores, beneficiario) {
  const ponto = (chave) => fatores.find((f) => f.chave === chave)?.pontos ?? 0;
  const recomendacoes = [];

  if (ponto('ACOMPANHAMENTO') > 0) {
    recomendacoes.push({
      titulo: 'Agende uma consulta de rotina',
      descricao: 'Você está há mais de 12 meses sem consulta concluída.',
      para: '/consultas/agendar?especialidade=1',
    });
  }
  if (ponto('EXAMES') > 0) {
    recomendacoes.push({
      titulo: 'Leve seus exames alterados ao médico',
      descricao: 'Há resultados fora da faixa de referência que merecem avaliação.',
      para: '/resultados',
    });
  }
  if (ponto('ENCAMINHAMENTO') > 0) {
    recomendacoes.push({
      titulo: 'Resolva seu encaminhamento em aberto',
      descricao: 'Marque a consulta com o especialista antes do fim da validade.',
      para: '/encaminhamentos',
    });
  }
  if (ponto('CRONICA') > 0 || beneficiario.segmento === 'CRONICO') {
    recomendacoes.push({
      titulo: 'Mantenha o acompanhamento contínuo',
      descricao: 'Condições crônicas pedem retornos regulares e exames de controle.',
      para: '/exames/agendar',
    });
  }
  const perfil = { ...PERFIL_VAZIO, ...(beneficiario.perfilSaude ?? {}) };
  if (perfil.tabagismo === 'FUMANTE') {
    recomendacoes.push({
      titulo: 'Converse sobre parar de fumar',
      descricao: 'O clínico geral pode indicar o acompanhamento que funciona melhor para você.',
      para: '/consultas/agendar?especialidade=1',
    });
  }
  if (perfil.atividadeFisica === 'SEDENTARIO') {
    recomendacoes.push({
      titulo: 'Coloque o corpo em movimento',
      descricao: 'Você contou que quase não se exercita. Antes de começar, um check-up ajuda a escolher o ritmo.',
      para: '/consultas/agendar?especialidade=1',
    });
  }
  if (ponto('FAMILIA') > 0 && ponto('ACOMPANHAMENTO') === 0) {
    recomendacoes.push({
      titulo: 'Conte ao médico o histórico da família',
      descricao: 'Algumas doenças pedem exames de rastreio mais cedo quando há casos próximos.',
      para: '/consultas',
    });
  }
  if (ponto('ADESAO') > 0) {
    recomendacoes.push({
      titulo: 'Evite novos cancelamentos',
      descricao: 'Remarcar em cima da hora costuma atrasar o cuidado em semanas.',
      para: '/consultas',
    });
  }
  if (!recomendacoes.length) {
    recomendacoes.push({
      titulo: 'Continue com a rotina de prevenção',
      descricao: 'Seus indicadores estão em dia. Mantenha o check-up anual.',
      para: '/exames/agendar',
    });
  }
  return recomendacoes;
}

export function obterUltimoScore() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    return db.scoresRisco.filter((s) => s.beneficiarioId === id).at(-1) ?? null;
  }, 150);
}
