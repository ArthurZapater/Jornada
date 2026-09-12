// Modulo "seguranca" (espelha com.unimed.jornada.seguranca): controle de acesso,
// auditoria LGPD e ciclo de vida da sessao.
//
// LIMITE HONESTO DESTA CAMADA: sem backend, tudo aqui roda no navegador do
// proprio usuario e serve para proteger a sessao no dispositivo (uso indevido do
// aparelho, sessao esquecida aberta, forca bruta na tela de login). Nao substitui
// as protecoes de servidor. Quando o backend Spring entrar, estas mesmas regras
// passam a ser validadas la, com rate limit por IP e auditoria no banco.
import { ler, gravar, remover } from '../utils/storage';

const CHAVE_TENTATIVAS = 'jornada:tentativas-login';
const CHAVE_AUDITORIA = 'jornada:auditoria';
const CHAVE_ATIVIDADE = 'jornada:ultima-atividade';

/** Tentativas de login antes do bloqueio temporario. */
export const MAX_TENTATIVAS = 5;
/** Duracao do bloqueio apos estourar as tentativas. */
export const BLOQUEIO_MS = 5 * 60 * 1000;
/** Inatividade que encerra a sessao automaticamente. */
export const INATIVIDADE_MS = 15 * 60 * 1000;
/** Quantos eventos de auditoria ficam guardados no dispositivo. */
const LIMITE_EVENTOS = 20;

export const EVENTOS = {
  LOGIN_OK: { rotulo: 'Acesso realizado', nivel: 'ok' },
  LOGIN_FALHA: { rotulo: 'Tentativa de acesso incorreta', nivel: 'alerta' },
  BLOQUEIO: { rotulo: 'Acesso bloqueado por tentativas', nivel: 'alerta' },
  CADASTRO: { rotulo: 'Conta criada', nivel: 'ok' },
  LOGOUT: { rotulo: 'Sessao encerrada', nivel: 'neutro' },
  SESSAO_EXPIRADA: { rotulo: 'Sessao encerrada por inatividade', nivel: 'neutro' },
  DADOS_APAGADOS: { rotulo: 'Dados locais apagados', nivel: 'neutro' },
  FOTO_ATUALIZADA: { rotulo: 'Foto de perfil atualizada', nivel: 'neutro' },
  FOTO_REMOVIDA: { rotulo: 'Foto de perfil removida', nivel: 'neutro' },
  LOCALIZACAO_USADA: { rotulo: 'Localizacao usada para buscar a rede', nivel: 'neutro' },
};

// --- Bloqueio por tentativas ------------------------------------------------

const chaveDe = (identificador = '') => identificador.trim().toLowerCase();

/** @returns {{bloqueado: boolean, restanteMs: number, tentativas: number, restantes: number}} */
export function estadoBloqueio(identificador, agora = Date.now()) {
  const registro = ler(CHAVE_TENTATIVAS, {})[chaveDe(identificador)];
  if (!registro) return { bloqueado: false, restanteMs: 0, tentativas: 0, restantes: MAX_TENTATIVAS };
  const restanteMs = Math.max(0, (registro.bloqueadoAte ?? 0) - agora);
  return {
    bloqueado: restanteMs > 0,
    restanteMs,
    tentativas: registro.tentativas,
    restantes: Math.max(0, MAX_TENTATIVAS - registro.tentativas),
  };
}

export function registrarFalha(identificador, agora = Date.now()) {
  const chave = chaveDe(identificador);
  const mapa = ler(CHAVE_TENTATIVAS, {});
  const anterior = mapa[chave];
  // Bloqueio vencido zera a contagem.
  const base = anterior && (anterior.bloqueadoAte ?? 0) <= agora && anterior.tentativas >= MAX_TENTATIVAS ? 0 : (anterior?.tentativas ?? 0);
  const tentativas = base + 1;
  mapa[chave] = { tentativas, bloqueadoAte: tentativas >= MAX_TENTATIVAS ? agora + BLOQUEIO_MS : 0 };
  gravar(CHAVE_TENTATIVAS, mapa);
  return estadoBloqueio(identificador, agora);
}

export function limparTentativas(identificador) {
  const mapa = ler(CHAVE_TENTATIVAS, {});
  delete mapa[chaveDe(identificador)];
  gravar(CHAVE_TENTATIVAS, mapa);
}

export function minutosRestantes(restanteMs) {
  return Math.max(1, Math.ceil(restanteMs / 60000));
}

// --- Auditoria (LGPD art. 37: registro das operacoes de tratamento) ---------

export function registrarEvento(tipo, detalhe = null) {
  const eventos = ler(CHAVE_AUDITORIA, []);
  eventos.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo,
    detalhe,
    dataHora: new Date().toISOString(),
    dispositivo: descreverDispositivo(),
  });
  gravar(CHAVE_AUDITORIA, eventos.slice(0, LIMITE_EVENTOS));
}

export function listarAuditoria() {
  return ler(CHAVE_AUDITORIA, []);
}

/** Nome curto do navegador/sistema. Nao guarda o user agent completo (minimizacao). */
function descreverDispositivo() {
  const ua = navigator.userAgent;
  const navegador = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const sistema = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return [navegador, sistema].filter(Boolean).join(' · ');
}

// --- Marca de atividade -----------------------------------------------------
//
// O relogio de inatividade tambem precisa correr com o app fechado: so um timer
// em memoria nao pegaria quem fecha o navegador e volta no dia seguinte com a
// sessao ainda aberta.

/** Registra que houve uso agora. */
export function registrarAtividade(agora = Date.now()) {
  gravar(CHAVE_ATIVIDADE, agora);
}

/** @returns {boolean} passou do limite de inatividade desde o ultimo uso. */
export function ociosoDemais(agora = Date.now(), limiteMs = INATIVIDADE_MS) {
  const ultima = ler(CHAVE_ATIVIDADE);
  return typeof ultima === 'number' && agora - ultima > limiteMs;
}

/** Apaga o que o uso deixou para tras, sem tocar no tema escolhido. */
export function limparRastros() {
  [CHAVE_ATIVIDADE, CHAVE_AUDITORIA, CHAVE_TENTATIVAS].forEach(remover);
}

// --- Direito de exclusao (LGPD art. 18, VI) ---------------------------------

/** Apaga tudo que o app guardou neste dispositivo. */
export function apagarDadosLocais() {
  ['jornada:db', 'jornada:sessao', 'jornada:onboarding-visto', CHAVE_ATIVIDADE, CHAVE_TENTATIVAS, CHAVE_AUDITORIA].forEach(remover);
}
