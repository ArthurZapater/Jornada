// Conexões com dispositivos e plataformas de saúde.
// Nesta versão acadêmica, a integração é simulada e persiste no banco local. A tela
// consome apenas este serviço para a futura troca por HealthKit, Health Connect ou
// APIs dos fabricantes não exigir mudanças nos componentes.
import { ApiError, idLogado, simularRequisicao } from './http';
import { getDb, salvar } from './mockDb';
import { registrarEvento } from './segurancaService';
import { LEITURAS_DEMO, sinaisAtivosDosDispositivos } from '../utils/conexoes';

export const CATALOGO_CONEXOES = [
  {
    id: 'apple-watch',
    nome: 'Apple Watch',
    categoria: 'Relógio inteligente',
    descricao: 'Atividade, coração, sono e oxigenação reunidos pelo Apple Saúde.',
    compatibilidade: 'iPhone',
    tom: 'verde',
    permissoes: ['atividade', 'coracao', 'sono', 'oxigenacao'],
  },
  {
    id: 'health-connect',
    nome: 'Health Connect',
    categoria: 'Plataforma de saúde',
    descricao: 'Centraliza os dados de apps e relógios compatíveis no Android.',
    compatibilidade: 'Android',
    tom: 'nevoa',
    permissoes: ['atividade', 'coracao', 'sono', 'peso'],
  },
  {
    id: 'anel-inteligente',
    nome: 'Anel inteligente',
    categoria: 'Wearable',
    descricao: 'Acompanha recuperação, temperatura, sono e frequência cardíaca.',
    compatibilidade: 'Bluetooth',
    tom: 'lilas',
    permissoes: ['coracao', 'sono', 'temperatura', 'oxigenacao'],
  },
  {
    id: 'sensor-glicose',
    nome: 'Sensor de glicose',
    categoria: 'Sensor contínuo',
    descricao: 'Organiza tendências e registros contínuos de glicose ao longo do dia.',
    compatibilidade: 'NFC ou Bluetooth',
    tom: 'nevoa',
    permissoes: ['glicose'],
  },
  {
    id: 'medidor-pressao',
    nome: 'Medidor de pressão',
    categoria: 'Dispositivo doméstico',
    descricao: 'Importa medições de pressão e pulso para o seu histórico.',
    compatibilidade: 'Bluetooth',
    tom: 'verde',
    permissoes: ['pressao', 'coracao'],
  },
  {
    id: 'balanca-inteligente',
    nome: 'Balança inteligente',
    categoria: 'Dispositivo doméstico',
    descricao: 'Acompanha peso e composição corporal sem anotações manuais.',
    compatibilidade: 'Wi-Fi ou Bluetooth',
    tom: 'lilas',
    permissoes: ['peso'],
  },
];

export const ROTULOS_DADOS = {
  atividade: 'Atividade e passos',
  coracao: 'Frequência cardíaca',
  sono: 'Sono e recuperação',
  oxigenacao: 'Oxigenação do sangue',
  temperatura: 'Temperatura',
  glicose: 'Glicose',
  pressao: 'Pressão arterial',
  peso: 'Peso e composição corporal',
};

async function contexto() {
  const db = await getDb();
  const beneficiarioId = idLogado();
  if (!db.beneficiarios.some((item) => item.id === beneficiarioId)) {
    throw new ApiError('Beneficiário não encontrado.', 404);
  }
  return { db, beneficiarioId };
}

function enriquecer(conexao) {
  const catalogo = CATALOGO_CONEXOES.find((item) => item.id === conexao.id);
  if (!catalogo) return null;
  return { ...catalogo, ...conexao };
}

function montarPainel(db, beneficiarioId) {
  const conectados = db.dispositivosConectados
    .filter((item) => item.beneficiarioId === beneficiarioId)
    .map(enriquecer)
    .filter(Boolean);
  const ids = new Set(conectados.map((item) => item.id));
  const disponiveis = CATALOGO_CONEXOES.filter((item) => !ids.has(item.id));
  const permissoesAtivas = new Set(
    conectados.flatMap((item) => Object.entries(item.permissoes ?? {}).filter(([, ativo]) => ativo).map(([tipo]) => tipo)),
  );
  const indicadores = sinaisAtivosDosDispositivos(conectados).slice(0, 4);
  const ultimaSincronizacao = conectados
    .map((item) => item.ultimaSincronizacao)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return {
    conectados,
    disponiveis,
    indicadores,
    resumo: {
      quantidade: conectados.length,
      fontesAtivas: permissoesAtivas.size,
      ultimaSincronizacao,
    },
  };
}

