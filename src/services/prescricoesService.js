import { ApiError, idLogado, simularRequisicao } from './http';
import { getDb, salvar } from './mockDb';
import { registrarEvento } from './segurancaService';

const JANELA_ACESSO_MS = 15 * 60 * 1000;
const ORIGENS = { CONSULTA: 'Consulta', EXAME: 'Após exame', PRONTO_SOCORRO: 'Pronto-socorro', OUTRO: 'Outro' };
const novoId = () => globalThis.crypto?.randomUUID?.() ?? `prescricao-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const dataValida = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(new Date(`${valor}T12:00:00`).getTime());

function dto(prescricao) {
  const acessoExpirado = !prescricao.acessoValidoAte || new Date(prescricao.acessoValidoAte) <= new Date();
  return { ...prescricao, origemRotulo: ORIGENS[prescricao.origem] ?? ORIGENS.OUTRO, acessoExpirado };
}

export function listarPrescricoes() {
  return simularRequisicao(async () => {
    const db = await getDb();
    return db.prescricoes.filter((p) => p.beneficiarioId === idLogado()).map(dto).sort((a, b) => b.dataAtendimento.localeCompare(a.dataAtendimento));
  }, 180);
}

export function obterPrescricao(id) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const prescricao = db.prescricoes.find((p) => p.id === id && p.beneficiarioId === idLogado());
    if (!prescricao) throw new ApiError('Prescrição não encontrada.', 404);
    if (!prescricao.acessoValidoAte || new Date(prescricao.acessoValidoAte) <= new Date()) throw new ApiError('O acesso a este documento expirou. Renove para visualizar.', 403);
    registrarEvento('PRESCRICAO_VISUALIZADA', prescricao.titulo);
    return dto(prescricao);
  });
}

export function renovarAcessoPrescricao(id) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const prescricao = db.prescricoes.find((p) => p.id === id && p.beneficiarioId === idLogado());
    if (!prescricao) throw new ApiError('Prescrição não encontrada.', 404);
    prescricao.acessoValidoAte = new Date(Date.now() + JANELA_ACESSO_MS).toISOString();
    salvar(db);
    registrarEvento('PRESCRICAO_ACESSO_RENOVADO', prescricao.titulo);
    return dto(prescricao);
  });
}

export function criarPrescricao(dados) {
  return simularRequisicao(async () => {
    const titulo = String(dados.titulo ?? '').trim();
    const profissional = String(dados.profissional ?? '').trim();
    const local = String(dados.local ?? '').trim();
    if (!titulo || titulo.length > 100 || !profissional || profissional.length > 100 || !local || local.length > 140) throw new ApiError('Preencha título, profissional e local respeitando os limites.', 422);
    if (!dataValida(dados.dataAtendimento) || !dataValida(dados.validadeAte) || dados.validadeAte < dados.dataAtendimento) throw new ApiError('Confira as datas da prescrição.', 422);
    const medicamentos = Array.isArray(dados.medicamentos) ? dados.medicamentos.map((m) => ({ nome: String(m.nome ?? '').trim(), posologia: String(m.posologia ?? '').trim(), duracao: String(m.duracao ?? '').trim() })).filter((m) => m.nome) : [];
    if (!medicamentos.length || medicamentos.some((m) => m.nome.length > 100 || m.posologia.length > 160 || m.duracao.length > 60)) throw new ApiError('Informe ao menos um medicamento e seus dados.', 422);
    const db = await getDb();
    const prescricao = { id: novoId(), beneficiarioId: idLogado(), titulo, origem: ORIGENS[dados.origem] ? dados.origem : 'OUTRO', dataAtendimento: dados.dataAtendimento, profissional, registroProfissional: String(dados.registroProfissional ?? '').trim().slice(0, 60), local, medicamentos, validadeAte: dados.validadeAte, arquivoNome: String(dados.arquivoNome ?? '').trim().slice(0, 120) || null, observacoes: String(dados.observacoes ?? '').trim().slice(0, 500), acessoValidoAte: new Date(Date.now() + JANELA_ACESSO_MS).toISOString(), criadaEm: new Date().toISOString() };
    db.prescricoes.push(prescricao); salvar(db); registrarEvento('PRESCRICAO_CRIADA', titulo); return dto(prescricao);
  });
}

export { ORIGENS };
