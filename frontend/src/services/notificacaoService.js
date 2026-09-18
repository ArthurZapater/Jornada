import { getDb, proximoId, salvar } from './mockDb';
import { idLogado, simularRequisicao } from './http';

/** Uso interno dos outros services (equivale a um evento de domínio no backend). */
export function criarNotificacao(db, beneficiarioId, { tipo, titulo, mensagem, link = null }) {
  db.notificacoes.push({
    id: proximoId(db, 'notificacoes'),
    beneficiarioId,
    tipo,
    titulo,
    mensagem,
    link,
    lida: false,
    dataCriacao: new Date().toISOString(),
  });
}

export function listarNotificacoes() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    return db.notificacoes
      .filter((n) => n.beneficiarioId === id)
      .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao));
  }, 150);
}

export function marcarComoLida(notificacaoId) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    const notificacao = db.notificacoes.find((n) => n.id === notificacaoId && n.beneficiarioId === id);
    if (notificacao) {
      notificacao.lida = true;
      salvar(db);
    }
  }, 100);
}

export function marcarTodasComoLidas() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    db.notificacoes.filter((n) => n.beneficiarioId === id).forEach((n) => (n.lida = true));
    salvar(db);
  }, 150);
}
