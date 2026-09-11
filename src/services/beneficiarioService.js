import { getDb, porId } from './mockDb';
import { ApiError, idLogado, simularRequisicao } from './http';

/** DTO do beneficiário: nunca expõe senhaHash. */
export function paraBeneficiarioDTO(b) {
  return {
    id: b.id,
    nome: b.nome,
    cpf: b.cpf,
    cartaoSus: b.cartaoSus,
    dataNascimento: b.dataNascimento,
    email: b.email,
    telefone: b.telefone,
    plano: b.plano,
    titularidade: b.titularidade,
    carteirinha: b.carteirinha,
    segmento: b.segmento,
    condicaoCronica: b.condicaoCronica,
  };
}

export function obterPerfil() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    const beneficiario = porId(db.beneficiarios, id);
    if (!beneficiario) throw new ApiError('Beneficiário não encontrado.', 404);
    const doUsuario = (lista) => lista.filter((item) => item.beneficiarioId === id);
    return {
      ...paraBeneficiarioDTO(beneficiario),
      estatisticas: {
        consultas: doUsuario(db.consultas).filter((c) => c.status !== 'CANCELADA').length,
        exames: doUsuario(db.exames).length,
        encaminhamentos: doUsuario(db.encaminhamentos).length,
      },
    };
  });
}
