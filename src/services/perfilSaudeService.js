// Módulo "perfil de saúde": questionário do primeiro acesso e sua edição.
//
// O serviço não confia no que a tela manda: opção fora da lista é descartada,
// texto é aparado no limite e campo com formato inválido derruba a requisição
// (422), como faria a API. Assim a troca por backend não muda a regra.
import { getDb, porId, salvar } from './mockDb';
import { ApiError, idLogado, simularRequisicao } from './http';
import { paraBeneficiarioDTO, sincronizarSessao } from './beneficiarioService';
import { registrarEvento } from './segurancaService';
import { calcularSegmento } from '../utils/segmento';
import {
  CONDICOES_CRONICAS,
  EXCLUSIVAS,
  LIMITES_TEXTO,
  MULTIPLOS,
  OPCOES,
  PERFIL_VAZIO,
  UFS,
  calcularCompletude,
  formatarTelefone,
  numeroDecimal,
  validarPerfil,
} from '../utils/perfilSaude';

const CAMPOS_TEXTO = ['profissao', 'cidade', 'condicoesOutra', 'alergiasDetalhe', 'medicamentos', 'cirurgias', 'contatoNome', 'contatoParentesco'];

/** Tira caractere de controle e espaço sobrando; mantém quebra de linha. */
function limparTexto(valor, limite) {
  if (typeof valor !== 'string') return '';
  return valor
    // eslint-disable-next-line no-control-regex -- é exatamente o que se quer remover
    .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, limite);
}

function sanitizar(dados = {}) {
  const perfil = { ...PERFIL_VAZIO };

  Object.entries(OPCOES).forEach(([campo, lista]) => {
    const validos = lista.map((opcao) => opcao.valor);
    if (MULTIPLOS.includes(campo)) {
      let escolhidos = Array.isArray(dados[campo]) ? [...new Set(dados[campo].filter((v) => validos.includes(v)))] : [];
      // "Nenhuma" junto de outra escolha é contradição: vale a escolha concreta.
      const exclusiva = EXCLUSIVAS[campo];
      if (exclusiva && escolhidos.length > 1) escolhidos = escolhidos.filter((v) => v !== exclusiva);
      perfil[campo] = escolhidos;
    } else {
      perfil[campo] = validos.includes(dados[campo]) ? dados[campo] : null;
    }
  });

  CAMPOS_TEXTO.forEach((campo) => {
    perfil[campo] = limparTexto(dados[campo], LIMITES_TEXTO[campo]);
  });
  perfil.uf = UFS.includes(dados.uf) ? dados.uf : null;
  perfil.cep = String(dados.cep ?? '').replace(/\D/g, '').slice(0, 8);
  perfil.contatoTelefone = dados.contatoTelefone ? formatarTelefone(dados.contatoTelefone) : '';
  perfil.alturaCm = dados.alturaCm === '' || dados.alturaCm == null ? '' : numeroDecimal(dados.alturaCm);
  perfil.pesoKg = dados.pesoKg === '' || dados.pesoKg == null ? '' : Math.round(numeroDecimal(dados.pesoKg) * 10) / 10;

  // Texto de complemento só existe junto da escolha que ele complementa.
  if (!perfil.condicoes.includes('OUTRA')) perfil.condicoesOutra = '';
  if (!perfil.alergias.some((a) => a !== 'NENHUMA')) perfil.alergiasDetalhe = '';
  return perfil;
}

function montarDTO(beneficiario) {
  const perfil = { ...PERFIL_VAZIO, ...(beneficiario.perfilSaude ?? {}) };
  return {
    nome: beneficiario.nome,
    nomePreferido: beneficiario.nomePreferido ?? '',
    telefone: beneficiario.telefone ?? '',
    perfil,
    questionario: beneficiario.questionario?.status ?? 'PENDENTE',
    atualizadoEm: beneficiario.perfilSaudeAtualizadoEm ?? null,
    completude: calcularCompletude(perfil, { nomePreferido: beneficiario.nomePreferido }),
    segmento: beneficiario.segmento,
  };
}

