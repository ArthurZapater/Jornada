// Acesso ao localStorage à prova de falhas: em aba anônima, com cota cheia ou
// com armazenamento bloqueado, o app continua funcionando (só não persiste).

export function ler(chave, padrao = null) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto === null ? padrao : JSON.parse(bruto);
  } catch {
    return padrao;
  }
}

export function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* armazenamento indisponível */
  }
}

export function remover(chave) {
  try {
    localStorage.removeItem(chave);
  } catch {
    /* armazenamento indisponível */
  }
}
