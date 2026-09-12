// Módulo "chatbot": assistente por REGRAS (FAQ estruturado). Não usa LLM.
//
// Cada intenção casa por palavras-chave e responde com os dados reais do
// beneficiário (próxima consulta, resultados, mensalidade, unidade mais perto),
// o que torna a resposta contextual sem precisar de modelo de linguagem.
//
// Limite deliberado: o assistente NÃO dá orientação clínica. Pergunta sobre
// sintoma, remédio ou diagnóstico é redirecionada para consulta — e sinal de
// urgência é redirecionado para o serviço de emergência.
//
// Segundo limite: quando a resposta depende do contrato (carência, reembolso,
// cobertura), o assistente diz que não sabe e oferece um atendente, em vez de
// inventar regra de plano.
import { LOCALIZACAO_USUARIO, getDb, porId, proximoId, salvar } from './mockDb';
import { idLogado, simularRequisicao } from './http';
import { distanciaKm } from '../utils/geo';
import {
  agoraLocalISO,
  diasEntre,
  formatarData,
  formatarDistancia,
  formatarHora,
  formatarMoeda,
  normalizar,
  primeiroNome,
} from '../utils/format';

function maisProxima(unidades, origem = LOCALIZACAO_USUARIO) {
  return [...unidades].sort((a, b) => distanciaKm(origem, a) - distanciaKm(origem, b))[0];
}

function montarContexto(db, id) {
  const agora = agoraLocalISO();
  const doUsuario = (lista) => lista.filter((item) => item.beneficiarioId === id);

  const consultas = doUsuario(db.consultas);
  const proximaConsulta = consultas
    .filter((c) => ['AGENDADA', 'CONFIRMADA'].includes(c.status) && c.dataHora >= agora)
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora))[0];
  const exames = doUsuario(db.exames);
  const idsDeExame = new Set(exames.map((e) => e.id));
  const resultados = (db.resultados ?? []).filter((r) => idsDeExame.has(r.exameId));

  const detalharConsulta = (c) => {
    const medico = porId(db.medicos, c.medicoId);
    return {
      ...c,
      medico,
      unidade: porId(db.unidades, c.unidadeId),
      especialidade: porId(db.especialidades, medico.especialidadeId),
      emDias: diasEntre(agora, c.dataHora),
    };
  };

  return {
    beneficiario: porId(db.beneficiarios, id),
    proximaConsulta: proximaConsulta && detalharConsulta(proximaConsulta),
    ultimaConsulta: consultas
      .filter((c) => c.status === 'CONCLUIDA')
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
      .map(detalharConsulta)[0],
    totalConsultas: consultas.filter((c) => c.status !== 'CANCELADA').length,
    exameAgendado: exames
      .filter((e) => e.dataAgendada && e.dataAgendada >= agora)
      .map((e) => ({ ...e, tipo: porId(db.tiposExame, e.tipoExameId), unidade: porId(db.unidades, e.unidadeId) }))[0],
    examesAguardando: exames.filter((e) => e.status === 'AGUARDANDO').length,
    resultadosDisponiveis: exames
      .filter((e) => e.status === 'DISPONIVEL')
      .map((e) => porId(db.tiposExame, e.tipoExameId).nome),
    valoresAlterados: resultados.reduce((total, r) => total + (r.itens ?? []).filter((i) => i.alterado).length, 0),
    encaminhamentosAtivos: doUsuario(db.encaminhamentos)
      .filter((e) => e.status !== 'CONCLUIDO')
      .map((e) => ({ especialidade: porId(db.especialidades, e.especialidadeDestinoId).nome, validade: e.validade })),
    mensalidadeAberta: db.mensalidades.find((m) => m.beneficiarioId === id && m.status === 'EM_ABERTO'),
    mensalidadesPagas: db.mensalidades.filter((m) => m.beneficiarioId === id && m.status === 'PAGO').length,
    hospitalMaisProximo: maisProxima(db.unidades.filter((u) => u.tipo === 'HOSPITAL')),
    unidadeMaisProxima: maisProxima(db.unidades),
  };
}

