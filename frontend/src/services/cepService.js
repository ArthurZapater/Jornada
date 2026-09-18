// Busca de endereço pelo CEP no ViaCEP (https://viacep.com.br) — API pública e
// gratuita, sem chave, que responde direto ao navegador (CORS aberto).
//
// Privacidade: sai daqui só o CEP digitado, sem nome nem qualquer outro dado, e
// só quando a pessoa termina de digitar os 8 dígitos. A resposta é tratada como
// dado externo: só cidade e UF são aproveitadas, e só se tiverem formato válido.
// Qualquer falha (sem internet, CEP inexistente, serviço fora) devolve null e a
// pessoa preenche à mão, como antes.
import { UFS } from '../utils/perfilSaude';

const PRAZO_MS = 6000;
const cache = new Map();

/**
 * @param cep com ou sem máscara
 * @param sinal AbortSignal para cancelar quando o CEP mudar
 * @returns {Promise<{cidade: string, uf: string} | null>}
 */
export async function buscarCep(cep, sinal) {
  const digitos = String(cep ?? '').replace(/\D/g, '');
  if (digitos.length !== 8) return null;
  if (cache.has(digitos)) return cache.get(digitos);

  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), PRAZO_MS);
  const cancelar = () => controle.abort();
  sinal?.addEventListener('abort', cancelar);
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
      signal: controle.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    const cidade = typeof dados?.localidade === 'string' ? dados.localidade.trim().slice(0, 60) : '';
    const uf = UFS.includes(dados?.uf) ? dados.uf : null;
    const endereco = dados?.erro || !cidade || !uf ? null : { cidade, uf };
    cache.set(digitos, endereco);
    return endereco;
  } catch {
    return null;
  } finally {
    clearTimeout(prazo);
    sinal?.removeEventListener('abort', cancelar);
  }
}
