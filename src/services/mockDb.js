// ATENÇÃO: todos os dados deste arquivo são FICTÍCIOS, criados para a demonstração
// acadêmica. Nenhum beneficiário, CPF, cartão SUS, médico ou unidade corresponde a
// pessoa ou estabelecimento real; o CPF usado é um número de teste conhecido.
//
// "Banco de dados" do protótipo: um objeto em memória persistido no localStorage.
// Espelha as entidades do modelo de dados (Beneficiario, Consulta, Exame...) para
// que a troca por uma API real mexa só nos arquivos de services/.
import { hashSenha } from '../utils/crypto';
import { formatarData, formatarMesAno, toISODate } from '../utils/format';
import { gravar, ler } from '../utils/storage';

const CHAVE = 'jornada:db';
const VERSAO = 1;

/** Localização simulada do usuário (Av. Paulista) para calcular distâncias. */
export const LOCALIZACAO_USUARIO = { latitude: -23.5614, longitude: -46.6559 };

let dbPromise = null;

export function getDb() {
  if (!dbPromise) dbPromise = carregar();
  return dbPromise;
}

async function carregar() {
  const salvo = ler(CHAVE);
  if (salvo?.versao === VERSAO) return salvo;
  const novo = await criarSeed();
  gravar(CHAVE, novo);
  return novo;
}

export function salvar(db) {
  gravar(CHAVE, db);
}

export async function restaurarDadosDemo() {
  const novo = await criarSeed();
  gravar(CHAVE, novo);
  dbPromise = Promise.resolve(novo);
}

export function proximoId(db, colecao) {
  db.seq[colecao] += 1;
  return db.seq[colecao];
}

export function porId(lista, id) {
  return lista.find((item) => item.id === Number(id));
}

// ---------------------------------------------------------------------------
// Seed — datas relativas a "hoje", para a demo nunca ficar com dados vencidos.
// ---------------------------------------------------------------------------

function somarDias(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1); // sem atendimento aos domingos
  return d;
}
const data = (base, n) => toISODate(somarDias(base, n));
const dataHora = (base, n, hora) => `${data(base, n)}T${hora}`;
const minutosAtras = (base, minutos) => new Date(base.getTime() - minutos * 60000).toISOString();

