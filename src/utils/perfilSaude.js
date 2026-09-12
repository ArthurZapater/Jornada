// Perfil de saúde: o que o beneficiário conta sobre si além do cadastro básico.
//
// É a matéria-prima da hiper-personalização — o nome pelo qual o app chama a
// pessoa, o perfil de cuidado, os fatores do plano de cuidado e o que o assistente
// sabe responder. Todas as perguntas são opcionais.
//
// LGPD: condição de saúde, alergia, medicamento e histórico familiar são dados
// SENSÍVEIS (art. 11). Por isso as opções são fechadas sempre que possível (menos
// texto livre = menos dado desnecessário), nada daqui sai em mensagem de WhatsApp,
// e Configurações tem o botão que apaga o perfil inteiro.

const opcoes = (pares) => pares.map(([valor, rotulo]) => ({ valor, rotulo }));

export const OPCOES = {
  genero: opcoes([
    ['FEMININO', 'Feminino'],
    ['MASCULINO', 'Masculino'],
    ['NAO_BINARIO', 'Não binário'],
    ['OUTRO', 'Outro'],
    ['NAO_INFORMAR', 'Prefiro não informar'],
  ]),
  estadoCivil: opcoes([
    ['SOLTEIRO', 'Solteiro(a)'],
    ['UNIAO', 'Casado(a) ou união estável'],
    ['DIVORCIADO', 'Divorciado(a)'],
    ['VIUVO', 'Viúvo(a)'],
  ]),
  tipoSanguineo: opcoes([
    ['A+', 'A+'], ['A-', 'A−'], ['B+', 'B+'], ['B-', 'B−'],
    ['AB+', 'AB+'], ['AB-', 'AB−'], ['O+', 'O+'], ['O-', 'O−'],
    ['NAO_SEI', 'Não sei'],
  ]),
  condicoes: opcoes([
    ['NENHUMA', 'Nenhuma'],
    ['HIPERTENSAO', 'Hipertensão'],
    ['DIABETES', 'Diabetes'],
    ['COLESTEROL', 'Colesterol alto'],
    ['ASMA', 'Asma ou bronquite'],
    ['CARDIACA', 'Doença do coração'],
    ['TIREOIDE', 'Tireoide'],
    ['SAUDE_MENTAL', 'Ansiedade ou depressão'],
    ['RENAL', 'Doença renal'],
    ['OUTRA', 'Outra'],
  ]),
  alergias: opcoes([
    ['NENHUMA', 'Nenhuma'],
    ['MEDICAMENTO', 'Medicamento'],
    ['ALIMENTO', 'Alimento'],
    ['LATEX', 'Látex'],
    ['PICADA', 'Picada de inseto'],
    ['RESPIRATORIA', 'Pó, pólen ou ácaro'],
  ]),
  historicoFamiliar: opcoes([
    ['DIABETES', 'Diabetes'],
    ['HIPERTENSAO', 'Hipertensão'],
    ['CARDIACA', 'Doença do coração'],
    ['CANCER', 'Câncer'],
    ['AVC', 'AVC'],
    ['ALZHEIMER', 'Alzheimer'],
  ]),
  acessibilidade: opcoes([
    ['VISUAL', 'Baixa visão'],
    ['AUDITIVA', 'Deficiência auditiva'],
    ['MOBILIDADE', 'Mobilidade reduzida'],
    ['NEURODIVERGENCIA', 'Neurodivergência (TEA, TDAH)'],
  ]),
  tabagismo: opcoes([
    ['NUNCA', 'Nunca fumei'],
    ['EX', 'Já fumei, parei'],
    ['FUMANTE', 'Fumo'],
  ]),
  alcool: opcoes([
    ['NAO', 'Não bebo'],
    ['SOCIAL', 'Socialmente'],
    ['FREQUENTE', 'Várias vezes por semana'],
  ]),
  atividadeFisica: opcoes([
    ['SEDENTARIO', 'Quase nunca'],
    ['LEVE', '1 a 2 vezes por semana'],
    ['REGULAR', '3 ou mais vezes por semana'],
  ]),
  sono: opcoes([
    ['POUCO', 'Menos de 6 horas'],
    ['ADEQUADO', '6 a 8 horas'],
    ['MUITO', 'Mais de 8 horas'],
  ]),
  estresse: opcoes([
    ['BAIXO', 'Tranquilo'],
    ['MEDIO', 'Às vezes pesado'],
    ['ALTO', 'Pesado quase sempre'],
  ]),
  periodoPreferido: opcoes([
    ['MANHA', 'Manhã'],
    ['TARDE', 'Tarde'],
    ['NOITE', 'Noite'],
  ]),
  canaisAviso: opcoes([
    ['APP', 'Aviso no app'],
    ['WHATSAPP', 'WhatsApp'],
    ['EMAIL', 'E-mail'],
    ['LIGACAO', 'Ligação'],
  ]),
  objetivos: opcoes([
    ['CHECKUP', 'Manter o check-up em dia'],
    ['ATIVIDADE', 'Me exercitar mais'],
    ['ALIMENTACAO', 'Comer melhor'],
    ['SONO', 'Dormir melhor'],
    ['ESTRESSE', 'Reduzir o estresse'],
    ['PESO', 'Chegar ao meu peso ideal'],
    ['FUMO', 'Parar de fumar'],
    ['CRONICA', 'Controlar uma condição crônica'],
  ]),
};

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB',
  'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

