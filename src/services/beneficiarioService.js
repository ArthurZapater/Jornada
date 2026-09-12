import { getDb, porId, salvar } from './mockDb';
import { ApiError, gravarSessao, idLogado, lerSessao, simularRequisicao } from './http';
import { registrarEvento } from './segurancaService';

/** Tamanho máximo do data URL guardado (a foto já vem reduzida de utils/imagem.js). */
const LIMITE_FOTO_BYTES = 400 * 1024;

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
    fotoUrl: b.fotoUrl ?? null,
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

/** Mantém a sessão (que alimenta o avatar do cabeçalho) igual ao banco. */
function sincronizarSessao(dto) {
  const sessao = lerSessao();
  if (sessao) gravarSessao({ ...sessao, beneficiario: dto });
}

async function gravarFoto(fotoUrl) {
  const db = await getDb();
  const beneficiario = porId(db.beneficiarios, idLogado());
  if (!beneficiario) throw new ApiError('Beneficiário não encontrado.', 404);
  beneficiario.fotoUrl = fotoUrl;
  salvar(db);
  const dto = paraBeneficiarioDTO(beneficiario);
  sincronizarSessao(dto);
  return dto;
}

/**
 * Salva a foto de perfil já processada por `prepararFotoPerfil`.
 * Só aceita JPEG embutido: o navegador nunca envia o arquivo original daqui.
 */
export function atualizarFoto(fotoUrl) {
  return simularRequisicao(async () => {
    if (typeof fotoUrl !== 'string' || !fotoUrl.startsWith('data:image/jpeg;base64,')) {
      throw new ApiError('Formato de imagem não suportado.', 422);
    }
    if (fotoUrl.length > LIMITE_FOTO_BYTES) throw new ApiError('Imagem muito grande para ser salva.', 413);
    const dto = await gravarFoto(fotoUrl);
    registrarEvento('FOTO_ATUALIZADA');
    return dto;
  }, 500);
}

export function removerFoto() {
  return simularRequisicao(async () => {
    const dto = await gravarFoto(null);
    registrarEvento('FOTO_REMOVIDA');
    return dto;
  });
}