async function beneficiarioLogado() {
  const db = await getDb();
  const beneficiario = porId(db.beneficiarios, idLogado());
  if (!beneficiario) throw new ApiError('Beneficiário não encontrado.', 404);
  return { db, beneficiario };
}

function gravar(db, beneficiario) {
  salvar(db);
  sincronizarSessao(paraBeneficiarioDTO(beneficiario));
  return montarDTO(beneficiario);
}

export function obterPerfilSaude() {
  return simularRequisicao(async () => montarDTO((await beneficiarioLogado()).beneficiario), 200);
}

/**
 * Salva o que foi preenchido — mesmo incompleto.
 * @param dados {{ nomePreferido, telefone, perfil }}
 * @param opcoes.status 'CONCLUIDO' ao terminar o questionário; 'ADIADO' ao pular.
 */
export function salvarPerfilSaude(dados, { status = null } = {}) {
  return simularRequisicao(async () => {
    const primeiroErro = Object.values(validarPerfil(dados))[0];
    if (primeiroErro) throw new ApiError(primeiroErro, 422);

    const { db, beneficiario } = await beneficiarioLogado();
    const perfil = sanitizar(dados.perfil);
    beneficiario.perfilSaude = perfil;
    beneficiario.perfilSaudeAtualizadoEm = new Date().toISOString();
    beneficiario.nomePreferido = limparTexto(dados.nomePreferido, LIMITES_TEXTO.nomePreferido) || null;
    beneficiario.telefone = dados.telefone ? formatarTelefone(dados.telefone) : null;

    // O perfil de cuidado acompanha o que a pessoa declarou: é o que muda o
    // lembrete da Home e os fatores do plano de cuidado.
    if (perfil.condicoes.includes('NENHUMA')) beneficiario.condicaoCronica = false;
    else if (perfil.condicoes.some((c) => CONDICOES_CRONICAS.includes(c))) beneficiario.condicaoCronica = true;
    beneficiario.segmento = calcularSegmento(beneficiario);

    const atual = beneficiario.questionario?.status ?? 'PENDENTE';
    if (status === 'CONCLUIDO' || (status === 'ADIADO' && atual !== 'CONCLUIDO')) {
      beneficiario.questionario = { status, em: new Date().toISOString() };
    }

    registrarEvento('PERFIL_SAUDE_ATUALIZADO');
    return gravar(db, beneficiario);
  }, 500);
}

/** "Responder depois": o app para de abrir o questionário no login. */
export function adiarQuestionario() {
  return simularRequisicao(async () => {
    const { db, beneficiario } = await beneficiarioLogado();
    if ((beneficiario.questionario?.status ?? 'PENDENTE') === 'PENDENTE') {
      beneficiario.questionario = { status: 'ADIADO', em: new Date().toISOString() };
    }
    return gravar(db, beneficiario);
  }, 200);
}

/**
 * Direito de exclusão (LGPD art. 18, VI) para o dado sensível: apaga o perfil de
 * saúde e devolve o perfil de cuidado ao que foi declarado no cadastro.
 */
export function apagarPerfilSaude() {
  return simularRequisicao(async () => {
    const { db, beneficiario } = await beneficiarioLogado();
    beneficiario.perfilSaude = null;
    beneficiario.perfilSaudeAtualizadoEm = null;
    beneficiario.nomePreferido = null;
    beneficiario.condicaoCronica = Boolean(beneficiario.condicaoCronicaDeclarada);
    beneficiario.segmento = calcularSegmento(beneficiario);
    beneficiario.questionario = { status: 'ADIADO', em: new Date().toISOString() };
    registrarEvento('PERFIL_SAUDE_APAGADO');
    return gravar(db, beneficiario);
  }, 400);
}
