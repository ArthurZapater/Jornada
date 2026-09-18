import { LOCALIZACAO_USUARIO, getDb, porId } from './mockDb';
import { simularRequisicao } from './http';
import { normalizar } from '../utils/format';
import { distanciaKm } from '../utils/geo';

const ROTULO_TIPO = { UBS: 'UBS', CLINICA: 'Clínica', HOSPITAL: 'Hospital' };

/**
 * Médicos e unidades da rede, do mais próximo para o mais distante.
 * @param origem posição de referência; por padrão, a de demonstração.
 */
export function listarRede({ busca = '', filtro = 'TODOS', origem = LOCALIZACAO_USUARIO } = {}) {
  return simularRequisicao(async () => {
    const db = await getDb();

    const unidades = db.unidades.map((u) => ({
      chave: `u-${u.id}`,
      categoria: u.tipo === 'HOSPITAL' ? 'HOSPITAL' : 'CLINICA',
      rotuloTipo: ROTULO_TIPO[u.tipo],
      nome: u.nome,
      descricao: u.descricao,
      endereco: u.endereco,
      cidade: `${u.cidade}/${u.uf}`,
      unidadeId: u.id,
      latitude: u.latitude,
      longitude: u.longitude,
      distanciaKm: distanciaKm(origem, u),
    }));

    const medicos = db.medicos.map((m) => {
      const especialidade = porId(db.especialidades, m.especialidadeId);
      const maisProxima = m.unidadeIds
        .map((id) => porId(db.unidades, id))
        .sort((a, b) => distanciaKm(origem, a) - distanciaKm(origem, b))[0];
      return {
        chave: `m-${m.id}`,
        categoria: 'MEDICO',
        rotuloTipo: 'Médico',
        nome: m.nome,
        descricao: `${especialidade.nome} — ${m.crm}`,
        endereco: maisProxima.nome,
        unidadeId: maisProxima.id,
        latitude: maisProxima.latitude,
        longitude: maisProxima.longitude,
        cidade: `${maisProxima.cidade}/${maisProxima.uf}`,
        distanciaKm: distanciaKm(origem, maisProxima),
        medicoId: m.id,
      };
    });

    const categoria = { MEDICOS: 'MEDICO', CLINICAS: 'CLINICA', HOSPITAIS: 'HOSPITAL' }[filtro];
    const termo = normalizar(busca);
    return [...medicos, ...unidades]
      .filter((item) => !categoria || item.categoria === categoria)
      .filter((item) => !termo || normalizar(`${item.nome} ${item.descricao} ${item.endereco} ${item.cidade}`).includes(termo))
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  }, 250);
}