const comDistancia = (unidade) =>
  `${unidade.nome} — ${unidade.endereco}, ${unidade.cidade}/${unidade.uf} (${formatarDistancia(distanciaKm(LOCALIZACAO_USUARIO, unidade))})`;

// --- Regras -----------------------------------------------------------------
//
// Emergência e assunto clínico são avaliados antes de todo o resto: qualquer
// palavra deles basta para vencer. Nas demais, ganha a intenção com mais texto
// casado, então "quando sai meu resultado" vai para resultados (9 letras) e não
// para consultas por causa do "quando" (6).

const PRIORITARIAS = [
  {
    id: 'emergencia',
    palavras: ['emergencia', 'urgencia', 'socorro', 'dor no peito', 'falta de ar', 'passando mal', 'desmaio', 'sangramento', 'convulsao', 'avc', 'infarto'],
    responder: (ctx) => ({
      texto: 'Se for uma emergência, não espere por aqui. Ligue 192 (SAMU) ou vá ao pronto-socorro mais próximo agora.',
      itens: ['SAMU — 192', 'Bombeiros — 193', `Mais perto de você: ${comDistancia(ctx.hospitalMaisProximo)}`],
      link: { rotulo: 'Ver hospitais no mapa', para: '/rede?filtro=HOSPITAIS' },
      sugestoes: ['Minha próxima consulta'],
    }),
  },
  {
    id: 'clinico',
    palavras: ['sintoma', 'remedio', 'medicamento', 'posso tomar', 'diagnostico', 'dor de', 'febre', 'tratamento', 'o que eu tenho', 'e grave', 'estou com', 'meu resultado significa', 'esse valor'],
    responder: () => ({
      texto: 'Não posso dar orientação médica — isso é conversa para um profissional de saúde. Posso marcar uma consulta para você agora.',
      link: { rotulo: 'Agendar consulta', para: '/consultas/agendar' },
      sugestoes: ['Agendar consulta', 'Rede credenciada'],
    }),
  },
];