/** Campos de escolha múltipla; os demais de OPCOES são escolha única. */
export const MULTIPLOS = ['condicoes', 'alergias', 'historicoFamiliar', 'acessibilidade', 'canaisAviso', 'objetivos'];

/** Opções que excluem as outras do mesmo grupo. */
export const EXCLUSIVAS = { condicoes: 'NENHUMA', alergias: 'NENHUMA' };

/** Limite de tamanho de cada texto livre (caracteres). */
export const LIMITES_TEXTO = {
  nomePreferido: 40,
  profissao: 60,
  cidade: 60,
  condicoesOutra: 80,
  alergiasDetalhe: 120,
  medicamentos: 240,
  cirurgias: 240,
  contatoNome: 60,
  contatoParentesco: 30,
  telefone: 16,
  contatoTelefone: 16,
};

export const PERFIL_VAZIO = {
  genero: null,
  estadoCivil: null,
  profissao: '',
  cep: '',
  cidade: '',
  uf: null,
  alturaCm: '',
  pesoKg: '',
  tipoSanguineo: null,
  condicoes: [],
  condicoesOutra: '',
  alergias: [],
  alergiasDetalhe: '',
  medicamentos: '',
  cirurgias: '',
  historicoFamiliar: [],
  acessibilidade: [],
  tabagismo: null,
  alcool: null,
  atividadeFisica: null,
  sono: null,
  estresse: null,
  contatoNome: '',
  contatoParentesco: '',
  contatoTelefone: '',
  periodoPreferido: null,
  canaisAviso: [],
  objetivos: [],
};

/** Condições que fazem o perfil de cuidado virar "Condição crônica". */
export const CONDICOES_CRONICAS = ['HIPERTENSAO', 'DIABETES', 'COLESTEROL', 'ASMA', 'CARDIACA', 'TIREOIDE', 'SAUDE_MENTAL', 'RENAL', 'OUTRA'];

export function rotuloDe(campo, valor) {
  return OPCOES[campo]?.find((opcao) => opcao.valor === valor)?.rotulo ?? null;
}

export function rotulosDe(campo, valores = []) {
  return valores.map((valor) => rotuloDe(campo, valor)).filter(Boolean);
}

/** Como o app chama a pessoa: o nome escolhido, ou o primeiro nome do cadastro. */
export function comoChamar(beneficiario) {
  const preferido = beneficiario?.nomePreferido?.trim();
  return preferido || (beneficiario?.nome ?? '').trim().split(/\s+/)[0] || '';
}

