import { getDb, proximoId, restaurarDadosDemo, salvar } from './mockDb';
import { ApiError, gravarSessao, lerSessao, limparSessao, simularRequisicao } from './http';
import { paraBeneficiarioDTO } from './beneficiarioService';
import { criarNotificacao } from './notificacaoService';
import {
  estadoBloqueio,
  limparRastros,
  limparTentativas,
  minutosRestantes,
  ociosoDemais,
  registrarAtividade,
  registrarEvento,
  registrarFalha,
} from './segurancaService';
import { hashSenha } from '../utils/crypto';
import { somenteDigitos } from '../utils/format';
import { calcularSegmento } from '../utils/segmento';

const DURACAO_SESSAO_S = 8 * 60 * 60;

// Token no formato JWT só para a sessão ter a mesma forma da real. Não é assinado:
// no backend, o token vem do Spring Security e é validado no servidor.
function gerarToken(beneficiario) {
  const codificar = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + DURACAO_SESSAO_S;
  return `${codificar({ alg: 'none', typ: 'JWT' })}.${codificar({ sub: beneficiario.id, papel: 'BENEFICIARIO', exp })}.mock`;
}

function abrirSessao(beneficiario) {
  const sessao = { token: gerarToken(beneficiario), beneficiario: paraBeneficiarioDTO(beneficiario) };
  gravarSessao(sessao);
  registrarAtividade();
  return sessao;
}

/**
 * Devolve o app ao estado de primeira execução: sem sessão, sem rastros de uso e
 * com os dados de demonstração recriados.
 *
 * É o que roda quando a sessão expira por inatividade. Como a marca de atividade
 * fica no dispositivo, isso vale também entre uma abertura e outra do app — cada
 * apresentação começa com a Ana igual à primeira vez, sem consulta marcada no
 * teste anterior nem notificação já lida.
 */
export function reiniciarDemonstracao() {
  limparSessao();
  limparRastros();
  return restaurarDadosDemo();
}

export function getSessao() {
  // Inatividade longa (app fechado incluído) encerra a sessão e zera a demonstração.
  if (ociosoDemais()) {
    reiniciarDemonstracao();
    return null;
  }
  const sessao = lerSessao();
  if (!sessao?.token) return null;
  try {
    const { exp } = JSON.parse(atob(sessao.token.split('.')[1]));
    if (exp * 1000 < Date.now()) {
      limparSessao();
      return null;
    }
  } catch {
    limparSessao();
    return null;
  }
  return sessao;
}

export function login({ identificador, senha }) {
  return simularRequisicao(async () => {
    const bloqueio = estadoBloqueio(identificador);
    if (bloqueio.bloqueado) {
      throw new ApiError(`Muitas tentativas incorretas. Tente novamente em ${minutosRestantes(bloqueio.restanteMs)} min.`, 429);
    }

    const db = await getDb();
    const termo = identificador.trim().toLowerCase();
    const cpf = somenteDigitos(termo);
    const beneficiario = db.beneficiarios.find(
      (b) => b.email.toLowerCase() === termo || (cpf.length === 11 && b.cpf === cpf),
    );
    const hash = await hashSenha(senha);

    if (!beneficiario || beneficiario.senhaHash !== hash) {
      const estado = registrarFalha(identificador);
      registrarEvento('LOGIN_FALHA');
      if (estado.bloqueado) {
        registrarEvento('BLOQUEIO');
        throw new ApiError(`Muitas tentativas incorretas. Acesso bloqueado por ${minutosRestantes(estado.restanteMs)} min.`, 429);
      }
      // Mensagem igual para conta inexistente e senha errada: não revela se o
      // e-mail/CPF está cadastrado, evitando enumeração de contas.
      const aviso = estado.restantes <= 2 ? (estado.restantes === 1 ? ' Resta 1 tentativa.' : ` Restam ${estado.restantes} tentativas.`) : '';
      throw new ApiError(`E-mail/CPF ou senha incorretos.${aviso}`, 401);
    }

    limparTentativas(identificador);
    registrarEvento('LOGIN_OK');
    return abrirSessao(beneficiario);
  }, 600);
}

export function cadastrar({ nome, cpf, dataNascimento, email, telefone, senha, condicaoCronica, consentimentoLgpd }) {
  return simularRequisicao(async () => {
    if (!consentimentoLgpd) throw new ApiError('É necessário aceitar o termo de tratamento de dados.', 422);
    const db = await getDb();
    const cpfLimpo = somenteDigitos(cpf);
    const emailLimpo = email.trim().toLowerCase();
    if (db.beneficiarios.some((b) => b.cpf === cpfLimpo)) {
      throw new ApiError('Já existe uma conta com este CPF.', 409);
    }
    if (db.beneficiarios.some((b) => b.email.toLowerCase() === emailLimpo)) {
      throw new ApiError('Já existe uma conta com este e-mail.', 409);
    }

    const beneficiario = {
      id: proximoId(db, 'beneficiarios'),
      nome: nome.trim(),
      cpf: cpfLimpo,
      cartaoSus: null,
      dataNascimento,
      email: emailLimpo,
      telefone: telefone?.trim() || null,
      plano: 'Unimed Familiar',
      titularidade: 'Titular',
      carteirinha: `1234 ${String(Date.now()).slice(-12).replace(/(\d{4})(?=\d)/g, '$1 ')}`,
      segmento: calcularSegmento({ dataNascimento, condicaoCronica }),
      condicaoCronica: Boolean(condicaoCronica),
      condicaoCronicaDeclarada: Boolean(condicaoCronica),
      fotoUrl: null,
      nomePreferido: null,
      perfilSaude: null,
      perfilSaudeAtualizadoEm: null,
      questionario: { status: 'PENDENTE', em: null },
      consentimentoLgpdEm: new Date().toISOString(),
      senhaHash: await hashSenha(senha),
    };
    db.beneficiarios.push(beneficiario);
    criarNotificacao(db, beneficiario.id, {
      tipo: 'SISTEMA',
      titulo: 'Boas-vindas à Jornada!',
      mensagem: 'Sua conta foi criada. Que tal agendar seu primeiro check-up?',
      link: '/consultas/agendar',
    });
    salvar(db);
    registrarEvento('CADASTRO');
    return abrirSessao(beneficiario);
  }, 800);
}

/** @param motivo LOGOUT | SESSAO_EXPIRADA | DADOS_APAGADOS — fica na trilha de auditoria. */
export function logout(motivo = 'LOGOUT') {
  limparSessao();
  registrarEvento(motivo);
}
