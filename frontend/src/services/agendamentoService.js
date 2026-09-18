// Módulo "agendamento" (consulta e exame), espelhando com.unimed.jornada.agendamento.
import { LOCALIZACAO_USUARIO, getDb, porId, proximoId, salvar } from './mockDb';
import { ApiError, idLogado, simularRequisicao } from './http';
import { criarNotificacao } from './notificacaoService';
import { paraExameDTO } from './exameService';
import { diasDisponiveisNoMes, horariosDisponiveis } from '../utils/disponibilidade';
import { agoraLocalISO, formatarData, toISODate } from '../utils/format';
import { MODALIDADES } from '../utils/teleconsulta';
import { distanciaKm } from '../utils/geo';

const ATIVAS = ['AGENDADA', 'CONFIRMADA'];

function paraUnidadeDTO(u) {
  return {
    id: u.id,
    nome: u.nome,
    tipo: u.tipo,
    descricao: u.descricao,
    endereco: u.endereco,
    cidade: u.cidade,
    uf: u.uf,
    distanciaKm: distanciaKm(LOCALIZACAO_USUARIO, u),
  };
}

function paraMedicoDTO(db, m) {
  const especialidade = porId(db.especialidades, m.especialidadeId);
  return {
    id: m.id,
    nome: m.nome,
    crm: m.crm,
    especialidade: { id: especialidade.id, nome: especialidade.nome, teleconsulta: Boolean(especialidade.teleconsulta) },
    unidades: m.unidadeIds.map((id) => ({ id, nome: porId(db.unidades, id).nome })),
  };
}

function paraConsultaDTO(db, c) {
  const medico = porId(db.medicos, c.medicoId);
  const especialidade = porId(db.especialidades, medico.especialidadeId);
  return {
    id: c.id,
    dataHora: c.dataHora,
    status: c.status,
    modalidade: c.modalidade ?? 'PRESENCIAL',
    medico: { id: medico.id, nome: medico.nome, crm: medico.crm },
    especialidade: { id: especialidade.id, nome: especialidade.nome },
    // Teleconsulta não tem unidade: quem mostra endereço precisa checar a modalidade.
    unidade: c.unidadeId ? paraUnidadeDTO(porId(db.unidades, c.unidadeId)) : null,
  };
}

// --- Catálogos -------------------------------------------------------------

export function listarEspecialidades() {
  return simularRequisicao(async () => (await getDb()).especialidades, 200);
}

export function listarMedicos(especialidadeId) {
  return simularRequisicao(async () => {
    const db = await getDb();
    return db.medicos
      .filter((m) => m.especialidadeId === Number(especialidadeId))
      .map((m) => paraMedicoDTO(db, m));
  }, 250);
}

export function obterMedico(medicoId) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const medico = porId(db.medicos, medicoId);
    if (!medico) throw new ApiError('Médico não encontrado.', 404);
    return paraMedicoDTO(db, medico);
  }, 150);
}

export function listarTiposExame() {
  return simularRequisicao(async () => (await getDb()).tiposExame, 200);
}

export function obterTipoExame(tipoExameId) {
  return simularRequisicao(async () => {
    const tipo = porId((await getDb()).tiposExame, tipoExameId);
    if (!tipo) throw new ApiError('Tipo de exame não encontrado.', 404);
    return tipo;
  }, 150);
}

/** Unidades que atendem o médico ou realizam o tipo de exame, da mais próxima para a mais distante. */
export function listarUnidades({ medicoId, tipoExameId } = {}) {
  return simularRequisicao(async () => {
    const db = await getDb();
    let ids = db.unidades.map((u) => u.id);
    if (medicoId) ids = porId(db.medicos, medicoId)?.unidadeIds ?? [];
    if (tipoExameId) ids = porId(db.tiposExame, tipoExameId)?.unidadeIds ?? [];
    return ids
      .map((id) => paraUnidadeDTO(porId(db.unidades, id)))
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  }, 250);
}

// --- Disponibilidade ---------------------------------------------------------

/** Teleconsulta usa a agenda "online" do médico (unidadeId nulo). */
const chaveAgenda = (tipo, recursoId, unidadeId) => `${tipo}-${recursoId}-${unidadeId ?? 'online'}`;

function horariosOcupados(db, tipo, recursoId, dataISO) {
  if (tipo !== 'consulta') return [];
  return db.consultas
    .filter((c) => c.medicoId === Number(recursoId) && ATIVAS.includes(c.status) && c.dataHora.startsWith(dataISO))
    .map((c) => c.dataHora.slice(11, 16));
}

/** @param tipo 'consulta' (recursoId = médico) | 'exame' (recursoId = tipo de exame) */
export function listarDiasDisponiveis({ tipo, recursoId, unidadeId, ano, mes }) {
  return simularRequisicao(async () => {
    const db = await getDb();
    return diasDisponiveisNoMes(chaveAgenda(tipo, recursoId, unidadeId), ano, mes, (dia) =>
      horariosOcupados(db, tipo, recursoId, dia),
    );
  }, 200);
}

export function listarHorarios({ tipo, recursoId, unidadeId, data }) {
  return simularRequisicao(async () => {
    const db = await getDb();
    return horariosDisponiveis(chaveAgenda(tipo, recursoId, unidadeId), data, horariosOcupados(db, tipo, recursoId, data));
  }, 200);
}

