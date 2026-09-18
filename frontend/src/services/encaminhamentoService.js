import { getDb, porId } from './mockDb';
import { idLogado, simularRequisicao } from './http';

export function listarEncaminhamentos() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    return db.encaminhamentos
      .filter((e) => e.beneficiarioId === id)
      .sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao))
      .map((e) => {
        const especialidade = porId(db.especialidades, e.especialidadeDestinoId);
        const unidade = porId(db.unidades, e.unidadeDestinoId);
        return {
          id: e.id,
          especialidadeDestino: { id: especialidade.id, nome: especialidade.nome },
          medicoOrigem: e.medicoOrigem,
          especialidadeOrigem: e.especialidadeOrigem,
          unidadeDestino: { id: unidade.id, nome: unidade.nome, endereco: unidade.endereco },
          dataEmissao: e.dataEmissao,
          validade: e.validade,
          dataConclusao: e.dataConclusao,
          status: e.status,
          motivo: e.motivo,
        };
      });
  });
}