async function criarSeed() {
  const hoje = new Date();
  const proximaConsulta = dataHora(hoje, 4, '09:30');
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

  return {
    versao: VERSAO,
    seq: { beneficiarios: 1, consultas: 6, exames: 5, resultados: 3, encaminhamentos: 3, notificacoes: 4 },

    beneficiarios: [
      {
        id: 1,
        nome: 'Ana Souza',
        cpf: '52998224725',
        cartaoSus: '898000012345670',
        dataNascimento: '1987-06-18',
        email: 'ana.souza@email.com',
        telefone: '(11) 98765-4321',
        plano: 'Unimed Familiar',
        titularidade: 'Titular',
        carteirinha: '1234 5678 9012 3456',
        segmento: 'ADULTO',
        condicaoCronica: false,
        consentimentoLgpdEm: minutosAtras(hoje, 60 * 24 * 120),
        senhaHash: await hashSenha('jornada123'),
      },
    ],

    especialidades: [
      { id: 1, nome: 'Clínico Geral', descricao: 'Atendimento integral e check-ups.' },
      { id: 2, nome: 'Cardiologia', descricao: 'Coração e sistema circulatório.' },
      { id: 3, nome: 'Dermatologia', descricao: 'Pele, cabelos e unhas.' },
      { id: 4, nome: 'Endocrinologia', descricao: 'Hormônios, diabetes e metabolismo.' },
      { id: 5, nome: 'Ginecologia', descricao: 'Saúde da mulher.' },
      { id: 6, nome: 'Oftalmologia', descricao: 'Saúde dos olhos e da visão.' },
      { id: 7, nome: 'Ortopedia', descricao: 'Ossos, músculos e articulações.' },
      { id: 8, nome: 'Pediatria', descricao: 'Crianças e adolescentes.' },
    ],

    unidades: [
      { id: 1, nome: 'Unidade Centro', tipo: 'CLINICA', descricao: 'Clínica multiespecialidades', endereco: 'Av. Paulista, 1000 — Bela Vista', latitude: -23.5646, longitude: -46.6527 },
      { id: 2, nome: 'UBS Central', tipo: 'UBS', descricao: 'Unidade básica de saúde', endereco: 'Rua Frei Caneca, 320 — Consolação', latitude: -23.5536, longitude: -46.656 },
      { id: 3, nome: 'Hospital São Lucas', tipo: 'HOSPITAL', descricao: 'Hospital geral · Pronto-socorro 24h', endereco: 'Av. Brasil, 1500 — Jardim América', latitude: -23.5722, longitude: -46.6684 },
      { id: 4, nome: 'Clínica Família Saudável', tipo: 'CLINICA', descricao: 'Clínica multidisciplinar', endereco: 'Rua das Flores, 210 — Pinheiros', latitude: -23.5664, longitude: -46.68 },
      { id: 5, nome: 'Laboratório Central', tipo: 'CLINICA', descricao: 'Laboratório de análises clínicas', endereco: 'Rua Augusta, 1800 — Jardins', latitude: -23.5595, longitude: -46.662 },
      { id: 6, nome: 'Hospital Santa Clara', tipo: 'HOSPITAL', descricao: 'Hospital geral · Maternidade', endereco: 'Rua Vergueiro, 2500 — Vila Mariana', latitude: -23.583, longitude: -46.639 },
      { id: 7, nome: 'UBS Norte', tipo: 'UBS', descricao: 'Unidade básica de saúde', endereco: 'Rua Voluntários da Pátria, 900 — Santana', latitude: -23.502, longitude: -46.625 },
    ],

    medicos: [
      { id: 1, nome: 'Dr. Marcelo Andrade', crm: 'CRM-SP 123456', especialidadeId: 1, unidadeIds: [1, 2] },
      { id: 2, nome: 'Dra. Carla Menezes', crm: 'CRM-SP 234567', especialidadeId: 1, unidadeIds: [4] },
      { id: 3, nome: 'Dr. João Mendes', crm: 'CRM-SP 345678', especialidadeId: 2, unidadeIds: [3, 1] },
      { id: 4, nome: 'Dra. Beatriz Lima', crm: 'CRM-SP 456789', especialidadeId: 2, unidadeIds: [6] },
      { id: 5, nome: 'Dra. Renata Alves', crm: 'CRM-SP 567890', especialidadeId: 3, unidadeIds: [4] },
      { id: 6, nome: 'Dr. Henrique Tavares', crm: 'CRM-SP 678901', especialidadeId: 4, unidadeIds: [1] },
      { id: 7, nome: 'Dra. Juliana Rocha', crm: 'CRM-SP 789012', especialidadeId: 5, unidadeIds: [6, 4] },
      { id: 8, nome: 'Dr. Paulo Saraiva', crm: 'CRM-SP 890123', especialidadeId: 6, unidadeIds: [3] },
      { id: 9, nome: 'Dra. Fernanda Costa', crm: 'CRM-SP 901234', especialidadeId: 7, unidadeIds: [3, 7] },
      { id: 10, nome: 'Dra. Luiza Prado', crm: 'CRM-SP 112233', especialidadeId: 8, unidadeIds: [2, 6] },
    ],

    tiposExame: [
      { id: 1, nome: 'Hemograma completo', categoria: 'Análises clínicas', preparo: 'Não é necessário jejum.', unidadeIds: [5, 1, 3] },
      { id: 2, nome: 'Glicemia em jejum', categoria: 'Análises clínicas', preparo: 'Jejum de 8 horas.', unidadeIds: [5, 1, 3] },
      { id: 3, nome: 'Colesterol total e frações', categoria: 'Análises clínicas', preparo: 'Jejum de 12 horas e sem álcool nas 72h anteriores.', unidadeIds: [5, 1, 3] },
      { id: 4, nome: 'Eletrocardiograma', categoria: 'Cardiológico', preparo: 'Evite cremes ou óleos no tórax no dia do exame.', unidadeIds: [3, 6, 1] },
      { id: 5, nome: 'Ultrassonografia abdominal', categoria: 'Imagem', preparo: 'Jejum de 8 horas; beba água 1 hora antes.', unidadeIds: [3, 6] },
      { id: 6, nome: 'Raio-X de tórax', categoria: 'Imagem', preparo: 'Retire objetos metálicos antes do exame.', unidadeIds: [3, 6] },
      { id: 7, nome: 'TSH e T4 livre', categoria: 'Análises clínicas', preparo: 'Jejum de 4 horas.', unidadeIds: [5, 1] },
      { id: 8, nome: 'Urina tipo 1', categoria: 'Análises clínicas', preparo: 'Colete a primeira urina da manhã.', unidadeIds: [5, 1, 3] },
    ],

    consultas: [
      { id: 1, beneficiarioId: 1, medicoId: 1, unidadeId: 1, dataHora: proximaConsulta, status: 'CONFIRMADA' },
      { id: 2, beneficiarioId: 1, medicoId: 5, unidadeId: 4, dataHora: dataHora(hoje, 19, '10:00'), status: 'AGENDADA' },
      { id: 3, beneficiarioId: 1, medicoId: 1, unidadeId: 1, dataHora: dataHora(hoje, -40, '08:00'), status: 'CONCLUIDA' },
      { id: 4, beneficiarioId: 1, medicoId: 3, unidadeId: 3, dataHora: dataHora(hoje, -95, '10:00'), status: 'CONCLUIDA' },
      { id: 5, beneficiarioId: 1, medicoId: 8, unidadeId: 3, dataHora: dataHora(hoje, -180, '15:30'), status: 'CONCLUIDA' },
      { id: 6, beneficiarioId: 1, medicoId: 2, unidadeId: 4, dataHora: dataHora(hoje, -60, '14:00'), status: 'CANCELADA' },
    ],

    exames: [
      { id: 1, beneficiarioId: 1, tipoExameId: 1, unidadeId: 5, medicoSolicitante: 'Dr. Marcelo Andrade', dataSolicitacao: data(hoje, -40), dataAgendada: dataHora(hoje, -21, '07:30'), dataRealizacao: data(hoje, -21), status: 'DISPONIVEL' },
      { id: 2, beneficiarioId: 1, tipoExameId: 2, unidadeId: 5, medicoSolicitante: 'Dr. Marcelo Andrade', dataSolicitacao: data(hoje, -40), dataAgendada: dataHora(hoje, -21, '07:30'), dataRealizacao: data(hoje, -21), status: 'DISPONIVEL' },
      { id: 3, beneficiarioId: 1, tipoExameId: 3, unidadeId: 5, medicoSolicitante: 'Dr. Marcelo Andrade', dataSolicitacao: data(hoje, -40), dataAgendada: dataHora(hoje, -21, '07:30'), dataRealizacao: data(hoje, -21), status: 'DISPONIVEL' },
      { id: 4, beneficiarioId: 1, tipoExameId: 4, unidadeId: 3, medicoSolicitante: 'Dr. João Mendes', dataSolicitacao: data(hoje, -8), dataAgendada: dataHora(hoje, -3, '09:30'), dataRealizacao: data(hoje, -3), status: 'AGUARDANDO' },
      { id: 5, beneficiarioId: 1, tipoExameId: 5, unidadeId: 3, medicoSolicitante: 'Dr. Marcelo Andrade', dataSolicitacao: data(hoje, -2), dataAgendada: dataHora(hoje, 9, '08:00'), dataRealizacao: null, status: 'AGUARDANDO' },
    ],

    resultados: [
      {
        id: 1, exameId: 1, arquivoUrl: null, dataDisponibilizacao: data(hoje, -19),
        responsavel: 'Dra. Sílvia Ramos — CRBM 12345',
        laudo: 'Hemograma dentro dos valores de referência, sem alterações significativas.',
        itens: [
          { parametro: 'Hemoglobina', valor: '13,6 g/dL', referencia: '12,0 – 16,0 g/dL', alterado: false },
          { parametro: 'Hematócrito', valor: '40,8 %', referencia: '36 – 46 %', alterado: false },
          { parametro: 'Leucócitos', valor: '6.800 /mm³', referencia: '4.000 – 11.000 /mm³', alterado: false },
          { parametro: 'Plaquetas', valor: '245.000 /mm³', referencia: '150.000 – 450.000 /mm³', alterado: false },
        ],
      },
      {
        id: 2, exameId: 2, arquivoUrl: null, dataDisponibilizacao: data(hoje, -19),
        responsavel: 'Dra. Sílvia Ramos — CRBM 12345',
        laudo: 'Glicemia de jejum levemente acima do valor de referência. Recomenda-se reavaliação clínica.',
        itens: [{ parametro: 'Glicose', valor: '104 mg/dL', referencia: '70 – 99 mg/dL', alterado: true }],
      },
      {
        id: 3, exameId: 3, arquivoUrl: null, dataDisponibilizacao: data(hoje, -19),
        responsavel: 'Dra. Sílvia Ramos — CRBM 12345',
        laudo: 'Colesterol total e LDL acima do desejável. Sugere-se acompanhamento com orientação alimentar.',
        itens: [
          { parametro: 'Colesterol total', valor: '212 mg/dL', referencia: '< 190 mg/dL', alterado: true },
          { parametro: 'HDL', valor: '52 mg/dL', referencia: '> 40 mg/dL', alterado: false },
          { parametro: 'LDL', valor: '138 mg/dL', referencia: '< 130 mg/dL', alterado: true },
          { parametro: 'Triglicerídeos', valor: '110 mg/dL', referencia: '< 150 mg/dL', alterado: false },
        ],
      },
    ],

    encaminhamentos: [
      { id: 1, beneficiarioId: 1, especialidadeDestinoId: 2, medicoOrigem: 'Dr. Marcelo Andrade', especialidadeOrigem: 'Clínico Geral', unidadeDestinoId: 3, dataEmissao: data(hoje, -12), validade: data(hoje, 78), dataConclusao: null, status: 'ATIVO', motivo: 'Avaliação cardiológica — alteração no perfil lipídico.' },
      { id: 2, beneficiarioId: 1, especialidadeDestinoId: 7, medicoOrigem: 'Dra. Carla Menezes', especialidadeOrigem: 'Clínico Geral', unidadeDestinoId: 7, dataEmissao: data(hoje, -20), validade: data(hoje, 70), dataConclusao: null, status: 'EM_PROCESSO', motivo: 'Dor lombar recorrente — avaliação especializada. Aguardando autorização do plano.' },
      { id: 3, beneficiarioId: 1, especialidadeDestinoId: 6, medicoOrigem: 'Dr. Marcelo Andrade', especialidadeOrigem: 'Clínico Geral', unidadeDestinoId: 3, dataEmissao: data(hoje, -200), validade: data(hoje, -110), dataConclusao: data(hoje, -180), status: 'CONCLUIDO', motivo: 'Revisão de grau e exame de fundo de olho.' },
    ],

    notificacoes: [
      { id: 1, beneficiarioId: 1, tipo: 'CONSULTA', titulo: 'Consulta confirmada', mensagem: `Dr. Marcelo Andrade — ${formatarData(proximaConsulta)} às 09:30, Unidade Centro.`, link: '/consultas', lida: false, dataCriacao: minutosAtras(hoje, 10) },
      { id: 2, beneficiarioId: 1, tipo: 'RESULTADO', titulo: 'Resultado disponível', mensagem: 'Hemograma completo — toque para ver o laudo.', link: '/resultados/1', lida: false, dataCriacao: minutosAtras(hoje, 120) },
      { id: 3, beneficiarioId: 1, tipo: 'PAGAMENTO', titulo: 'Vencimento em 10 dias', mensagem: `Mensalidade ${formatarMesAno(proximoMes)} — R$ 489,90.`, link: null, lida: true, dataCriacao: minutosAtras(hoje, 60 * 26) },
      { id: 4, beneficiarioId: 1, tipo: 'ENCAMINHAMENTO', titulo: 'Encaminhamento atualizado', mensagem: 'Cardiologia — vaga disponível no Hospital São Lucas.', link: '/encaminhamentos', lida: true, dataCriacao: minutosAtras(hoje, 60 * 50) },
    ],
  };
}
