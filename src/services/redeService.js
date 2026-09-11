import { LOCALIZACAO_USUARIO, getDb, porId } from './mockDb';
import { simularRequisicao } from './http';
import { normalizar } from '../utils/format';
import { distanciaKm } from '../utils/geo';

const ROTULO_TIPO = { UBS: 'UBS', CLINICA: 'Clínica', HOSPITAL: 'Hospital' };

/** Médicos e unidades da rede credenciada, do mais próximo para o mais distante. */
export function listarRede({ busca = '', filtro = 'TODOS' } = {}) {
  return simularRequisicao(async () => {
    const db = await getDb();

    const unidades = db.unidades.map((u) => ({
      chave: `u-${u.id}`,
      categoria: u.tipo === 'HOSPITAL' ? 'HOSPITAL' : 'CLINICA',
      rotuloTipo: ROTULO_TIPO[u.tipo],
      nome: u.nome,
      descricao: u.descricao,
      endereco: u.endereco,
      unidadeId: u.id,
      latitude: u.latitude,
      longitude: u.longitude,
      distanciaKm: distanciaKm(LOCALIZACAO_USUARIO, u),
    }));

    const medicos = db.medicos.map((m) => {
      const especialidade = porId(db.especialidades, m.especialidadeId);
      const maisProxima = m.unidadeIds
        .map((id) => porId(db.unidades, id))
        .sort((a, b) => distanciaKm(LOCALIZACAO_USUARIO, a) - distanciaKm(LOCALIZACAO_USUARIO, b))[0];
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
        distanciaKm: distanciaKm(LOCALIZACAO_USUARIO, maisProxima),
        medicoId: m.id,
      };
    });

    const categoria = { MEDICOS: 'MEDICO', CLINICAS: 'CLINICA', HOSPITAIS: 'HOSPITAL' }[filtro];
    const termo = normalizar(busca);
    return [...medicos, ...unidades]
      .filter((item) => !categoria || item.categoria === categoria)
      .filter((item) => !termo || normalizar(`${item.nome} ${item.descricao} ${item.endereco}`).includes(termo))
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  }, 250);
}
