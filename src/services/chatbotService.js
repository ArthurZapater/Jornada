// Módulo "chatbot": assistente por REGRAS (FAQ estruturado). Não usa LLM.
//
// Cada intenção casa por palavras-chave e responde com os dados reais do
// beneficiário (próxima consulta, resultados, mensalidade), o que torna a
// resposta contextual sem precisar de modelo de linguagem.
//
// Limite deliberado: o assistente NÃO dá orientação clínica. Pergunta sobre
// sintoma, remédio ou diagnóstico é redirecionada para consulta — e sinal de
// urgência é redirecionado para o serviço de emergência.
import { getDb, porId, proximoId, salvar } from './mockDb';
import { idLogado, simularRequisicao } from './http';
import { agoraLocalISO, formatarData, formatarHora, formatarMoeda, normalizar, primeiroNome } from '../utils/format';

const SUGESTOES_PADRAO = ['Minha próxima consulta', 'Documentos para a consulta', 'Meus resultados', 'Minha mensalidade'];

function montarContexto(db, id) {
  const agora = agoraLocalISO();
  const proximaConsulta = db.consultas
    .filter((c) => c.beneficiarioId === id && ['AGENDADA', 'CONFIRMADA'].includes(c.status) && c.dataHora >= agora)
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora))[0];
  const exames = db.exames.filter((e) => e.beneficiarioId === id);
  return {
    beneficiario: porId(db.beneficiarios, id),
    proximaConsulta: proximaConsulta && {
      ...proximaConsulta,
      medico: porId(db.medicos, proximaConsulta.medicoId),
      unidade: porId(db.unidades, proximaConsulta.unidadeId),
      especialidade: porId(db.especialidades, porId(db.medicos, proximaConsulta.medicoId).especialidadeId),
    },
    exameAgendado: exames
      .filter((e) => e.dataAgendada && e.dataAgendada >= agora)
      .map((e) => ({ ...e, tipo: porId(db.tiposExame, e.tipoExameId), unidade: porId(db.unidades, e.unidadeId) }))[0],
    resultadosDisponiveis: exames
      .filter((e) => e.status === 'DISPONIVEL')
      .map((e) => porId(db.tiposExame, e.tipoExameId).nome),
    encaminhamentosAtivos: db.encaminhamentos
      .filter((e) => e.beneficiarioId === id && e.status !== 'CONCLUIDO')
      .map((e) => ({ especialidade: porId(db.especialidades, e.especialidadeDestinoId).nome, validade: e.validade })),
    mensalidadeAberta: db.mensalidades.find((m) => m.beneficiarioId === id && m.status === 'EM_ABERTO'),
  };
}

// A ordem importa: urgência e assunto clínico são avaliados antes de tudo.
const INTENCOES = [
  {
    id: 'emergencia',
    palavras: ['emergencia', 'urgencia', 'socorro', 'dor no peito', 'falta de ar', 'passando mal', 'desmaio', 'sangramento'],
    responder: () => ({
      texto: 'Se for uma emergência, não espere por aqui. Ligue 192 (SAMU) ou procure o pronto-socorro mais próximo agora.',
      itens: ['SAMU — 192', 'Bombeiros — 193', 'Hospital São Lucas: pronto-socorro 24h, Av. Brasil, 1500'],
      link: { rotulo: 'Ver hospitais próximos', para: '/rede?filtro=HOSPITAIS' },
      sugestoes: ['Minha próxima consulta'],
    }),
  },
  {
    id: 'clinico',
    palavras: ['sintoma', 'remedio', 'medicamento', 'posso tomar', 'diagnostico', 'dor de', 'febre', 'tratamento', 'o que eu tenho'],
    responder: () => ({
      texto: 'Não posso dar orientação médica — isso é conversa para um profissional de saúde. Posso marcar uma consulta para você agora.',
      link: { rotulo: 'Agendar consulta', para: '/consultas/agendar' },
      sugestoes: ['Agendar consulta', 'Rede credenciada'],
    }),
  },
  {
    id: 'saudacao',
    palavras: ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem'],
    responder: (ctx) => ({
      texto: `Olá, ${primeiroNome(ctx.beneficiario.nome)}! Como posso ajudar hoje?`,
    }),
  },
  {
    id: 'proxima_consulta',
    palavras: ['proxima consulta', 'minha consulta', 'quando', 'consulta marcada', 'horario da consulta', 'que horas'],
    responder: (ctx) =>
      ctx.proximaConsulta
        ? {
            texto: `Sua próxima consulta é de ${ctx.proximaConsulta.especialidade.nome} com ${ctx.proximaConsulta.medico.nome}.`,
            itens: [
              `${formatarData(ctx.proximaConsulta.dataHora)} às ${formatarHora(ctx.proximaConsulta.dataHora)}`,
              `${ctx.proximaConsulta.unidade.nome} — ${ctx.proximaConsulta.unidade.endereco}`,
              'Chegue com 15 minutos de antecedência.',
            ],
            link: { rotulo: 'Ver minhas consultas', para: '/consultas' },
            sugestoes: ['Documentos para a consulta', 'Como cancelar'],
          }
        : {
            texto: 'Você não tem consulta agendada no momento. Quer marcar uma?',
            link: { rotulo: 'Agendar consulta', para: '/consultas/agendar' },
          },
  },
  {
    id: 'documentos',
    palavras: ['documento', 'levar', 'preciso de que', 'rg', 'carteirinha na consulta'],
    responder: () => ({
      texto: 'Para ser atendido, leve:',
      itens: ['Documento de identidade com foto', 'Cartão SUS ou CPF', 'Carteirinha do plano (está no seu perfil)', 'Comprovante de endereço, se for a primeira vez'],
      sugestoes: ['Ver minha carteirinha', 'Minha próxima consulta'],
    }),
  },
  {
    id: 'agendar',
    palavras: ['agendar', 'marcar', 'remarcar', 'nova consulta', 'novo exame'],
    responder: () => ({
      texto: 'Dá para agendar em poucos passos: escolha a especialidade, o profissional, a unidade e o horário.',
      link: { rotulo: 'Agendar consulta', para: '/consultas/agendar' },
      sugestoes: ['Agendar exame', 'Rede credenciada'],
    }),
  },
];

