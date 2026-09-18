// Módulo "compartilhamento de resultados": quando um resultado de exame sai, quem vai
// atender o beneficiário em seguida já o encontra, sem papel e sem a pessoa precisar
// levar o laudo.
//
// Regra (determinística, calculada na leitura — por isso vale no instante em que o
// resultado é liberado):
// - entram os resultados LIBERADOS nos últimos JANELA_DIAS;
// - recebem acesso só os PRÓXIMOS atendimentos, um de cada tipo: a próxima consulta
//   (o médico), o próximo exame agendado (a equipe que vai realizá-lo) e o
//   encaminhamento em aberto que vence primeiro (o especialista — pelo nome, se já
//   houver consulta marcada na especialidade);
// - o acesso acaba sozinho quando o atendimento passa: ele deixa de ser "próximo".
//
// LGPD: resultado de exame é dado sensível (art. 11). O compartilhamento entre
// profissionais para a tutela da saúde tem base legal própria (art. 11, II, f), mas
// o app mostra quem vê o quê e deixa desligar em Configurações (art. 18). Nada
// daqui sai por WhatsApp. Numa API real, isto vira permissão no prontuário, com
// registro de cada abertura pelo profissional.
import { getDb, porId, salvar } from './mockDb';
import { ApiError, idLogado, simularRequisicao } from './http';
import { registrarEvento } from './segurancaService';
import { agoraLocalISO, toISODate } from '../utils/format';
import { FICA_ABERTA_MIN } from '../utils/teleconsulta';

export const JANELA_DIAS = 365;
const ATIVAS = ['AGENDADA', 'CONFIRMADA'];

function resultadosRecentes(db, beneficiarioId, hoje = new Date()) {
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() - JANELA_DIAS);
  const desde = toISODate(limite);
  return db.exames
    .filter((e) => e.beneficiarioId === beneficiarioId && e.status === 'DISPONIVEL')
    .map((e) => ({ exame: e, resultado: db.resultados.find((r) => r.exameId === e.id) }))
    .filter(({ resultado }) => resultado && resultado.dataDisponibilizacao >= desde)
    .sort((a, b) => b.resultado.dataDisponibilizacao.localeCompare(a.resultado.dataDisponibilizacao))
    .map(({ exame, resultado }) => ({
      exameId: exame.id,
      nome: porId(db.tiposExame, exame.tipoExameId).nome,
      liberadoEm: resultado.dataDisponibilizacao,
    }));
}

