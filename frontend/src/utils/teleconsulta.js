// Regras da teleconsulta usadas pela tela e pelo serviço.
//
// Telemedicina no Brasil é regulada pela Resolução CFM nº 2.314/2022, que exige o
// consentimento do paciente. Quais especialidades atendem por vídeo é decisão de
// cada operadora; aqui é um recorte de demonstração (especialidade.teleconsulta no
// seed): as que dependem de exame físico ou aparelho — oftalmologia, ortopedia —
// ficam só presenciais.

import { parseData } from './format';

export const MODALIDADES = {
  PRESENCIAL: { rotulo: 'Presencial', descricao: 'Na unidade, com o profissional.' },
  TELECONSULTA: { rotulo: 'Teleconsulta', descricao: 'Por vídeo, de onde você estiver.' },
};

/** A sala abre este tempo antes do horário marcado… */
export const ABRE_ANTES_MIN = 15;
/** …e fica aberta até este tempo depois dele. */
export const FICA_ABERTA_MIN = 60;

export const ehTeleconsulta = (consulta) => consulta?.modalidade === 'TELECONSULTA';

/**
 * @returns {{ estado: 'antes'|'aberta'|'encerrada', minutosParaAbrir: number }}
 */
export function estadoDaSala(dataHora, agora = new Date()) {
  const inicio = parseData(dataHora).getTime();
  const abre = inicio - ABRE_ANTES_MIN * 60_000;
  const fecha = inicio + FICA_ABERTA_MIN * 60_000;
  const t = agora.getTime();
  if (t < abre) return { estado: 'antes', minutosParaAbrir: Math.ceil((abre - t) / 60_000) };
  if (t > fecha) return { estado: 'encerrada', minutosParaAbrir: 0 };
  return { estado: 'aberta', minutosParaAbrir: 0 };
}

/** "em 2 h 10 min", "em 5 min" */
export function formatarEspera(minutos) {
  if (minutos < 60) return `em ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas >= 24) {
    const dias = Math.floor(horas / 24);
    return `em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }
  return resto ? `em ${horas} h ${resto} min` : `em ${horas} h`;
}
