import assert from 'node:assert/strict';
import { createServer } from 'vite';

const memoria = new Map();
globalThis.localStorage = {
  getItem: (chave) => memoria.get(chave) ?? null,
  setItem: (chave, valor) => memoria.set(chave, valor),
  removeItem: (chave) => memoria.delete(chave),
};
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Teste' }, configurable: true });
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { getDb } = await vite.ssrLoadModule('/src/services/mockDb.js');
  const db = await getDb();
  localStorage.setItem('jornada:sessao', JSON.stringify({ beneficiario: { id: 1 } }));
  const service = await vite.ssrLoadModule('/src/services/conexoesService.js');
  const { calcularScore } = await vite.ssrLoadModule('/src/services/riscoService.js');
  const original = (await service.listarConexoes()).conectados[0];
  assert.equal(original.tipoId, 'apple-watch'); // registro legado preservado
  const scoreInicial = (await calcularScore()).score;
  for (const tipo of service.CATALOGO_CONEXOES) {
    await service.conectarDispositivo(tipo.id);
    await service.conectarDispositivo(tipo.id);
  }
  let painel = await service.listarConexoes();
  assert.equal(painel.disponiveis.length, service.CATALOGO_CONEXOES.length);
  assert.equal(painel.conectados.length, 13);
  assert.equal(new Set(painel.conectados.map((item) => item.id)).size, 13);
  assert.equal(new Set(painel.conectados.map((item) => item.nome)).size, 13);
  assert.equal((await calcularScore()).score, scoreInicial);
  const [anel, outro] = painel.conectados.filter((item) => item.tipoId === 'anel-inteligente');
  await service.definirPermissaoDispositivo(anel.id, 'sono', false);
  painel = await service.listarConexoes();
  assert.equal(painel.conectados.find((item) => item.id === anel.id).permissoes.sono, false);
  assert.equal(painel.conectados.find((item) => item.id === outro.id).permissoes.sono, true);
  await service.sincronizarDispositivo(anel.id);
  painel = await service.listarConexoes();
  assert.equal(painel.conectados.find((item) => item.id === outro.id).ultimaSincronizacao, outro.ultimaSincronizacao);
  await service.desconectarDispositivo(anel.id);
  painel = await service.sincronizarTodosDispositivos();
  assert.equal(painel.conectados.length, 12);
  assert.ok(painel.conectados.some((item) => item.id === outro.id));
  assert.equal(new Set(painel.conectados.map((item) => item.ultimaSincronizacao)).size, 1);
  await service.conectarDispositivo('apple-watch', 'Relógio de treino');
  assert.ok((await service.listarConexoes()).conectados.some((item) => item.nome === 'Relógio de treino'));
  await assert.rejects(service.conectarDispositivo('apple-watch', 'a'.repeat(61)));
  db.beneficiarios.push({ id: 2 });
  localStorage.setItem('jornada:sessao', JSON.stringify({ beneficiario: { id: 2 } }));
  assert.equal((await service.listarConexoes()).conectados.length, 0);
  await assert.rejects(service.desconectarDispositivo(outro.id));
  console.log('OK: múltiplas unidades dos 6 tipos, nomes, legado, permissões, sincronização, remoção, isolamento e score sem duplicidade.');
} finally {
  await vite.close();
}