function garantirHorarioLivre(db, tipo, recursoId, unidadeId, data, horario) {
  const livres = horariosDisponiveis(chaveAgenda(tipo, recursoId, unidadeId), data, horariosOcupados(db, tipo, recursoId, data));
  if (!livres.includes(horario)) throw new ApiError('Este horário acabou de ser ocupado. Escolha outro.', 409);
}

// --- Consultas -------------------------------------------------------------

export function agendarConsulta({ medicoId, modalidade = 'PRESENCIAL', unidadeId, data, horario }) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const beneficiarioId = idLogado();
    if (!MODALIDADES[modalidade]) throw new ApiError('Modalidade de consulta inválida.', 422);
    const tele = modalidade === 'TELECONSULTA';
    const medico = porId(db.medicos, medicoId);
    if (!medico) throw new ApiError('Médico não encontrado.', 404);
    const unidade = tele ? null : porId(db.unidades, unidadeId);
    if (tele) {
      if (!porId(db.especialidades, medico.especialidadeId)?.teleconsulta) {
        throw new ApiError('Esta especialidade atende só presencialmente.', 422);
      }
    } else {
      if (!unidade) throw new ApiError('Unidade não encontrada.', 404);
      if (!medico.unidadeIds.includes(unidade.id)) throw new ApiError('O médico não atende nesta unidade.', 422);
    }
    garantirHorarioLivre(db, 'consulta', medico.id, unidade?.id ?? null, data, horario);

    const dataHora = `${data}T${horario}`;
    const conflito = db.consultas.some(
      (c) => c.beneficiarioId === beneficiarioId && ATIVAS.includes(c.status) && c.dataHora === dataHora,
    );
    if (conflito) throw new ApiError('Você já tem uma consulta neste mesmo horário.', 409);

    const consulta = { id: proximoId(db, 'consultas'), beneficiarioId, medicoId: medico.id, modalidade, unidadeId: unidade?.id ?? null, dataHora, status: 'AGENDADA' };
    db.consultas.push(consulta);
    criarNotificacao(db, beneficiarioId, {
      tipo: 'CONSULTA',
      titulo: tele ? 'Teleconsulta agendada' : 'Consulta agendada',
      mensagem: tele
        ? `${medico.nome} — ${formatarData(data)} às ${horario}, por vídeo. A sala abre 15 min antes.`
        : `${medico.nome} — ${formatarData(data)} às ${horario}, ${unidade.nome}.`,
      link: '/consultas',
    });
    salvar(db);
    return paraConsultaDTO(db, consulta);
  }, 700);
}

export function listarConsultas() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    return db.consultas
      .filter((c) => c.beneficiarioId === id)
      .map((c) => paraConsultaDTO(db, c))
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  });
}

export function obterConsulta(consultaId) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const consulta = porId(db.consultas, consultaId);
    if (!consulta || consulta.beneficiarioId !== idLogado()) throw new ApiError('Consulta não encontrada.', 404);
    return paraConsultaDTO(db, consulta);
  }, 200);
}

export function listarProximasConsultas(limite = 2) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    const agora = agoraLocalISO();
    return db.consultas
      .filter((c) => c.beneficiarioId === id && ATIVAS.includes(c.status) && c.dataHora >= agora)
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora))
      .slice(0, limite)
      .map((c) => paraConsultaDTO(db, c));
  });
}

export function cancelarConsulta(consultaId) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const consulta = porId(db.consultas, consultaId);
    if (!consulta || consulta.beneficiarioId !== idLogado()) throw new ApiError('Consulta não encontrada.', 404);
    if (!ATIVAS.includes(consulta.status)) throw new ApiError('Esta consulta não pode mais ser cancelada.', 422);
    consulta.status = 'CANCELADA';
    salvar(db);
    return paraConsultaDTO(db, consulta);
  }, 500);
}

// --- Exames ----------------------------------------------------------------

export function agendarExame({ tipoExameId, unidadeId, data, horario }) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const beneficiarioId = idLogado();
    const tipo = porId(db.tiposExame, tipoExameId);
    const unidade = porId(db.unidades, unidadeId);
    if (!tipo || !unidade) throw new ApiError('Exame ou unidade não encontrados.', 404);
    if (!tipo.unidadeIds.includes(unidade.id)) throw new ApiError('Esta unidade não realiza o exame escolhido.', 422);
    garantirHorarioLivre(db, 'exame', tipo.id, unidade.id, data, horario);

    const exame = {
      id: proximoId(db, 'exames'),
      beneficiarioId,
      tipoExameId: tipo.id,
      unidadeId: unidade.id,
      medicoSolicitante: null,
      dataSolicitacao: toISODate(new Date()),
      dataAgendada: `${data}T${horario}`,
      dataRealizacao: null,
      status: 'AGUARDANDO',
    };
    db.exames.push(exame);
    criarNotificacao(db, beneficiarioId, {
      tipo: 'EXAME',
      titulo: 'Exame agendado',
      mensagem: `${tipo.nome} — ${formatarData(data)} às ${horario}, ${unidade.nome}.`,
      link: '/exames',
    });
    salvar(db);
    return paraExameDTO(db, exame);
  }, 700);
}

export function listarExamesAgendados() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    const agora = agoraLocalISO();
    return db.exames
      .filter((e) => e.beneficiarioId === id && e.status === 'AGUARDANDO' && e.dataAgendada && e.dataAgendada >= agora)
      .sort((a, b) => a.dataAgendada.localeCompare(b.dataAgendada))
      .map((e) => paraExameDTO(db, e));
  });
}