const INTENCOES = [
  {
    id: 'saudacao',
    palavras: ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem'],
    responder: (ctx) => ({ texto: `Olá, ${primeiroNome(ctx.beneficiario.nome)}! Como posso ajudar hoje?` }),
  },
  {
    id: 'proxima_consulta',
    palavras: ['proxima consulta', 'minha consulta', 'quando', 'consulta marcada', 'horario da consulta', 'que horas', 'tenho consulta'],
    responder: (ctx) =>
      ctx.proximaConsulta
        ? {
            texto: `Sua próxima consulta é de ${ctx.proximaConsulta.especialidade.nome} com ${ctx.proximaConsulta.medico.nome}${
              ctx.proximaConsulta.emDias === 0 ? ', hoje' : ctx.proximaConsulta.emDias === 1 ? ', amanhã' : `, daqui a ${ctx.proximaConsulta.emDias} dias`
            }.`,
            itens: [
              `${formatarData(ctx.proximaConsulta.dataHora)} às ${formatarHora(ctx.proximaConsulta.dataHora)}`,
              `${ctx.proximaConsulta.unidade.nome} — ${ctx.proximaConsulta.unidade.endereco}, ${ctx.proximaConsulta.unidade.cidade}/${ctx.proximaConsulta.unidade.uf}`,
              'Chegue com 15 minutos de antecedência.',
            ],
            link: { rotulo: 'Ver minhas consultas', para: '/consultas' },
            sugestoes: ['Documentos para a consulta', 'Como cancelar', 'Se eu me atrasar?'],
          }
        : {
            texto: 'Você não tem consulta agendada no momento. Quer marcar uma?',
            link: { rotulo: 'Agendar consulta', para: '/consultas/agendar' },
          },
  },
  {
    id: 'historico_consultas',
    palavras: ['consultas anteriores', 'ultima consulta', 'ja fui', 'historico de consulta', 'quantas consultas'],
    responder: (ctx) =>
      ctx.ultimaConsulta
        ? {
            texto: `Sua última consulta foi de ${ctx.ultimaConsulta.especialidade.nome}, em ${formatarData(ctx.ultimaConsulta.dataHora)}, com ${ctx.ultimaConsulta.medico.nome}.`,
            itens: [`Você tem ${ctx.totalConsultas} consulta(s) no histórico.`],
            link: { rotulo: 'Ver histórico', para: '/consultas' },
          }
        : { texto: 'Ainda não há consultas concluídas no seu histórico.', link: { rotulo: 'Agendar a primeira', para: '/consultas/agendar' } },
  },
  {
    id: 'documentos',
    palavras: ['documento', 'levar', 'preciso de que', 'rg', 'carteirinha na consulta', 'o que levar'],
    responder: () => ({
      texto: 'Para ser atendido, leve:',
      itens: ['Documento de identidade com foto', 'Cartão SUS ou CPF', 'Carteirinha do plano (está no seu perfil)', 'Pedido médico, no caso de exame'],
      sugestoes: ['Ver minha carteirinha', 'Minha próxima consulta'],
    }),
  },
  {
    id: 'agendar',
    palavras: ['agend', 'marcar', 'remarc', 'nova consulta', 'novo exame'],
    responder: () => ({
      texto: 'Dá para agendar em poucos passos: escolha a especialidade, o profissional, a unidade e o horário.',
      link: { rotulo: 'Agendar consulta', para: '/consultas/agendar' },
      sugestoes: ['Agendar exame', 'Rede credenciada'],
    }),
  },
  {
    id: 'cancelar',
    palavras: ['cancel', 'desmarc', 'nao vou poder ir', 'desistir'],
    responder: () => ({
      texto: 'Para cancelar, abra Consultas, escolha a consulta e toque em "Cancelar consulta". Sem custo até 24h antes.',
      link: { rotulo: 'Minhas consultas', para: '/consultas' },
      sugestoes: ['Se eu me atrasar?'],
    }),
  },
  {
    id: 'atraso',
    palavras: ['atras', 'chegar tarde', 'perdi a consulta', 'faltei', 'nao fui'],
    responder: () => ({
      texto: 'Atraso de mais de 15 minutos costuma exigir remarcação, porque a agenda é por horário. Se já sabe que não vai dar, cancele antes — assim a vaga fica livre para outra pessoa e você não paga nada.',
      link: { rotulo: 'Minhas consultas', para: '/consultas' },
      sugestoes: ['Agendar consulta'],
    }),
  },
  {
    id: 'telemedicina',
    palavras: ['telemedicina', 'teleconsulta', 'consulta online', 'por video', 'a distancia', 'chamada de video'],
    responder: () => ({
      texto: 'Nesta versão do app o agendamento é só presencial — ainda não dá para escolher atendimento por vídeo. Um atendente consegue te dizer o que a sua operadora oferece hoje.',
      whatsapp: true,
      link: { rotulo: 'Agendar presencial', para: '/consultas/agendar' },
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
            sugestoes: ['Tenho exame marcado?', 'Agendar consulta'],
          }
        : {
            texto: 'Nenhum resultado liberado até agora. Assim que sair, você recebe uma notificação.',
            link: { rotulo: 'Ver meus exames', para: '/resultados' },
          },
  },
  {
    id: 'exame_agendado',
    palavras: ['exame marcado', 'tenho exame', 'proximo exame', 'meus exames', 'exame agendado'],
    responder: (ctx) =>
      ctx.exameAgendado
        ? {
            texto: `Seu próximo exame é ${ctx.exameAgendado.tipo.nome}, em ${formatarData(ctx.exameAgendado.dataAgendada)} às ${formatarHora(ctx.exameAgendado.dataAgendada)}.`,
            itens: [`${ctx.exameAgendado.unidade.nome} — ${ctx.exameAgendado.unidade.endereco}`, ctx.exameAgendado.tipo.preparo],
            link: { rotulo: 'Ver meus exames', para: '/exames' },
            sugestoes: ['Preciso de jejum?', 'Meus resultados'],
          }
        : {
            texto: ctx.examesAguardando
              ? `Você não tem exame com data marcada, mas tem ${ctx.examesAguardando} em andamento.`
              : 'Você não tem exame agendado no momento.',
            link: { rotulo: 'Agendar exame', para: '/exames/agendar' },
          },
  },
  {
    id: 'preparo',
    palavras: ['jejum', 'preparo', 'preparar', 'posso comer', 'posso beber'],
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
];

const INTENCOES_PLANO = [
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
            texto: `Está tudo pago por aqui — nenhuma mensalidade em aberto. Você já tem ${ctx.mensalidadesPagas} pagamento(s) registrado(s).`,
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
    palavras: ['carteirinha', 'numero do plano', 'meu plano', 'meus dados', 'cartao do plano'],
    responder: (ctx) => ({
      texto: `Seu plano é o ${ctx.beneficiario.plano}, como ${ctx.beneficiario.titularidade.toLowerCase()}.`,
      itens: [
        `Carteirinha: ${ctx.beneficiario.carteirinha}`,
        'No perfil, toque no cartão para abrir em tela cheia — ele deita sozinho para você mostrar no balcão.',
        'O verso traz registro ANS, acomodação, abrangência e o código de barras.',
      ],
      link: { rotulo: 'Ver carteirinha', para: '/perfil' },
      sugestoes: ['O que meu plano cobre?'],
    }),
  },
  {
    id: 'cobertura',
    palavras: ['cobertura', 'cobre', 'acomodacao', 'abrangencia', 'enfermaria', 'apartamento', 'tenho direito'],
    responder: () => ({
      texto: 'Acomodação, abrangência e segmentação do seu plano estão no verso da carteirinha, no perfil. O que está coberto em cada caso depende do contrato — um atendente confirma para você.',
      link: { rotulo: 'Ver carteirinha', para: '/perfil' },
      whatsapp: true,
    }),
  },
  {
    id: 'carencia',
    palavras: ['carencia', 'quanto tempo para usar', 'prazo para usar', 'ja posso usar'],
    responder: () => ({
      texto: 'Prazo de carência vem do seu contrato e muda conforme o procedimento e a data de adesão — não tenho essa informação aqui e prefiro não chutar. Um atendente consulta o seu caso.',
      whatsapp: true,
    }),
  },
  {
    id: 'reembolso',
    palavras: ['reembols', 'paguei particular', 'pedir de volta'],
    responder: () => ({
      texto: 'Pedido de reembolso ainda não é feito por este app, e as regras dependem do seu plano. O atendimento resolve e diz quais documentos são necessários.',
      whatsapp: true,
    }),
  },
  {
    id: 'dependentes',
    palavras: ['dependente', 'incluir filho', 'meu filho', 'esposa', 'marido', 'titularidade'],
    responder: (ctx) => ({
      texto: `Você está no plano como ${ctx.beneficiario.titularidade.toLowerCase()}. Inclusão e consulta de dependentes ainda não estão nesta versão do app — o atendimento faz isso.`,
      whatsapp: true,
    }),
  },
];

const INTENCOES_APP = [
  {
    id: 'rede',
    palavras: ['hospital', 'clinica', 'perto de mim', 'credenciado', 'laboratorio', 'endereco', 'onde fica', 'rede'],
    responder: (ctx, pergunta = '') => {
      const querHospital = ['hospital', 'pronto socorro', 'pronto-socorro', 'internacao'].some((t) => pergunta.includes(t));
      const unidade = querHospital ? ctx.hospitalMaisProximo : ctx.unidadeMaisProxima;
      return {
        texto: `${querHospital ? 'O hospital' : 'A unidade'} mais perto da posição atual é ${unidade.nome}.`,
        itens: [
          comDistancia(unidade),
          'Na tela da rede dá para tocar em "Usar minha localização" e reordenar tudo pela distância real.',
        ],
        link: { rotulo: 'Ver rede credenciada', para: querHospital ? '/rede?filtro=HOSPITAIS' : '/rede' },
        sugestoes: ['Documentos para a consulta'],
      };
    },
  },
  {
    id: 'horario_unidade',
    palavras: ['horario de funcionamento', 'que horas abre', 'funciona domingo', 'aberto agora', 'fim de semana'],
    responder: (ctx) => ({
      texto: 'O horário muda de unidade para unidade, e não tenho essa agenda aqui. Pronto-socorro de hospital funciona 24h; para clínica, vale confirmar antes de sair de casa.',
      itens: [`Hospital mais perto: ${comDistancia(ctx.hospitalMaisProximo)}`],
      link: { rotulo: 'Ver rede credenciada', para: '/rede' },
      whatsapp: true,
    }),
  },
  {
    id: 'risco',
    palavras: ['plano de cuidado', 'score', 'risco', 'minha saude esta', 'prevencao'],
    responder: () => ({
      texto: 'Seu plano de cuidado mostra os fatores que mais pesam hoje e o que fazer em seguida. É um cálculo por regras, explicável fator a fator — não é diagnóstico.',
      link: { rotulo: 'Ver plano de cuidado', para: '/plano-de-cuidado' },
    }),
  },
  {
    id: 'notificacoes',
    palavras: ['notificacao', 'aviso', 'lembrete', 'me avisa'],
    responder: () => ({
      texto: 'Avisos de consulta, resultado liberado e vencimento da mensalidade aparecem no sino do topo.',
      link: { rotulo: 'Ver notificações', para: '/notificacoes' },
    }),
  },
  {
    id: 'cadastro',
    palavras: ['meu telefone', 'meu email', 'meu e-mail', 'minha senha', 'mudar senha', 'trocar senha', 'atualizar cadastro', 'alterar cadastro', 'mudar meus dados', 'meu endereco'],
    responder: (ctx) => ({
      texto: 'Seus dados aparecem no perfil, mas a alteração de cadastro ainda não está nesta versão do app.',
      itens: [`E-mail: ${ctx.beneficiario.email}`, `Celular: ${ctx.beneficiario.telefone ?? 'não informado'}`],
      link: { rotulo: 'Ver meu perfil', para: '/perfil' },
      whatsapp: true,
    }),
  },
  {
    id: 'privacidade',
    palavras: ['privacidade', 'lgpd', 'meus dados estao', 'apagar meus dados', 'seguranca', 'quem ve meus'],
    responder: () => ({
      texto: 'Seus dados ficam só neste dispositivo nesta versão. No perfil há a trilha de acessos e o botão que apaga tudo o que o app guardou aqui.',
      itens: ['O CPF aparece mascarado', 'A sessão cai após 15 minutos sem uso', 'A localização, quando usada, não sai do aparelho'],
      link: { rotulo: 'Ver segurança e privacidade', para: '/perfil' },
    }),
  },
  {
    id: 'foto',
    palavras: ['foto', 'imagem do perfil', 'avatar'],
    responder: () => ({
      texto: 'Dá para colocar sua foto no perfil: toque na câmera sobre o avatar. Ela fica só neste aparelho.',
      link: { rotulo: 'Ir para o perfil', para: '/perfil' },
    }),
  },
  {
    id: 'atendente',
    palavras: ['atendente', 'humano', 'pessoa de verdade', 'falar com alguem', 'whatsapp', 'central'],
    responder: () => ({
      texto: 'Claro. Posso te levar para uma conversa no WhatsApp com o atendimento — é só tocar no botão.',
      whatsapp: true,
    }),
  },
  {
    id: 'ajuda',
    palavras: ['ajuda', 'o que voce faz', 'menu', 'opcoes', 'o que voce sabe'],
    responder: () => ({
      texto: 'Pergunte do seu jeito, falando ou digitando. Sei responder sobre:',
      itens: [
        'Consultas: próxima, histórico, agendar, cancelar, atraso',
        'Exames: agendados, preparo e jejum, resultados liberados',
        'Encaminhamentos e guias',
        'Mensalidade, pagamento e histórico',
        'Carteirinha, cobertura e dados do plano',
        'Rede credenciada e unidade mais perto de você',
        'Privacidade, notificações e perfil',
      ],
      sugestoes: ['Minha próxima consulta', 'Preciso de um hospital', 'Falar com atendente'],
    }),
  },
];

const ACOES_IDS = ['cancelar', 'agendar', 'atraso'];
const ACOES = INTENCOES.filter((i) => ACOES_IDS.includes(i.id));
const BASE_DE_REGRAS = [...INTENCOES, ...INTENCOES_SERVICOS, ...INTENCOES_PLANO, ...INTENCOES_APP].filter(
  (i) => !ACOES_IDS.includes(i.id),
);

const RESPOSTA_PADRAO = {
  texto: 'Ainda não sei responder isso. Posso tentar de outro jeito: pergunte sobre um destes assuntos, ou peça um atendente.',
  itens: ['Consultas e exames', 'Resultados e laudos', 'Encaminhamentos', 'Mensalidade', 'Rede credenciada', 'Carteirinha e cobertura'],
  whatsapp: true,
};

/** Soma o tamanho das palavras-chave que aparecem na pergunta. */
function pontuar(normalizada, intencao) {
  return intencao.palavras.reduce((total, palavra) => (normalizada.includes(palavra) ? total + palavra.length : total), 0);
}

/** Atalhos que mudam conforme o que a pessoa tem em aberto agora. */
function sugestoesDoContexto(ctx) {
  const sugestoes = [];
  if (ctx.proximaConsulta) sugestoes.push('Minha próxima consulta');
  if (ctx.exameAgendado) sugestoes.push('Preciso de jejum?');
  if (ctx.resultadosDisponiveis.length) sugestoes.push('Meus resultados');
  if (ctx.mensalidadeAberta) sugestoes.push('Minha mensalidade');
  if (ctx.encaminhamentosAtivos.length) sugestoes.push('Meus encaminhamentos');
  sugestoes.push('O que você faz?');
  return sugestoes.slice(0, 4);
}

function responderPergunta(texto, ctx) {
  const normalizada = normalizar(texto);
  const urgente = PRIORITARIAS.find((i) => pontuar(normalizada, i) > 0);
  // Verbo de ação vence substantivo: "como cancelo minha consulta" é cancelamento,
  // não pergunta sobre a próxima consulta, ainda que "minha consulta" seja maior.
  const acao = ACOES.find((i) => pontuar(normalizada, i) > 0);
  // Fora das prioritárias, vence quem casar mais texto: "quando sai meu resultado"
  // vai para resultados, e não para consultas por causa do "quando".
  const melhor = BASE_DE_REGRAS.reduce(
    (escolhida, intencao) => {
      const pontos = pontuar(normalizada, intencao);
      return pontos > escolhida.pontos ? { intencao, pontos } : escolhida;
    },
    { intencao: null, pontos: 0 },
  );

  const intencao = urgente ?? acao ?? melhor.intencao;
  const resposta = intencao ? intencao.responder(ctx, normalizada) : RESPOSTA_PADRAO;
  return {
    intencao: intencao?.id ?? 'nao_entendida',
    texto: resposta.texto,
    itens: resposta.itens ?? [],
    link: resposta.link ?? null,
    whatsapp: resposta.whatsapp ?? false,
    sugestoes: resposta.sugestoes ?? sugestoesDoContexto(ctx),
  };
}

export function saudacaoInicial() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const ctx = montarContexto(db, idLogado());
    return {
      texto: `Olá, ${primeiroNome(ctx.beneficiario.nome)}! Sou o assistente da Jornada. Pode perguntar falando ou digitando — sobre consultas, exames, pagamento ou a rede.`,
      itens: [],
      link: null,
      whatsapp: false,
      sugestoes: sugestoesDoContexto(ctx),
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