// Intenções ligadas aos serviços — respondem com os dados reais do beneficiário.
const INTENCOES_SERVICOS = [
  {
    id: 'resultados',
    palavras: ['resultado', 'laudo', 'exame ficou pronto', 'saiu o exame'],
    responder: (ctx) =>
      ctx.resultadosDisponiveis.length
        ? {
            texto: `Você tem ${ctx.resultadosDisponiveis.length} resultado(s) disponível(is):`,
            itens: ctx.resultadosDisponiveis,
            link: { rotulo: 'Ver resultados', para: '/resultados' },
          }
        : {
            texto: 'Nenhum resultado liberado até agora. Assim que sair, você recebe uma notificação.',
            link: { rotulo: 'Ver meus exames', para: '/resultados' },
          },
  },
  {
    id: 'preparo',
    palavras: ['jejum', 'preparo', 'preparar', 'posso comer'],
    responder: (ctx) =>
      ctx.exameAgendado
        ? {
            texto: `Para o seu ${ctx.exameAgendado.tipo.nome}, em ${formatarData(ctx.exameAgendado.dataAgendada)}:`,
            itens: [ctx.exameAgendado.tipo.preparo, `Local: ${ctx.exameAgendado.unidade.nome}`],
            link: { rotulo: 'Ver meus exames', para: '/exames' },
          }
        : {
            texto: 'Você não tem exame agendado. O preparo aparece aqui assim que marcar — cada exame tem o seu.',
            link: { rotulo: 'Agendar exame', para: '/exames/agendar' },
          },
  },
  {
    id: 'encaminhamento',
    palavras: ['encaminhamento', 'especialista', 'guia', 'autorizacao'],
    responder: (ctx) =>
      ctx.encaminhamentosAtivos.length
        ? {
            texto: 'Seus encaminhamentos em aberto:',
            itens: ctx.encaminhamentosAtivos.map((e) => `${e.especialidade} — válido até ${formatarData(e.validade)}`),
            link: { rotulo: 'Ver encaminhamentos', para: '/encaminhamentos' },
          }
        : { texto: 'Você não tem encaminhamentos em aberto.', link: { rotulo: 'Ver histórico', para: '/encaminhamentos' } },
  },
  {
    id: 'pagamento',
    palavras: ['boleto', 'pagar', 'mensalidade', 'segunda via', 'pix', 'fatura', 'vencimento', 'quanto pago'],
    responder: (ctx) =>
      ctx.mensalidadeAberta
        ? {
            texto: `Sua mensalidade em aberto é de ${formatarMoeda(ctx.mensalidadeAberta.valor)}, com vencimento em ${formatarData(ctx.mensalidadeAberta.vencimento)}.`,
            itens: ['Pix e cartão são confirmados na hora', 'O boleto leva até 2 dias úteis para compensar'],
            link: { rotulo: 'Pagar agora', para: '/pagamento' },
            sugestoes: ['Histórico de pagamentos'],
          }
        : {
            texto: 'Está tudo pago por aqui. Nenhuma mensalidade em aberto.',
            link: { rotulo: 'Ver histórico', para: '/pagamento/historico' },
          },
  },
  {
    id: 'historico_pagamento',
    palavras: ['historico de pagamento', 'ja paguei', 'comprovante', 'quanto paguei'],
    responder: () => ({
      texto: 'Seu histórico traz todas as mensalidades pagas, com data e forma de pagamento.',
      link: { rotulo: 'Ver histórico', para: '/pagamento/historico' },
    }),
  },
  {
    id: 'carteirinha',
    palavras: ['carteirinha', 'numero do plano', 'meu plano', 'meus dados'],
    responder: (ctx) => ({
      texto: `Seu plano é o ${ctx.beneficiario.plano}, como ${ctx.beneficiario.titularidade.toLowerCase()}.`,
      itens: [`Carteirinha: ${ctx.beneficiario.carteirinha}`],
      link: { rotulo: 'Ver carteirinha', para: '/perfil' },
    }),
  },
  {
    id: 'rede',
    palavras: ['hospital', 'clinica', 'onde', 'perto de mim', 'credenciado', 'laboratorio', 'endereco'],
    responder: () => ({
      texto: 'Na rede credenciada você filtra por médicos, clínicas e hospitais, com a distância de cada um.',
      link: { rotulo: 'Ver rede credenciada', para: '/rede' },
    }),
  },
  {
    id: 'cancelar',
    palavras: ['cancelar', 'desmarcar', 'nao vou poder ir'],
    responder: () => ({
      texto: 'Para cancelar, abra Consultas, escolha a consulta e toque em "Cancelar consulta". Sem custo até 24h antes.',
      link: { rotulo: 'Minhas consultas', para: '/consultas' },
    }),
  },
  {
    id: 'risco',
    palavras: ['plano de cuidado', 'score', 'risco', 'minha saude esta'],
    responder: () => ({
      texto: 'Seu plano de cuidado mostra os fatores que mais pesam hoje e o que fazer em seguida. É um cálculo por regras, não um diagnóstico.',
      link: { rotulo: 'Ver plano de cuidado', para: '/plano-de-cuidado' },
    }),
  },
  {
    id: 'ajuda',
    palavras: ['ajuda', 'o que voce faz', 'menu', 'opcoes'],
    responder: () => ({
      texto: 'Posso ajudar com:',
      itens: ['Consultas e exames: agendar, consultar e cancelar', 'Resultados e laudos', 'Encaminhamentos', 'Mensalidade e histórico de pagamentos', 'Rede credenciada'],
    }),
  },
];

