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
} from '../utils/format';
import { PERFIL_VAZIO, calcularImc, comoChamar, rotuloDe, rotulosDe } from '../utils/perfilSaude';
import { PLANO } from '../utils/plano';

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

  const beneficiario = porId(db.beneficiarios, id);
  return {
    beneficiario,
    // Respostas do questionário do perfil; campos vazios quando não respondido.
    perfil: { ...PERFIL_VAZIO, ...(beneficiario.perfilSaude ?? {}) },
    proximaConsulta: proximaConsulta && detalharConsulta(proximaConsulta),
    proximaTeleconsulta: consultas
      .filter((c) => c.modalidade === 'TELECONSULTA' && ['AGENDADA', 'CONFIRMADA'].includes(c.status) && c.dataHora >= agora)
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora))
      .map(detalharConsulta)[0],
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
    todosEncaminhamentos: doUsuario(db.encaminhamentos).map((e) => ({
      ...e,
      especialidade: porId(db.especialidades, e.especialidadeDestinoId).nome,
      unidade: porId(db.unidades, e.unidadeDestinoId)?.nome,
    })),
    examesEmAndamento: exames
      .filter((e) => e.status === 'AGUARDANDO')
      .map((e) => ({ ...e, tipo: porId(db.tiposExame, e.tipoExameId) })),
    tiposExame: db.tiposExame,
    especialidades: db.especialidades.map((e) => ({ ...e, medicos: db.medicos.filter((m) => m.especialidadeId === e.id) })),
    unidadesPorTipo: {
      clinicas: db.unidades.filter((u) => u.tipo === 'CLINICA').length,
      hospitais: db.unidades.filter((u) => u.tipo === 'HOSPITAL').length,
      medicos: db.medicos.length,
    },
    mensalidadeAberta: db.mensalidades.find((m) => m.beneficiarioId === id && m.status === 'EM_ABERTO'),
    mensalidadesPagas: db.mensalidades.filter((m) => m.beneficiarioId === id && ['PAGA', 'PAGA_COM_ATRASO'].includes(m.status)).length,
    pagasComAtraso: db.mensalidades.filter((m) => m.beneficiarioId === id && m.status === 'PAGA_COM_ATRASO').length,
    hospitalMaisProximo: maisProxima(db.unidades.filter((u) => u.tipo === 'HOSPITAL')),
    unidadeMaisProxima: maisProxima(db.unidades),
  };
}

/** Especialidade citada na pergunta ("cardiologista", "clínico geral"...), se houver. */
const RADICAIS_ESPECIALIDADE = {
  'Clínico Geral': ['clinico geral', 'clinica geral', 'clinico'],
  Cardiologia: ['cardiolog'],
  Dermatologia: ['dermatolog'],
  Endocrinologia: ['endocrin'],
  Ginecologia: ['ginecolog'],
  Oftalmologia: ['oftalmolog', 'oculista'],
  Ortopedia: ['ortoped'],
  Pediatria: ['pediatr'],
};

function especialidadeCitada(ctx, pergunta = '') {
  const nome = Object.keys(RADICAIS_ESPECIALIDADE).find((n) => RADICAIS_ESPECIALIDADE[n].some((r) => pergunta.includes(r)));
  return nome ? ctx.especialidades.find((e) => e.nome === nome) : null;
}

function descreverContato(perfil) {
  const parentesco = perfil.contatoParentesco ? ` (${perfil.contatoParentesco})` : '';
  return `${perfil.contatoNome}${parentesco}${perfil.contatoTelefone ? ` — ${perfil.contatoTelefone}` : ''}`;
}

