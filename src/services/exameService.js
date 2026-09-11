import { getDb, porId } from './mockDb';
import { ApiError, idLogado, simularRequisicao } from './http';
import { normalizar } from '../utils/format';

export function paraExameDTO(db, exame) {
  const tipo = porId(db.tiposExame, exame.tipoExameId);
  const unidade = porId(db.unidades, exame.unidadeId);
  const resultado = db.resultados.find((r) => r.exameId === exame.id) ?? null;
  return {
    id: exame.id,
    tipoExame: { id: tipo.id, nome: tipo.nome, categoria: tipo.categoria, preparo: tipo.preparo },
    unidade: { id: unidade.id, nome: unidade.nome, endereco: unidade.endereco },
    medicoSolicitante: exame.medicoSolicitante,
    dataSolicitacao: exame.dataSolicitacao,
    dataAgendada: exame.dataAgendada,
    dataRealizacao: exame.dataRealizacao,
    status: exame.status,
    resultado: resultado && {
      id: resultado.id,
      laudo: resultado.laudo,
      itens: resultado.itens,
      responsavel: resultado.responsavel,
      arquivoUrl: resultado.arquivoUrl,
      dataDisponibilizacao: resultado.dataDisponibilizacao,
    },
  };
}

const dataReferencia = (e) => e.dataRealizacao ?? e.dataAgendada ?? e.dataSolicitacao;

export function listarExames({ busca = '', status = 'TODOS' } = {}) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    const termo = normalizar(busca);
    return db.exames
      .filter((e) => e.beneficiarioId === id)
      .filter((e) => status === 'TODOS' || e.status === status)
      .map((e) => paraExameDTO(db, e))
      .filter((e) => !termo || normalizar(`${e.tipoExame.nome} ${e.unidade.nome}`).includes(termo))
      .sort((a, b) => dataReferencia(b).localeCompare(dataReferencia(a)));
  }, 250);
}

export function obterExame(exameId) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const exame = porId(db.exames, exameId);
    if (!exame || exame.beneficiarioId !== idLogado()) throw new ApiError('Exame não encontrado.', 404);
    return paraExameDTO(db, exame);
  });
}