function proximosAtendimentos(db, beneficiarioId, agora = new Date()) {
  const agoraISO = agoraLocalISO(agora);
  // Teleconsulta em andamento ainda conta: o médico está com a sala aberta.
  const inicioDaTolerancia = agoraLocalISO(new Date(agora.getTime() - FICA_ABERTA_MIN * 60000));
  const destinos = [];

  const consultasFuturas = db.consultas
    .filter((c) => c.beneficiarioId === beneficiarioId && ATIVAS.includes(c.status))
    .filter((c) => c.dataHora >= (c.modalidade === 'TELECONSULTA' ? inicioDaTolerancia : agoraISO))
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora));

  const consulta = consultasFuturas[0];
  if (consulta) {
    const medico = porId(db.medicos, consulta.medicoId);
    const especialidade = porId(db.especialidades, medico.especialidadeId);
    destinos.push({
      chave: `consulta-${consulta.id}`,
      tipo: 'CONSULTA',
      referenciaId: consulta.id,
      profissional: medico.nome,
      detalhe: `${especialidade.nome} · ${consulta.modalidade === 'TELECONSULTA' ? 'teleconsulta' : 'consulta'}`,
      quando: consulta.dataHora,
      link: '/consultas',
    });
  }

  const exame = db.exames
    .filter((e) => e.beneficiarioId === beneficiarioId && e.status === 'AGUARDANDO' && e.dataAgendada && e.dataAgendada >= agoraISO)
    .sort((a, b) => a.dataAgendada.localeCompare(b.dataAgendada))[0];
  if (exame) {
    destinos.push({
      chave: `exame-${exame.id}`,
      tipo: 'EXAME',
      referenciaId: exame.id,
      profissional: `Equipe de ${porId(db.tiposExame, exame.tipoExameId).nome.toLowerCase()}`,
      detalhe: porId(db.unidades, exame.unidadeId).nome,
      quando: exame.dataAgendada,
      link: '/exames',
    });
  }

  const hoje = toISODate(agora);
  const encaminhamento = db.encaminhamentos
    .filter((e) => e.beneficiarioId === beneficiarioId && ['ATIVO', 'EM_PROCESSO'].includes(e.status) && e.validade >= hoje)
    .sort((a, b) => a.validade.localeCompare(b.validade))[0];
  if (encaminhamento) {
    const especialidade = porId(db.especialidades, encaminhamento.especialidadeDestinoId);
    const marcada = consultasFuturas.find((c) => porId(db.medicos, c.medicoId).especialidadeId === especialidade.id);
    destinos.push({
      chave: `encaminhamento-${encaminhamento.id}`,
      tipo: 'ENCAMINHAMENTO',
      referenciaId: encaminhamento.id,
      profissional: marcada ? porId(db.medicos, marcada.medicoId).nome : `Especialista em ${especialidade.nome.toLowerCase()}`,
      detalhe: `Encaminhamento · ${porId(db.unidades, encaminhamento.unidadeDestinoId).nome}`,
      quando: marcada?.dataHora ?? null,
      validade: encaminhamento.validade,
      link: '/encaminhamentos',
    });
  }
  return destinos;
}

async function beneficiarioLogado() {
  const db = await getDb();
  const beneficiario = porId(db.beneficiarios, idLogado());
  if (!beneficiario) throw new ApiError('Beneficiário não encontrado.', 404);
  return { db, beneficiario };
}

function montar(db, beneficiario) {
  const ativo = beneficiario.compartilharResultados !== false;
  const resultados = resultadosRecentes(db, beneficiario.id);
  return {
    ativo,
    janelaDias: JANELA_DIAS,
    resultados,
    // Desligado, ninguém recebe; a lista some para a tela não sugerir o contrário.
    destinos: ativo && resultados.length ? proximosAtendimentos(db, beneficiario.id) : [],
  };
}

/** Quem tem acesso aos resultados agora, e a quais. */
export function obterCompartilhamento() {
  return simularRequisicao(async () => {
    const { db, beneficiario } = await beneficiarioLogado();
    return montar(db, beneficiario);
  }, 200);
}

/** Recorte para a tela do laudo: este resultado está com quem? */
export function obterAcessoAoResultado(exameId) {
  return simularRequisicao(async () => {
    const { db, beneficiario } = await beneficiarioLogado();
    const exame = porId(db.exames, exameId);
    if (!exame || exame.beneficiarioId !== beneficiario.id) throw new ApiError('Exame não encontrado.', 404);
    const geral = montar(db, beneficiario);
    const incluido = geral.resultados.some((r) => r.exameId === exame.id);
    // Ainda em processamento: mostra quem vai receber assim que sair.
    const pendente = exame.status === 'AGUARDANDO';
    const destinos = geral.ativo && (incluido || pendente) ? proximosAtendimentos(db, beneficiario.id) : [];
    return { ativo: geral.ativo, incluido, pendente, janelaDias: JANELA_DIAS, destinos };
  }, 200);
}

export function definirCompartilhamento(ativo) {
  return simularRequisicao(async () => {
    const { db, beneficiario } = await beneficiarioLogado();
    beneficiario.compartilharResultados = Boolean(ativo);
    salvar(db);
    registrarEvento(ativo ? 'COMPARTILHAMENTO_LIGADO' : 'COMPARTILHAMENTO_DESLIGADO');
    return montar(db, beneficiario);
  }, 300);
}
