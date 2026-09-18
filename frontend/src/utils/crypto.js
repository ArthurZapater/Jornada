// Hash de senha do mock. No backend real isso é BCrypt no servidor; aqui serve
// apenas para não guardar a senha em texto puro no localStorage.
export async function hashSenha(senha) {
  const texto = `jornada::${senha}`;
  if (globalThis.crypto?.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // crypto.subtle só existe em contexto seguro (HTTPS/localhost). Ao abrir o dev
  // server pelo IP da rede (ex.: no celular), cai neste fallback.
  let h = 0x811c9dc5;
  for (const c of texto) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv-${(h >>> 0).toString(16)}`;
}
