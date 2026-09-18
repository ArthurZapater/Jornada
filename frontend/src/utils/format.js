const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Aceita Date, 'AAAA-MM-DD' (interpretado no fuso local) ou ISO completo. */
export function parseData(valor) {
  if (valor instanceof Date) return new Date(valor);
  if (typeof valor === 'string' && valor.length === 10) return new Date(`${valor}T00:00`);
  return new Date(valor);
}

export function toISODate(valor) {
  const d = parseData(valor);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** 'AAAA-MM-DDTHH:MM' no horário local — mesmo formato de Consulta.dataHora. */
export function agoraLocalISO(agora = new Date()) {
  const hh = String(agora.getHours()).padStart(2, '0');
  const mm = String(agora.getMinutes()).padStart(2, '0');
  return `${toISODate(agora)}T${hh}:${mm}`;
}

export function formatarData(valor) {
  return parseData(valor).toLocaleDateString('pt-BR');
}

export function formatarDataLonga(valor) {
  return parseData(valor).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatarHora(valor) {
  return parseData(valor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function diaEMes(valor) {
  const d = parseData(valor);
  return { dia: String(d.getDate()).padStart(2, '0'), mes: MESES_CURTOS[d.getMonth()] };
}

export function formatarMesAno(valor) {
  const d = parseData(valor);
  return `${MESES_CURTOS[d.getMonth()]}/${d.getFullYear()}`;
}

export function nomeDoMes(indice) {
  const nome = MESES[indice];
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function tempoRelativo(valor, agora = new Date()) {
  const minutos = Math.round((agora - parseData(valor)) / 60000);
  if (minutos < 1) return 'Agora';
  if (minutos < 60) return `Há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `Há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return 'Ontem';
  if (dias < 7) return `Há ${dias} dias`;
  return formatarData(valor);
}

export function idade(dataNascimento, hoje = new Date()) {
  const nasc = parseData(dataNascimento);
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const antesDoAniversario =
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
  if (antesDoAniversario) anos -= 1;
  return anos;
}

const PARTICULAS = /^(de|da|do|dos|das|e|dr\.?|dra\.?)$/i;

export function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter((p) => p && !PARTICULAS.test(p));
  if (!partes.length) return '';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes.at(-1)[0] : '';
  return (primeira + ultima).toUpperCase();
}

export function primeiroNome(nome = '') {
  return nome.trim().split(/\s+/)[0] ?? '';
}

export function somenteDigitos(valor = '') {
  return valor.replace(/\D/g, '');
}

/** Máscara progressiva de CPF para inputs: 52998224725 → 529.982.247-25 */
export function formatarCpf(valor = '') {
  return somenteDigitos(valor)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Exibe só os dígitos do meio (LGPD: minimização na interface). */
export function mascararCpf(valor = '') {
  const d = somenteDigitos(valor);
  if (d.length !== 11) return '•••';
  return `•••.${d.slice(3, 6)}.${d.slice(6, 9)}-••`;
}

export function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarCompetencia(competencia) {
  const [ano, mes] = competencia.split('-');
  return `${MESES_CURTOS[Number(mes) - 1]}/${ano}`;
}

/** Dias inteiros de uma data até outra; negativo se a segunda já passou. */
export function diasEntre(de, ate) {
  const inicio = parseData(de);
  const fim = parseData(ate);
  inicio.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  return Math.round((fim - inicio) / 86400000);
}

export function formatarDistancia(km) {
  return `${km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/** Minúsculas e sem acento, para busca tolerante ("clinica" encontra "Clínica"). */
export function normalizar(texto = '') {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}
