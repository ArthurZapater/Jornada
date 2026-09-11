// Camada "HTTP" do mock. Quando existir backend, este é o arquivo que vira o
// cliente axios (baseURL = import.meta.env.VITE_API_URL, header Authorization).
import { gravar, ler, remover } from '../utils/storage';

const LATENCIA_MS = 300;
const CHAVE_SESSAO = 'jornada:sessao';

export class ApiError extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Simula uma requisição: aguarda a latência e devolve uma cópia (como um JSON vindo da rede). */
export async function simularRequisicao(executar, ms = LATENCIA_MS) {
  await new Promise((resolve) => setTimeout(resolve, ms));
  const resultado = await executar();
  return resultado === undefined ? undefined : structuredClone(resultado);
}

export function lerSessao() {
  return ler(CHAVE_SESSAO);
}

export function gravarSessao(sessao) {
  gravar(CHAVE_SESSAO, sessao);
}

export function limparSessao() {
  remover(CHAVE_SESSAO);
}

/** Equivalente ao "sub" do JWT validado pelo backend. */
export function idLogado() {
  const sessao = lerSessao();
  if (!sessao?.beneficiario?.id) throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  return sessao.beneficiario.id;
}