export function listarConexoes() {
  return simularRequisicao(async () => {
    const { db, beneficiarioId } = await contexto();
    return montarPainel(db, beneficiarioId);
  }, 180);
}

export function conectarDispositivo(id) {
  return simularRequisicao(async () => {
    const catalogo = CATALOGO_CONEXOES.find((item) => item.id === id);
    if (!catalogo) throw new ApiError('Dispositivo não encontrado.', 404);
    const { db, beneficiarioId } = await contexto();
    const existente = db.dispositivosConectados.find((item) => item.beneficiarioId === beneficiarioId && item.id === id);
    if (!existente) {
      db.dispositivosConectados.push({
        id,
        beneficiarioId,
        conectadoEm: new Date().toISOString(),
        ultimaSincronizacao: new Date().toISOString(),
        bateria: id === 'health-connect' ? null : 86,
        permissoes: Object.fromEntries(catalogo.permissoes.map((tipo) => [tipo, true])),
        leituras: structuredClone(LEITURAS_DEMO[id] ?? {}),
      });
      salvar(db);
      registrarEvento('DISPOSITIVO_CONECTADO', catalogo.nome);
    }
    return montarPainel(db, beneficiarioId);
  }, 850);
}

export function desconectarDispositivo(id) {
  return simularRequisicao(async () => {
    const { db, beneficiarioId } = await contexto();
    const catalogo = CATALOGO_CONEXOES.find((item) => item.id === id);
    const indice = db.dispositivosConectados.findIndex((item) => item.beneficiarioId === beneficiarioId && item.id === id);
    if (indice < 0) throw new ApiError('Esta conexão já foi removida.', 404);
    db.dispositivosConectados.splice(indice, 1);
    salvar(db);
    registrarEvento('DISPOSITIVO_DESCONECTADO', catalogo?.nome ?? id);
    return montarPainel(db, beneficiarioId);
  }, 350);
}

export function sincronizarDispositivo(id) {
  return simularRequisicao(async () => {
    const { db, beneficiarioId } = await contexto();
    const conexao = db.dispositivosConectados.find((item) => item.beneficiarioId === beneficiarioId && item.id === id);
    if (!conexao) throw new ApiError('Conecte o dispositivo antes de sincronizar.', 409);
    conexao.ultimaSincronizacao = new Date().toISOString();
    salvar(db);
    registrarEvento('DISPOSITIVO_SINCRONIZADO', CATALOGO_CONEXOES.find((item) => item.id === id)?.nome ?? id);
    return montarPainel(db, beneficiarioId);
  }, 700);
}

export function sincronizarTodosDispositivos() {
  return simularRequisicao(async () => {
    const { db, beneficiarioId } = await contexto();
    const conectados = db.dispositivosConectados.filter((item) => item.beneficiarioId === beneficiarioId);
    if (!conectados.length) throw new ApiError('Nenhum dispositivo conectado para atualizar.', 409);
    const agora = new Date().toISOString();
    conectados.forEach((conexao) => {
      conexao.ultimaSincronizacao = agora;
    });
    salvar(db);
    registrarEvento('DISPOSITIVOS_SINCRONIZADOS', `${conectados.length} ${conectados.length === 1 ? 'conexão atualizada' : 'conexões atualizadas'}`);
    return montarPainel(db, beneficiarioId);
  }, 900);
}

export function definirPermissaoDispositivo(id, tipo, ativo) {
  return simularRequisicao(async () => {
    const { db, beneficiarioId } = await contexto();
    const conexao = db.dispositivosConectados.find((item) => item.beneficiarioId === beneficiarioId && item.id === id);
    const catalogo = CATALOGO_CONEXOES.find((item) => item.id === id);
    if (!conexao || !catalogo) throw new ApiError('Conexão não encontrada.', 404);
    if (!catalogo.permissoes.includes(tipo)) throw new ApiError('Este dado não é oferecido pelo dispositivo.', 400);
    conexao.permissoes = { ...conexao.permissoes, [tipo]: Boolean(ativo) };
    salvar(db);
    registrarEvento('PERMISSAO_DISPOSITIVO_ALTERADA', `${catalogo.nome}: ${ROTULOS_DADOS[tipo]}`);
    return montarPainel(db, beneficiarioId);
  }, 220);
}