const BASE_DE_REGRAS = [...INTENCOES, ...INTENCOES_SERVICOS];

const RESPOSTA_PADRAO = {
  texto: 'Ainda não sei responder isso. Posso ajudar com um destes assuntos:',
  itens: ['Consultas e exames', 'Resultados', 'Encaminhamentos', 'Mensalidade', 'Rede credenciada'],
};

function responderPergunta(texto, ctx) {
  const normalizada = normalizar(texto);
  const intencao = BASE_DE_REGRAS.find((i) => i.palavras.some((palavra) => normalizada.includes(palavra)));
  const resposta = intencao ? intencao.responder(ctx) : RESPOSTA_PADRAO;
  return {
    intencao: intencao?.id ?? 'nao_entendida',
    texto: resposta.texto,
    itens: resposta.itens ?? [],
    link: resposta.link ?? null,
    sugestoes: resposta.sugestoes ?? SUGESTOES_PADRAO,
  };
}

export function saudacaoInicial() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const beneficiario = porId(db.beneficiarios, idLogado());
    return {
      texto: `Olá, ${primeiroNome(beneficiario.nome)}! Sou o assistente da Jornada. Tire suas dúvidas sobre consultas, exames e seu plano.`,
      itens: [],
      link: null,
      sugestoes: SUGESTOES_PADRAO,
    };
  }, 200);
}

export function listarHistorico() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    return db.interacoesChatbot.filter((i) => i.beneficiarioId === id).slice(-20);
  }, 150);
}

export function enviarPergunta(texto) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    const resposta = responderPergunta(texto, montarContexto(db, id));
    const interacao = {
      id: proximoId(db, 'interacoes'),
      beneficiarioId: id,
      pergunta: texto.trim(),
      resposta,
      dataHora: new Date().toISOString(),
    };
    db.interacoesChatbot.push(interacao);
    salvar(db);
    return interacao;
  }, 500);
}