/** Devolve ao beneficiário o que ele mesmo informou. Nunca interpreta clinicamente. */
function responderPerfil(ctx) {
  const p = ctx.perfil;
  const alergias = rotulosDe('alergias', p.alergias.filter((a) => a !== 'NENHUMA'));
  const imc = calcularImc(p.alturaCm, p.pesoKg);
  const itens = [
    p.tipoSanguineo && `Tipo sanguíneo: ${rotuloDe('tipoSanguineo', p.tipoSanguineo)}`,
    p.alergias.includes('NENHUMA') && 'Alergias: nenhuma informada',
    alergias.length > 0 && `Alergias: ${alergias.join(', ').toLowerCase()}${p.alergiasDetalhe ? ` — ${p.alergiasDetalhe}` : ''}`,
    p.medicamentos && `Remédios de uso contínuo: ${p.medicamentos.replace(/\n+/g, '; ')}`,
    imc && `IMC: ${imc.valor.toLocaleString('pt-BR')} (${p.alturaCm} cm, ${p.pesoKg.toLocaleString('pt-BR')} kg)`,
    p.contatoNome && `Contato de emergência: ${descreverContato(p)}`,
  ].filter(Boolean);

  if (!itens.length) {
    return {
      texto: 'Você ainda não preencheu essas informações. Leva uns 3 minutos, e aí eu passo a saber seu tipo sanguíneo, alergias, remédios e contato de emergência.',
      link: { rotulo: 'Preencher perfil de saúde', para: '/perfil/saude' },
    };
  }
  return {
    texto: 'Isto é o que você informou no seu perfil de saúde:',
    itens: [...itens, 'Dúvida sobre remédio ou alergia é com o seu médico.'],
    link: { rotulo: 'Revisar perfil de saúde', para: '/perfil/saude' },
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
    // "Qual meu contato de emergência?" é consulta ao perfil, não pedido de socorro.
    ignorar: ['contato de emergencia'],
    // Radicais ("desmai", "engasg") pegam "desmaiou", "engasgando". Na dúvida, emergência:
    // é melhor errar por cautela do que deixar passar.
    palavras: [
      'emergencia', 'urgencia', 'socorro', 'dor no peito', 'falta de ar', 'passando mal', 'desmai', 'sangramento', 'sangrando',
      'convuls', 'avc', 'infart', 'engasg', 'nao consigo respirar', 'sem respirar', 'inconsciente', 'nao acorda', 'overdose',
      'envenen', 'suicid', 'me matar', 'tirar minha vida', 'acidente', 'queimadura grave',
    ],
    responder: (ctx, pergunta = '') => ({
      texto: 'Isso pode ser uma emergência. Se alguém está passando mal agora, não espere por aqui: ligue 192 (SAMU) ou vá ao pronto-socorro mais próximo. Não consigo avaliar emergências por mensagem.',
      itens: [
        'SAMU — 192',
        'Bombeiros — 193',
        ...(['suicid', 'me matar', 'tirar minha vida'].some((t) => pergunta.includes(t)) ? ['CVV, apoio emocional 24h — 188'] : []),
        `Mais perto de você: ${comDistancia(ctx.hospitalMaisProximo)}`,
        ...(ctx.perfil.contatoNome ? [`Seu contato de emergência: ${descreverContato(ctx.perfil)}`] : []),
      ],
      link: { rotulo: 'Ver hospitais no mapa', para: '/rede?filtro=HOSPITAIS' },
      sugestoes: ['Minha próxima consulta'],
    }),
  },
  {
    // Antes de "clínico" porque "meus remédios" é pedido para ver o próprio cadastro,
    // não pergunta de tratamento. Com "posso", "devo"... volta a ser clínica (exceto).
    id: 'perfil_saude',
    palavras: [
      'minha alergia', 'minhas alergias', 'sou alergic', 'tipo sanguineo', 'meu sangue', 'contato de emergencia',
      'meus remedios', 'meus medicamentos', 'remedios que eu tomo', 'medicamentos que eu tomo', 'remedio que eu tomo',
      'uso continuo', 'perfil de saude', 'meus dados de saude', 'meu imc', 'minha altura', 'meu peso', 'questionario',
    ],
    // "posso", "devo"... viram pergunta clínica; "seguros", "LGPD"... viram privacidade.
    exceto: ['posso', 'devo', 'pode ', 'faz mal', 'tomar junto', 'interacao', 'segur', 'lgpd', 'compartilh', 'terceiros', 'quem tem acesso', 'apagar', 'exclu'],
    responder: (ctx) => responderPerfil(ctx),
  },
  {
    // Nunca dizer se um sintoma é leve ou grave, nem se um resultado está "normal":
    // isso é interpretação clínica, mesmo quando parece uma pergunta de sim ou não.
    id: 'clinico',
    palavras: [
      'sintoma', 'remedio', 'medicamento', 'posso tomar', 'diagnostico', 'dor de', 'febre', 'tratamento', 'o que eu tenho', 'e grave',
      'estou com', 'meu resultado significa', 'esse valor', 'sentindo', 'tosse', 'esta normal', 'valor normal', 'resultado normal', 'o que pode ser',
      'pode ser o que', 'preciso ir ao medico', 'devo ir ao medico', 'dipirona', 'antibiotico', 'dose de', 'e perigoso', 'preocupante',
    ],
    responder: () => ({
      texto: 'Não posso avaliar sintomas, dizer se um resultado está normal ou indicar remédio — só um médico faz isso com segurança. Posso te ajudar a marcar uma consulta ou uma teleconsulta agora.',
      itens: ['Se os sintomas forem fortes ou piorarem rápido, procure o pronto-socorro ou ligue 192.'],
      link: { rotulo: 'Agendar consulta', para: '/consultas/agendar' },
      sugestoes: ['Agendar teleconsulta', 'Hospital mais perto'],
    }),
  },
];

