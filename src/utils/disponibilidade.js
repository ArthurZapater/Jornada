import { toISODate } from './format';

// Agenda simulada. É determinística por (recurso, unidade, dia): o mesmo médico
// mostra sempre os mesmos horários livres, então a demo é reproduzível.
const HORARIOS_BASE = ['07:30', '08:00', '09:30', '10:00', '11:30', '14:00', '15:30', '16:30'];
const JANELA_DIAS = 60;
const ANTECEDENCIA_MINIMA_MS = 60 * 60 * 1000;

function hash(texto) {
  let h = 0x811c9dc5;
  for (const c of texto) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function inicioDoDia(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function horariosDisponiveis(chave, dataISO, ocupados = [], agora = new Date()) {
  const dia = new Date(`${dataISO}T00:00`);
  const hoje = inicioDoDia(agora);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + JANELA_DIAS);

  if (dia < hoje || dia > limite || dia.getDay() === 0) return [];
  if (hash(`${chave}|${dataISO}`) % 4 === 0) return []; // dia sem agenda aberta

  const sabado = dia.getDay() === 6;
  return HORARIOS_BASE.filter((horario) => {
    if (sabado && horario >= '12:00') return false;
    if (hash(`${chave}|${dataISO}|${horario}`) % 3 === 0) return false;
    if (ocupados.includes(horario)) return false;
    if (dataISO === toISODate(agora)) {
      const [hh, mm] = horario.split(':').map(Number);
      const slot = new Date(dia);
      slot.setHours(hh, mm);
      return slot - agora > ANTECEDENCIA_MINIMA_MS;
    }
    return true;
  });
}

export function diasDisponiveisNoMes(chave, ano, mes, ocupadosPorDia = () => [], agora = new Date()) {
  const total = new Date(ano, mes + 1, 0).getDate();
  const dias = [];
  for (let d = 1; d <= total; d++) {
    const iso = toISODate(new Date(ano, mes, d));
    if (horariosDisponiveis(chave, iso, ocupadosPorDia(iso), agora).length) dias.push(iso);
  }
  return dias;
}