// Cada item conta um ponto na completude — o que a pessoa vê como "perfil 60%".
const ITENS_DE_COMPLETUDE = [
  (p, extra) => Boolean(extra?.nomePreferido),
  (p) => Boolean(p.genero),
  (p) => Boolean(p.cidade && p.uf),
  (p) => Boolean(p.alturaCm && p.pesoKg),
  (p) => Boolean(p.tipoSanguineo),
  (p) => p.condicoes.length > 0,
  (p) => p.alergias.length > 0,
  (p) => Boolean(p.tabagismo),
  (p) => Boolean(p.atividadeFisica),
  (p) => Boolean(p.sono),
  (p) => Boolean(p.contatoNome && p.contatoTelefone),
  (p) => p.objetivos.length > 0,
];

/** @returns {number} 0 a 100 */
export function calcularCompletude(perfil, extra = {}) {
  const p = { ...PERFIL_VAZIO, ...(perfil ?? {}) };
  const feitos = ITENS_DE_COMPLETUDE.filter((item) => item(p, extra)).length;
  return Math.round((feitos / ITENS_DE_COMPLETUDE.length) * 100);
}

/**
 * Índice de massa corporal pela fórmula e faixas da OMS para adultos. É uma conta,
 * não uma avaliação: a tela sempre diz que quem interpreta é o médico.
 */
export function calcularImc(alturaCm, pesoKg) {
  const altura = Number(alturaCm) / 100;
  const peso = Number(pesoKg);
  if (!altura || !peso) return null;
  const valor = peso / (altura * altura);
  const faixa = valor < 18.5 ? 'Abaixo da faixa de referência' : valor < 25 ? 'Dentro da faixa de referência' : valor < 30 ? 'Acima da faixa de referência' : 'Bem acima da faixa de referência';
  return { valor: Math.round(valor * 10) / 10, faixa };
}

export function formatarTelefone(valor = '') {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatarCep(valor = '') {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

const digitos = (valor) => String(valor ?? '').replace(/\D/g, '');
const vazio = (valor) => valor === '' || valor === null || valor === undefined;

/** Converte "62,5" ou "62.5" em número; texto que não é número vira NaN. */
export function numeroDecimal(valor) {
  const bruto = String(valor ?? '').trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(bruto) ? Number(bruto) : Number.NaN;
}

/**
 * Regras dos campos que têm formato. Usada pela tela (mensagem ao lado do campo) e
 * pelo serviço (que recusa o que passar dela) — a mesma régua nos dois lados.
 * @returns {Record<string, string>} campo → mensagem
 */
export function validarPerfil({ telefone = '', perfil = {} } = {}) {
  const p = { ...PERFIL_VAZIO, ...perfil };
  const erros = {};
  if (!vazio(telefone) && ![10, 11].includes(digitos(telefone).length)) erros.telefone = 'Informe DDD e número.';
  if (!vazio(p.alturaCm)) {
    const altura = numeroDecimal(p.alturaCm);
    if (!Number.isInteger(altura) || altura < 50 || altura > 250) erros.alturaCm = 'Em centímetros, entre 50 e 250.';
  }
  if (!vazio(p.pesoKg)) {
    const peso = numeroDecimal(p.pesoKg);
    if (!(peso >= 2 && peso <= 400)) erros.pesoKg = 'Em quilos, entre 2 e 400.';
  }
  if (!vazio(p.cep) && digitos(p.cep).length !== 8) erros.cep = 'O CEP tem 8 dígitos.';
  if (!vazio(p.contatoTelefone) && ![10, 11].includes(digitos(p.contatoTelefone).length)) {
    erros.contatoTelefone = 'Informe DDD e número.';
  }
  if (!vazio(p.contatoTelefone) && !p.contatoNome?.trim()) erros.contatoNome = 'Diga de quem é esse telefone.';
  return erros;
}