const INTENCOES = [
  {
    id: 'saudacao',
    palavras: ['oi', 'ola', 'opa', 'e ai', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem'],
    responder: (ctx) => ({ texto: `Olá, ${comoChamar(ctx.beneficiario)}! Como posso ajudar hoje?` }),
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
            itens: ctx.proximaConsulta.unidade
              ? [
                  `${formatarData(ctx.proximaConsulta.dataHora)} às ${formatarHora(ctx.proximaConsulta.dataHora)}`,
                  `${ctx.proximaConsulta.unidade.nome} — ${ctx.proximaConsulta.unidade.endereco}, ${ctx.proximaConsulta.unidade.cidade}/${ctx.proximaConsulta.unidade.uf}`,
                  'Chegue com 15 minutos de antecedência.',
                ]
              : [
                  `${formatarData(ctx.proximaConsulta.dataHora)} às ${formatarHora(ctx.proximaConsulta.dataHora)}, por teleconsulta`,
                  'A sala de espera abre 15 minutos antes, na tela Consultas.',
                  'Tenha internet estável, fone de ouvido e um lugar reservado.',
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
    palavras: ['documento', 'levar', 'levo', 'preciso de que', 'rg', 'carteirinha na consulta', 'o que levar', 'cartao do sus', 'cartao sus', 'comprovante de endereco'],
    responder: () => ({
      texto: 'Para ser atendido, leve:',
      itens: [
        'Documento de identidade com foto',
        'CPF ou Cartão SUS',
        'Carteirinha do plano — a digital, no seu perfil, serve',
        'Pedido médico, no caso de exame',
        'Comprovante de endereço só se a unidade pedir, costuma ser no primeiro atendimento',
      ],
      sugestoes: ['Agendar consulta', 'Ver minha carteirinha'],
    }),
  },
  {
    // Ações vêm antes das outras regras (ACOES_IDS). "exige": só vale com a palavra "exame".
    id: 'agendar_exame',
    palavras: ['agend', 'marcar', 'marco ', 'marca ', 'novo exame'],
    exige: ['exame'],
    exceto: ['exame marcado', 'exames marcados', 'tenho exame', 'proximo exame', 'exame agendado', 'exames agendados', 'meus exames', 'adorei', 'gostei', 'facilidade', 'demorei', 'cancel'],
    responder: () => ({
      texto: 'Para agendar um exame: em Exames, toque em "Agendar exame", escolha o tipo, a unidade mais perto, o dia e o horário. Se o exame pede preparo, como jejum, ele aparece na confirmação.',
      itens: [
        'Dá para marcar mais de um exame no mesmo dia: é um agendamento para cada',
        'O app deixa agendar sem pedido médico, mas leve o pedido se tiver — se o plano exige pedido para cobrir, isso depende do seu contrato',
      ],
      link: { rotulo: 'Agendar exame', para: '/exames/agendar' },
      sugestoes: ['Preciso de jejum?', 'Quanto tempo demora o resultado?'],
    }),
  },
  {
    id: 'agendar',
    palavras: ['agend', 'marcar', 'nova consulta'],
    // Elogio, reclamação ou documentos que citam "agendar" não são pedido de agendamento.
    exceto: ['adorei', 'gostei', 'parabens', 'facilidade', 'demorei', 'demora', 'dificil', 'insatisfeit', 'reclam', 'document', 'cartao do sus', 'o que eu levo', 'levar', 'crm', 'antes de agendar'],
    responder: (ctx, pergunta = '') => {
      const especialidade = especialidadeCitada(ctx, pergunta);
      return {
        texto: especialidade
          ? `Para marcar com ${especialidade.nome}: em Agendar consulta, a especialidade já vem escolhida — depois é só dizer se quer presencial${especialidade.teleconsulta ? ' ou teleconsulta' : ''}, escolher o médico, o dia e o horário.`
          : 'Você agenda pelo app em poucos passos: escolha a especialidade, se quer presencial ou teleconsulta, o médico, a unidade, o dia e o horário.',
        itens: ['Sim, dá para escolher o médico: a lista mostra nome e CRM de cada um', 'Pode cancelar sem custo até 24h antes'],
        link: { rotulo: 'Agendar consulta', para: especialidade ? `/consultas/agendar?especialidade=${especialidade.id}` : '/consultas/agendar' },
        sugestoes: ['Quais especialidades tem?', 'Agendar exame'],
      };
    },
  },
  {
    id: 'cancelar',
    palavras: ['cancel', 'desmarc', 'nao vou poder ir', 'desistir', 'remarc', 'desfaco', 'desfazer', 'marquei errado', 'mudar o horario', 'trocar o horario'],
    // Plano cancelado por falta de pagamento é outra conversa (pagamento_atraso).
    exceto: ['falta de pagamento', 'cancelado por', 'inadimpl', 'plano pode ser cancelado', 'meu plano', 'o plano', 'do plano', 'minha conta'],
    responder: (ctx, pergunta = '') => pergunta.includes('exame')
      ? {
          texto: 'Cancelar ou remarcar um exame agendado ainda não é feito pelo app: o atendimento faz isso para você. Se for só trocar a data, depois é possível agendar de novo em Exames.',
          link: { rotulo: 'Meus exames', para: '/exames' },
          whatsapp: true,
        }
      : ({
      texto: pergunta.includes('remarc') || pergunta.includes('marquei errado') || pergunta.includes('horario')
        ? 'Para remarcar ou desfazer um agendamento, abra Consultas, cancele a consulta e marque de novo no horário que preferir — o horário antigo fica livre na hora.'
        : 'Para cancelar, abra Consultas, escolha a consulta e toque em "Cancelar consulta".',
      itens: [
        'Sem custo até 24h antes — assim o horário fica livre para outra pessoa',
        'Cancelamento com menos de 24h: se há cobrança, depende do seu contrato; o atendimento confirma',
      ],
      link: { rotulo: 'Minhas consultas', para: '/consultas' },
      sugestoes: ['Agendar consulta', 'Se eu me atrasar?'],
    }),
  },
  {
    id: 'especialidades',
    palavras: ['especialidade', 'cardiolog', 'dermatolog', 'endocrin', 'ginecolog', 'oftalmolog', 'oculista', 'ortoped', 'pediatr', 'clinico geral', 'tipos de medico'],
    exceto: ['cobre', 'cobertura'],
    responder: (ctx, pergunta = '') => {
      const citada = especialidadeCitada(ctx, pergunta);
      if (citada) {
        return {
          texto: citada.medicos.length
            ? `Sim, tem ${citada.nome}: ${citada.medicos.length === 1 ? 'um médico' : `${citada.medicos.length} médicos`} na rede do app${citada.teleconsulta ? ', com opção de teleconsulta' : ' — só presencial, porque depende de exame no consultório'}.`
            : `Não encontrei médico de ${citada.nome} disponível agora.`,
          itens: citada.medicos.map((m) => `${m.nome} — ${m.crm}`),
          link: { rotulo: `Agendar ${citada.nome}`, para: `/consultas/agendar?especialidade=${citada.id}` },
        };
      }
      return {
        texto: `Estas são as ${ctx.especialidades.length} especialidades que você agenda pelo app:`,
        itens: ctx.especialidades.map((e) => `${e.nome}${e.teleconsulta ? '' : ' (só presencial)'}`),
        link: { rotulo: 'Agendar consulta', para: '/consultas/agendar' },
        sugestoes: ['Tem cardiologista?', 'Consulta por vídeo'],
      };
    },
  },
  {
    id: 'atraso',
    palavras: ['atras', 'chegar tarde', 'perdi a consulta', 'faltei', 'nao fui'],
    // Atraso de mensalidade é pagamento_atraso.
    exceto: ['pagamento', 'mensalidade', 'pagar', 'boleto', 'parcela', 'fatura', 'meses atras', 'dias atras', 'anos atras', 'semana atras', 'tempo atras'],
    responder: () => ({
      texto: 'Atraso de mais de 15 minutos costuma exigir remarcação, porque a agenda é por horário. Se já sabe que não vai dar, cancele antes — assim a vaga fica livre para outra pessoa e você não paga nada.',
      link: { rotulo: 'Minhas consultas', para: '/consultas' },
      sugestoes: ['Agendar consulta'],
    }),
  },
  {
    id: 'telemedicina',
    palavras: ['telemedicina', 'teleconsulta', 'consulta online', 'por video', 'a distancia', 'chamada de video'],
    responder: (ctx, pergunta = '') => {
      const agendada = ctx.proximaTeleconsulta;
      const citada = especialidadeCitada(ctx, pergunta);
      if (citada) {
        return {
          texto: citada.teleconsulta
            ? `Sim, ${citada.nome} atende por teleconsulta. No agendamento, escolha "Teleconsulta" depois da especialidade.`
            : `${citada.nome} é só presencial: depende de exame no consultório, então não tem teleconsulta.`,
          link: citada.teleconsulta
            ? { rotulo: 'Agendar teleconsulta', para: `/consultas/agendar?especialidade=${citada.id}&modalidade=TELECONSULTA` }
            : { rotulo: 'Agendar presencial', para: `/consultas/agendar?especialidade=${citada.id}` },
        };
      }
      return {
        texto: agendada
          ? `Você tem teleconsulta de ${agendada.especialidade.nome} com ${agendada.medico.nome} em ${formatarData(agendada.dataHora)}, às ${formatarHora(agendada.dataHora)}. A sala abre 15 minutos antes, na tela Consultas.`
          : 'Dá para marcar teleconsulta: no agendamento, escolha "Teleconsulta" depois da especialidade. Oftalmologia e ortopedia ficam só presenciais, porque dependem de exame no consultório.',
        itens: ['Internet estável e fone de ouvido', 'Lugar reservado e bem iluminado', 'Documento com foto e a lista dos remédios que você usa'],
        link: agendada ? { rotulo: 'Ver minhas consultas', para: '/consultas' } : { rotulo: 'Agendar teleconsulta', para: '/consultas/agendar?modalidade=TELECONSULTA' },
      };
    },
  },
];

// Intenções ligadas aos serviços — respondem com os dados reais do beneficiário.
const INTENCOES_SERVICOS = [
  {
    id: 'resultados',
    palavras: [
      'resultado', 'laudo', 'exame ficou pronto', 'saiu o exame', 'resultado do meu exame', 'baixo o laudo', 'baixar o laudo',
      'imprimir', 'pdf', 'exames antigos', 'exames de meses', 'exames anteriores', 'vejo o resultado', 'ver o resultado',
    ],
    responder: (ctx) => ({
      texto: ctx.resultadosDisponiveis.length
        ? `Seus resultados ficam em Resultados de exames. Você tem ${ctx.resultadosDisponiveis.length} liberado(s):`
        : 'Seus resultados ficam em Resultados de exames. Nenhum foi liberado até agora — assim que sair, você recebe uma notificação.',
      itens: [
        ...ctx.resultadosDisponiveis,
        'Toque no exame para abrir o laudo; "Imprimir ou salvar PDF" gera o documento para baixar',
        'Os antigos continuam lá: filtre por "Disponível" ou "Aguardando" e busque pelo nome',
      ],
      link: { rotulo: 'Ver resultados', para: '/resultados' },
      sugestoes: ['Quanto tempo demora o resultado?', 'O médico vê meu exame?'],
    }),
  },
  {
    id: 'resultado_prazo',
    palavras: [
      'quanto tempo demora', 'demora pra sair', 'demora para sair', 'demora o resultado', 'fica pronto', 'ficar pronto', 'quantos dias',
      'aguardando', 'vou ser avisado', 'avisado quando', 'quando sai', 'quando fica', 'demorar', 'demorando', 'normal demorar', 'prazo do resultado', 'prazo do exame', 'ainda nao saiu',
    ],
    responder: (ctx) => {
      const andamento = ctx.examesEmAndamento.map((e) =>
        e.dataRealizacao
          ? `${e.tipo.nome}: feito em ${formatarData(e.dataRealizacao)}, em análise`
          : `${e.tipo.nome}: ainda não realizado${e.dataAgendada ? `, marcado para ${formatarData(e.dataAgendada)}` : ''}`,
      );
      return {
        texto: 'O prazo depende do exame e do laboratório, e eu não tenho a previsão exata de cada um. "Aguardando" quer dizer que o exame ainda não foi feito ou está em análise. Quando o laudo sai, você recebe uma notificação no app.',
        itens: andamento.length ? andamento : ['Você não tem exame em andamento agora.'],
        link: { rotulo: 'Ver resultados', para: '/resultados' },
        sugestoes: ['Meus resultados', 'O médico vê meu exame?'],
      };
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
    palavras: ['jejum', 'preparo', 'preparar', 'posso comer', 'posso beber', 'horas sem comer'],
    responder: (ctx) => {
      // O preparo vem do catálogo de exames: é orientação do laboratório, não conselho clínico.
      const exemplos = ctx.tiposExame.filter((t) => [1, 2, 3].includes(t.id)).map((t) => `${t.nome}: ${t.preparo}`);
      return ctx.exameAgendado
        ? {
            texto: `Cada exame tem o seu preparo. Para o seu ${ctx.exameAgendado.tipo.nome}, em ${formatarData(ctx.exameAgendado.dataAgendada)}:`,
            itens: [ctx.exameAgendado.tipo.preparo, `Local: ${ctx.exameAgendado.unidade.nome}`, 'Outros exames têm preparo próprio, mostrado ao agendar'],
            link: { rotulo: 'Ver meus exames', para: '/exames' },
          }
        : {
            texto: 'Depende do exame — o preparo aparece na confirmação do agendamento. Alguns exemplos de exame de sangue:',
            itens: [...exemplos, 'Na dúvida, siga o que o laboratório ou o seu médico orientou'],
            link: { rotulo: 'Agendar exame', para: '/exames/agendar' },
          };
    },
  },
  {
    id: 'encaminhamento',
    palavras: [
      'encaminhamento', 'especialista', 'guia', 'autorizacao', 'acompanho meu encaminhamento', 'acompanhar o encaminhamento',
      'historico de encaminhamento', 'encaminhamentos antigos', 'em processo', 'meus encaminhamentos',
    ],
    responder: (ctx) => {
      const concluidos = ctx.todosEncaminhamentos.filter((e) => e.status === 'CONCLUIDO').length;
      return {
        texto: ctx.encaminhamentosAtivos.length
          ? 'Você acompanha tudo em Encaminhamentos. Os que estão em aberto:'
          : 'Você não tem encaminhamento em aberto. O histórico fica em Encaminhamentos.',
        itens: [
          ...ctx.todosEncaminhamentos
            .filter((e) => e.status !== 'CONCLUIDO')
            .map((e) => `${e.especialidade} — ${ROTULO_STATUS_ENCAMINHAMENTO[e.status]}, válido até ${formatarData(e.validade)}`),
          '"Ativo": já dá para agendar com o especialista',
          '"Em processo": aguardando autorização do plano',
          `"Concluído": atendimento feito${concluidos ? ` — você tem ${concluidos} no histórico` : ''}`,
        ],
        link: { rotulo: 'Ver encaminhamentos', para: '/encaminhamentos' },
        sugestoes: ['Quanto tempo vale um encaminhamento?'],
      };
    },
  },
  {
    id: 'encaminhamento_o_que_e',
    // 'encaminhamento' aqui também: empata com a regra geral e a frase específica desempata.
    palavras: [
      'encaminhamento', 'o que e um encaminhamento', 'o que e encaminhamento', 'pra que serve o encaminhamento', 'para que serve o encaminhamento',
      'como funciona o encaminhamento', 'preciso de encaminhamento', 'precisa de encaminhamento', 'encaminhamento medico',
    ],
    responder: (ctx) => ({
      texto: 'O encaminhamento é o pedido do seu médico para você ser atendido por um especialista ou numa unidade específica. No app você vê cada um com a especialidade, a unidade de destino, a validade e o status.',
      itens: [
        'Com o encaminhamento "Ativo", o botão "Agendar com especialista" já leva para a especialidade certa',
        'Se o seu plano exige encaminhamento para toda especialidade, isso é regra do contrato — o atendimento confirma',
        ctx.encaminhamentosAtivos.length ? `Você tem ${ctx.encaminhamentosAtivos.length} em aberto agora` : 'Você não tem nenhum em aberto agora',
      ],
      link: { rotulo: 'Ver encaminhamentos', para: '/encaminhamentos' },
      sugestoes: ['Quanto tempo vale um encaminhamento?'],
    }),
  },
  {
    id: 'encaminhamento_validade',
    palavras: ['encaminhamento', 'validade', 'quanto tempo vale', 'vale um encaminhamento', 'pode vencer', 'vencer antes', 'encaminhamento vencido', 'venceu', 'expira'],
    responder: (ctx) => {
      const abertos = ctx.todosEncaminhamentos.filter((e) => e.status !== 'CONCLUIDO');
      return {
        texto: 'Encaminhamento tem validade, sim: ela é definida quando ele é emitido e aparece em cada cartão da tela Encaminhamentos. Os seus:',
        itens: [
          ...abertos.map((e) => `${e.especialidade}: emitido em ${formatarData(e.dataEmissao)}, vale até ${formatarData(e.validade)}`),
          'Se vencer antes de você usar, peça um novo ao médico que encaminhou; se dá para prorrogar, depende do plano',
        ],
        link: { rotulo: 'Ver encaminhamentos', para: '/encaminhamentos' },
      };
    },
  },
];

const ROTULO_STATUS_ENCAMINHAMENTO = { ATIVO: 'ativo', EM_PROCESSO: 'em processo', CONCLUIDO: 'concluído' };

const INTENCOES_PLANO = [
  {
    id: 'pagamento',
    palavras: ['boleto', 'pagar', 'mensalidade', 'segunda via', 'pix', 'fatura', 'vencimento', 'quanto pago', 'quando vence', 'vence minha', 'data de vencimento'],
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
    id: 'pagamento_formas',
    palavras: ['formas de pagamento', 'forma de pagamento', 'cartao de credito', 'credito', 'debito automatico', 'debito', 'parcel', 'parcelar a mensalidade', 'da pra pagar', 'aceitam', 'pagar com', 'pagar no'],
    responder: () => ({
      texto: 'Em Pagamento do convênio você escolhe a forma de pagar a mensalidade:',
      itens: [
        'Pix — confirmado na hora',
        'Cartão de crédito — em até 3x sem juros (é o jeito de parcelar)',
        'Boleto bancário — leva até 2 dias úteis para compensar',
        'Débito automático — aparece como opção, mas cadastrar a conta bancária ainda é com o atendimento',
      ],
      link: { rotulo: 'Ir para pagamento', para: '/pagamento' },
      sugestoes: ['Quando vence minha mensalidade?', 'Histórico de pagamentos'],
    }),
  },
  {
    id: 'pagamento_atraso',
    palavras: ['atras', 'multa', 'juros', 'falta de pagamento', 'inadimpl', 'nao paguei', 'esqueci de pagar', 'cancelado por', 'suspens', 'plano pode ser cancelado'],
    responder: (ctx) => ({
      texto: 'Valor de multa e juros por atraso está no seu contrato, e eu não tenho esse número aqui — o atendimento confirma. O que vale por lei para plano individual ou familiar:',
      itens: [
        'O plano só pode ser suspenso ou cancelado por falta de pagamento acima de 60 dias, seguidos ou não, nos últimos 12 meses (Lei 9.656/98, art. 13)',
        'E a operadora precisa avisar você até o 50º dia de atraso',
        ctx.mensalidadeAberta ? `Sua mensalidade em aberto vence em ${formatarData(ctx.mensalidadeAberta.vencimento)}` : 'Você não tem mensalidade em aberto agora',
        ...(ctx.pagasComAtraso ? [`No seu histórico, ${ctx.pagasComAtraso} mensalidade(s) aparece(m) como "paga com atraso", já com o valor cobrado`] : []),
      ],
      link: { rotulo: 'Ir para pagamento', para: '/pagamento' },
      whatsapp: true,
    }),
  },
  {
    id: 'historico_pagamento',
    palavras: [
      'historico de pagamento', 'ja paguei', 'comprovante', 'quanto paguei', 'pagamentos que ja fiz', 'pagamentos feitos',
      'mes anterior', 'meses anteriores', 'boleto antigo', 'boleto de um mes', 'mensalidade paga', 'mensalidades pagas',
    ],
    responder: (ctx) => ({
      texto: `Em Histórico de pagamentos ficam todas as mensalidades pagas, com data, valor e forma de pagamento — você tem ${ctx.mensalidadesPagas} registrada(s).`,
      itens: [
        'Comprovante em PDF e boleto de um mês já pago ainda não saem pelo app: o atendimento envia',
        'O boleto da mensalidade em aberto está na tela de pagamento',
      ],
      link: { rotulo: 'Ver histórico', para: '/pagamento/historico' },
      whatsapp: true,
    }),
  },
  {
    id: 'carteirinha',
    palavras: [
      'carteirinha', 'numero do plano', 'meu plano', 'meus dados', 'cartao do plano', 'segunda via da carteirinha',
      'carteirinha fisica', 'carteirinha digital', 'numero da minha carteirinha',
    ],
    responder: (ctx) => ({
      texto: `Sua carteirinha digital fica no Perfil: plano ${ctx.beneficiario.plano}, como ${ctx.beneficiario.titularidade.toLowerCase()}, número ${ctx.beneficiario.carteirinha}.`,
      itens: [
        'Toque no cartão para abrir em tela cheia — ele deita sozinho para você mostrar no balcão, e dá para mostrar direto do celular',
        'O verso traz registro ANS, acomodação, abrangência e o código de barras',
        'Ela vale na rede credenciada do seu plano; se algum lugar pedir o cartão físico ou uma segunda via, o atendimento emite',
      ],
      link: { rotulo: 'Ver carteirinha', para: '/perfil' },
      sugestoes: ['O que meu plano cobre?'],
    }),
  },
  {
    id: 'cobertura',
    palavras: [
      'cobertura', 'cobre', 'acomodacao', 'abrangencia', 'enfermaria', 'apartamento', 'tenho direito', 'plano cobre', 'meu plano cobre',
      'outro estado', 'em outro estado', 'outra cidade', 'viagem', 'viajando',
    ],
    responder: () => ({
      texto: 'O que está coberto em cada caso depende do contrato — um atendente confirma para você. O que o verso da sua carteirinha informa:',
      itens: [`Abrangência: ${PLANO.abrangencia}`, `Acomodação: ${PLANO.acomodacao}`, `Segmentação: ${PLANO.segmentacao}`],
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
    palavras: ['dependente', 'incluir filho', 'meu filho', 'minha filha', 'esposa', 'marido', 'titularidade', 'plano familiar', 'incluido no plano', 'incluida no plano', 'quem esta no plano'],
    responder: (ctx) => ({
      texto: `Você está no ${ctx.beneficiario.plano} como ${ctx.beneficiario.titularidade.toLowerCase()}. Ver, incluir ou tirar dependentes ainda não é feito por este app: o atendimento abre a solicitação e diz quais documentos enviar.`,
      whatsapp: true,
    }),
  },
];

const INTENCOES_APP = [
  {
    id: 'rede',
    palavras: ['hospital', 'clinica', 'perto de mim', 'credenciad', 'laboratorio', 'endereco', 'onde fica', 'rede', 'proximo de mim', 'minha regiao', 'crm', 'medico perto'],
    responder: (ctx, pergunta = '') => {
      const querHospital = ['hospital', 'pronto socorro', 'pronto-socorro', 'internacao'].some((t) => pergunta.includes(t));
      const unidade = querHospital ? ctx.hospitalMaisProximo : ctx.unidadeMaisProxima;
      return {
        texto: `Médicos, clínicas e hospitais ficam em Rede credenciada, com mapa e distância. ${querHospital ? 'O hospital' : 'A unidade'} mais perto da posição atual é ${unidade.nome}.`,
        itens: [
          comDistancia(unidade),
          'Toque em "Usar minha localização" para reordenar tudo pela distância real',
          'O CRM de cada médico aparece no filtro "Médicos" e na hora de escolher o profissional no agendamento',
        ],
        link: { rotulo: 'Ver rede credenciada', para: querHospital ? '/rede?filtro=HOSPITAIS' : '/rede' },
        sugestoes: ['Documentos para a consulta'],
      };
    },
  },
  {
    id: 'rede_tipos',
    palavras: ['tipos de unidade', 'tipo de unidade', 'ubs', 'ubs e', 'unidade basica', 'diferenca', 'posto de saude', 'filtr', 'diferenca entre', 'so por hospitais', 'so hospitais', 'so clinicas', 'fazem parte da rede'],
    responder: (ctx) => ({
      texto: 'Na Rede credenciada você filtra por tipo:',
      itens: [
        `Médicos — ${ctx.unidadesPorTipo.medicos} profissionais, com especialidade e CRM`,
        `Clínicas — ${ctx.unidadesPorTipo.clinicas} unidades de atendimento`,
        `Hospitais e pronto atendimento — ${ctx.unidadesPorTipo.hospitais} unidades`,
        'UBS (posto de saúde) é do SUS, não da rede do plano: lá o atendimento é pelo Cartão SUS',
        'As unidades do app são unidades próprias Unimed; a lista completa da rede do seu plano está no Guia Médico',
      ],
      link: { rotulo: 'Filtrar hospitais', para: '/rede?filtro=HOSPITAIS' },
    }),
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
    palavras: ['plano de cuidado', 'score', 'risco', 'minha saude esta', 'prevencao', 'check-up', 'checkup'],
    responder: () => ({
      texto: 'Seu plano de cuidado mostra os fatores que mais pesam hoje — idade, condição crônica, exames alterados, hábitos do perfil de saúde — e o que fazer em seguida. É um cálculo por regras, explicável fator a fator: não é diagnóstico.',
      link: { rotulo: 'Ver plano de cuidado', para: '/plano-de-cuidado' },
    }),
  },
  {
    id: 'notificacoes',
    palavras: ['notificac', 'aviso', 'lembrete', 'me avisa', 'sino'],
    responder: () => ({
      texto: 'Avisos de consulta, resultado liberado, encaminhamento e vencimento da mensalidade aparecem no sino do topo. Em Configurações você escolhe quais tipos aparecem.',
      link: { rotulo: 'Ver notificações', para: '/notificacoes' },
    }),
  },
  {
    id: 'cadastro',
    palavras: [
      'meu telefone', 'meu celular', 'me chamar', 'meu email', 'meu e-mail', 'minha senha', 'mudar senha', 'trocar senha', 'atualizar cadastro',
      'alterar cadastro', 'mudar meus dados', 'meu endereco', 'mudo meu', 'atualizo meu', 'trocar meu', 'meu nome', 'corrig', 'nome errado', 'dados cadastrais', 'cadastro',
    ],
    responder: (ctx) => ({
      texto: 'Celular, CEP e cidade, contato de emergência e como você prefere ser chamado(a) você muda no Perfil de saúde, na primeira etapa. E-mail, senha e correção do nome ainda não mudam por aqui: nome precisa de documento, e o atendimento faz isso.',
      itens: [`E-mail: ${ctx.beneficiario.email}`, `Celular: ${ctx.beneficiario.telefone ?? 'não informado'}`],
      link: { rotulo: 'Editar meus dados', para: '/perfil/saude' },
      whatsapp: true,
    }),
  },
  {
    id: 'privacidade',
    palavras: [
      'privacidade', 'lgpd', 'meus dados estao', 'seguranca', 'quem ve meus', 'estao seguros', 'seguro esse app', 'seguro nesse app',
      'terceiros', 'compartilhados', 'quem tem acesso', 'vazar', 'vazamento', 'protegid',
    ],
    responder: () => ({
      texto: 'Dado de saúde é sensível pela LGPD, e o app segue a regra de usar só o necessário. Nesta versão, seus dados ficam guardados no próprio aparelho, e quem mais vê o quê é sempre avisado na tela:',
      itens: [
        'Resultados de exame: só quem vai te atender a seguir, e dá para desligar em Configurações',
        'Voz natural: o texto das respostas faladas vai para a OpenAI, que gera o áudio (pode desligar)',
        'Modo Libras: o texto que você manda traduzir vai para o VLibras, só se ligar o modo',
        'CEP: só o número vai ao ViaCEP, para preencher cidade e UF',
        'CPF mascarado, sessão que cai após 15 minutos parado e trilha de acessos em Configurações',
      ],
      link: { rotulo: 'Ver privacidade', para: '/configuracoes' },
    }),
  },
  {
    id: 'compartilhamento_resultados',
    palavras: ['medico ve meu exame', 'medico vai ver meu', 'medico tem acesso', 'quem ve meu resultado', 'quem ve meus exames', 'compartilhar meus resultados', 'compartilhar resultado', 'compartilhar exame', 'compartilhamento de resultados','levar o exame', 'levar meus exames', 'levar o resultado', 'levar o laudo'],
    responder: () => ({
      texto: 'Não precisa levar o laudo: quando um resultado sai, ele fica visível para quem vai te atender a seguir — o médico da próxima consulta, a equipe do próximo exame e o especialista do encaminhamento em aberto. O acesso acaba quando o atendimento passa.',
      itens: ['Na tela de cada laudo aparece quem pode ver', 'Dá para desligar em Configurações, em "Resultados de exames"'],
      link: { rotulo: 'Ver quem tem acesso', para: '/configuracoes' },
    }),
  },
  {
    id: 'libras',
    palavras: ['libras', 'surdo', 'surda', 'lingua de sinais', 'interprete de libras', 'vlibras', 'deficiencia auditiva'],
    responder: () => ({
      texto: 'Tem modo Libras: em Configurações, ligue "Modo Libras". Aparece o botão do VLibras na lateral; toque nele e depois no texto que quer ver traduzido pelo intérprete virtual.',
      itens: ['O VLibras é do Governo Federal e o texto traduzido vai para o servidor dele'],
      link: { rotulo: 'Abrir configurações', para: '/configuracoes' },
    }),
  },
  {
    id: 'excluir_conta',
    palavras: [
      'apago minha conta', 'apagar minha conta', 'excluir minha conta', 'excluir conta', 'deletar', 'exclu', 'apagar meus dados', 'apagar tudo',
      'sair do plano', 'dados somem', 'cancelar minha conta', 'excluir todos', 'excluir meus dados', 'cancelar meu plano', 'cancelar o plano', 'cancelamento do plano',
    ],
    responder: () => ({
      texto: 'Pelo app você já apaga o que ele guarda; a conta na operadora e o contrato são com o atendimento:',
      itens: [
        'Configurações → "Apagar perfil de saúde" apaga as respostas do questionário',
        'Configurações → "Apagar dados" limpa tudo o que o app guardou neste aparelho',
        'Excluir o cadastro ou sair do plano: pedido pelo atendimento',
        'Mesmo depois, parte dos dados precisa ser guardada por lei — o prontuário, por exemplo, por 20 anos (Lei 13.787/2018) — e isso é permitido pela LGPD (art. 16)',
      ],
      link: { rotulo: 'Abrir configurações', para: '/configuracoes' },
      whatsapp: true,
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
    id: 'configuracoes',
    palavras: ['configurac', 'ajuste', 'modo escuro', 'tema escuro', 'tema claro', 'letra maior', 'aumentar a letra', 'tamanho da letra', 'tamanho do texto', 'fonte maior', 'velocidade da voz', 'voz mais devagar', 'desligar notificac', 'animac'],
    responder: () => ({
      texto: 'Em Configurações você escolhe o tema, aumenta o texto, reduz as animações, ajusta a voz e a velocidade da conversa por voz e decide quais avisos aparecem no sino.',
      link: { rotulo: 'Abrir configurações', para: '/configuracoes' },
    }),
  },
  {
    id: 'sobre',
    palavras: ['sobre o app', 'versao do app', 'que versao', 'quem fez', 'quem criou', 'quem desenvolveu', 'o que e a jornada', 'app oficial', 'licenca'],
    responder: () => ({
      texto: 'A Jornada é um protótipo do Challenge FIAP 2026 com a Unimed Nacional — não é o app oficial da Unimed, e os dados de consulta e exame são fictícios. A tela Sobre tem versão, equipe e licenças.',
      link: { rotulo: 'Sobre a Jornada', para: '/sobre' },
    }),
  },
  {
    id: 'atendente',
    palavras: ['atendente', 'human', 'pessoa de verdade', 'falar com alguem', 'whatsapp', 'central', 'robo', 'nao consegui resolver', 'fale conosco', 'ligar para', 'ligo pra'],
    responder: () => ({
      texto: 'Claro! Toque no botão para falar com uma pessoa do atendimento pelo WhatsApp. A conversa já abre com uma mensagem pronta, sem dado de saúde.',
      whatsapp: true,
    }),
  },
  {
    id: 'conversa_voz',
    palavras: ['por voz', 'converso', 'conversar com a assistente', 'falar com a assistente', 'voz da assistente', 'voz esta baixa', 'volume da voz', 'voz robotica', 'bolinha', 'microfone', 'ditado', 'voz baixa'],
    responder: () => ({
      texto: 'Toque na bolinha colorida (fica em todas as telas, ao lado do botão do Assistente) e fale: eu respondo falando e volto a ouvir. Diga "tchau" para encerrar.',
      itens: [
        'Voz baixa: aumente o volume de mídia do celular; no iPhone, confira também se o volume não está no mínimo com o app aberto',
        'Voz robótica: a voz natural pode estar desligada em Configurações, ou a internet falhou — o painel diz o motivo',
        'A transcrição do que você fala é feita pelo serviço de voz do navegador',
      ],
      link: { rotulo: 'Ajustar a voz', para: '/configuracoes' },
    }),
  },
  {
    id: 'wallet',
    palavras: ['wallet', 'carteira do iphone', 'carteira do celular', 'carteira da apple', 'apple wallet', 'google wallet', 'carteira digital', 'na carteira'],
    responder: () => ({
      texto: 'No celular, o Perfil tem o botão "Adicionar à Carteira" (no Android, "Adicionar ao Google Wallet"), embaixo da carteirinha e na tela cheia.',
      itens: [
        'Nesta versão é uma simulação: mostra como o cartão ficaria na Carteira, mas não adiciona nada',
        'No computador o botão não aparece, porque não há carteira para receber o cartão',
      ],
      link: { rotulo: 'Ver carteirinha', para: '/perfil' },
    }),
  },
  {
    id: 'sessao',
    palavras: ['deslog', 'sessao', 'me tirou do app', 'saiu sozinho', 'pediu login de novo', 'pede senha de novo', 'caiu a sessao', 'voltou para o login'],
    responder: () => ({
      texto: 'Por segurança, depois de 15 minutos sem uso a sessão cai e o app pede login de novo. Nesta demonstração, os dados também voltam ao estado inicial.',
      itens: ['Conversando por voz, cada troca conta como uso — a sessão não cai no meio da conversa'],
    }),
  },
  {
    id: 'fora_de_escopo',
    palavras: [
      'previsao do tempo', 'vai chover', 'clima', 'piada', 'ganhou o jogo', 'futebol', 'campeonato', 'imposto de renda', 'receita federal',
      'horoscopo', 'receita de bolo', 'cotacao', 'bitcoin', 'filme', 'musica', 'namorad',
    ],
    responder: () => ({
      texto: 'Sou o assistente da Jornada e ajudo com o seu plano de saúde — consultas, exames, resultados, encaminhamentos, rede credenciada e mensalidade. Esse assunto eu não sei responder, mas posso ajudar com algo do seu cuidado?',
      sugestoes: ['Minha próxima consulta', 'Meus resultados', 'O que você faz?'],
    }),
  },
  {
    id: 'elogio_reclamacao',
    palavras: [
      'parabens', 'muito bom', 'muito boa', 'adorei', 'gostei', 'amei', 'excelente', 'otimo', 'obrigad', 'insatisfeit', 'reclam',
      'pessim', 'horrivel', 'demorei', 'demorei muito', 'demora muito', 'nao gostei', 'ruim', 'decepcion', 'nao funciona',
    ],
    responder: (ctx, pergunta = '') => {
      const negativa = ['insatisfeit', 'reclam', 'pessim', 'horrivel', 'demorei', 'demora muito', 'nao gostei', 'ruim', 'decepcion', 'nao funciona'].some((t) => pergunta.includes(t));
      return negativa
        ? {
            texto: 'Sinto muito por isso. Para a sua reclamação ser registrada e acompanhada de verdade, fale com o atendimento — ele consegue ver o seu caso.',
            whatsapp: true,
          }
        : {
            texto: 'Obrigado pelo retorno! Se quiser deixar o elogio registrado para a equipe, o atendimento recebe pelo WhatsApp.',
            sugestoes: ['O que você faz?'],
          };
    },
  },
  {
    id: 'ajuda',
    palavras: ['ajuda', 'o que voce faz', 'menu', 'opcoes', 'o que voce sabe'],
    responder: () => ({
      texto: 'Pergunte do seu jeito, falando ou digitando. Sei responder sobre:',
      itens: [
        'Consultas e teleconsulta: próxima, especialidades, agendar, cancelar, remarcar, atraso',
        'Exames: agendar, preparo e jejum, prazo e resultados, laudo em PDF',
        'Encaminhamentos: o que são, validade e status',
        'Mensalidade: vencimento, formas de pagamento, atraso e histórico',
        'Carteirinha, Carteira do celular, dependentes, cobertura e cadastro',
        'Rede credenciada: unidade e hospital mais perto, tipos e CRM',
        'Seu perfil de saúde e o plano de cuidado',
        'Privacidade, quem vê seus resultados, modo Libras, voz, notificações e configurações',
      ],
      sugestoes: ['Minha próxima consulta', 'Preciso de um hospital', 'Falar com atendente'],
    }),
  },
];

// Em ordem: "desfaço o agendamento" é cancelar, não agendar; "agendar exame" antes de "agendar".
const ACOES_IDS = ['cancelar', 'agendar_exame', 'agendar', 'atraso'];
const ACOES = ACOES_IDS.map((id) => INTENCOES.find((i) => i.id === id));
const BASE_DE_REGRAS = [...INTENCOES, ...INTENCOES_SERVICOS, ...INTENCOES_PLANO, ...INTENCOES_APP].filter(
  (i) => !ACOES_IDS.includes(i.id),
);

const RESPOSTA_PADRAO = {
  texto: 'Ainda não sei responder isso. Posso tentar de outro jeito: pergunte sobre um destes assuntos, ou peça um atendente.',
  itens: ['Consultas e exames', 'Resultados e laudos', 'Encaminhamentos', 'Mensalidade', 'Rede credenciada', 'Carteirinha e cobertura'],
  whatsapp: true,
};

/** Segunda vez seguida sem entender: em vez de repetir a lista, oferece uma pessoa. */
const RESPOSTA_SEM_ENTENDER_DE_NOVO = {
  texto: 'Não consegui entender de novo, desculpe. Quer falar com uma pessoa do atendimento? É só tocar no botão do WhatsApp.',
  itens: [],
  whatsapp: true,
  sugestoes: ['Falar com atendente', 'O que você faz?'],
};

/**
 * Palavra de até 3 letras ("oi", "rg", "ubs", "crm") só vale como palavra inteira:
 * senão "oi" casaria com "foi" e "noite".
 */
function contem(texto, palavra) {
  if (palavra.length > 3) return texto.includes(palavra);
  return new RegExp(`(^|[^a-z0-9])${palavra}([^a-z0-9]|$)`).test(texto);
}

/** Soma o tamanho das palavras-chave que aparecem na pergunta. */
function pontuar(normalizada, intencao) {
  if (intencao.exceto?.some((termo) => normalizada.includes(termo))) return 0;
  if (intencao.exige && !intencao.exige.every((termo) => normalizada.includes(termo))) return 0;
  // "ignorar" tira só a expressão, e o resto da frase ainda conta: "dor no peito,
  // chama meu contato de emergência" continua sendo emergência.
  const texto = (intencao.ignorar ?? []).reduce((t, termo) => t.replaceAll(termo, ' '), normalizada);
  return intencao.palavras.reduce((total, palavra) => (contem(texto, palavra) ? total + palavra.length : total), 0);
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

function responderPergunta(texto, ctx, ultimaIntencao = null) {
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
  const resposta = intencao
    ? intencao.responder(ctx, normalizada)
    : ultimaIntencao === 'nao_entendida'
      ? RESPOSTA_SEM_ENTENDER_DE_NOVO
      : RESPOSTA_PADRAO;
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
      texto: `Olá, ${comoChamar(ctx.beneficiario)}! Sou o assistente da Jornada. Pode perguntar falando ou digitando — sobre consultas, exames, pagamento ou a rede.`,
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

/** @param opcoes.latenciaMs latência simulada; a conversa por voz usa menos, porque ali cada instante de espera é sentido. */
export function enviarPergunta(texto, { latenciaMs = 500 } = {}) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    const anterior = db.interacoesChatbot.findLast((i) => i.beneficiarioId === id);
    const resposta = responderPergunta(texto, montarContexto(db, id), anterior?.resposta?.intencao);
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
  }, latenciaMs);
}
