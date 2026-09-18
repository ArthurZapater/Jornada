// ATENÇÃO: beneficiário, CPF, cartão SUS, médicos, consultas e exames são FICTÍCIOS,
// criados para a demonstração acadêmica; o CPF usado é um número de teste conhecido.
//
// As UNIDADES são a exceção: nome, endereço e coordenadas vêm do OpenStreetMap
// (consulta por estabelecimentos de saúde com "Unimed" no nome, via Overpass e
// Nominatim), para o mapa e as distâncias fazerem sentido de verdade. São unidades
// próprias das cooperativas Unimed — não a rede credenciada inteira, que tem cerca
// de 30 mil estabelecimentos e muda por cooperativa e por plano; a lista oficial é
// o Guia Médico. Os médicos fictícios foram distribuídos entre elas.
//
// "Banco de dados" do protótipo: um objeto em memória persistido no localStorage.
// Espelha as entidades do modelo de dados (Beneficiario, Consulta, Exame...) para
// que a troca por uma API real mexa só nos arquivos de services/.
import { hashSenha } from '../utils/crypto';
import { LEITURAS_DEMO } from '../utils/conexoes';
import { agoraLocalISO, formatarData, formatarMesAno, toISODate } from '../utils/format';
import { gravar, ler } from '../utils/storage';

const CHAVE = 'jornada:db';
const VERSAO = 9;

/** Posição de partida (Av. Paulista) quando o usuário não libera a localização real. */
export const LOCALIZACAO_USUARIO = { latitude: -23.5614, longitude: -46.6559 };

let dbPromise = null;

export function getDb() {
  if (!dbPromise) dbPromise = carregar();
  return dbPromise;
}

// Coleções esperadas. Quem já usou o app tem um seed salvo no navegador: se uma
// coleção nova for adicionada aqui, ela precisa existir antes do primeiro uso,
// senão vira "undefined.push". Subir VERSAO recria o seed; garantirEstrutura é a
// rede de segurança para qualquer coleção que ainda falte.
const COLECOES = [
  'beneficiarios', 'especialidades', 'unidades', 'medicos', 'tiposExame', 'consultas',
  'exames', 'resultados', 'encaminhamentos', 'mensalidades', 'interacoesChatbot',
  'scoresRisco', 'notificacoes', 'dispositivosConectados', 'prescricoes',
];

const SEQUENCIAS_PADRAO = {
  beneficiarios: 0, consultas: 0, exames: 0, resultados: 0,
  encaminhamentos: 0, notificacoes: 0, mensalidades: 0, interacoes: 0, scores: 0,
};

function garantirEstrutura(db) {
  COLECOES.forEach((colecao) => {
    if (!Array.isArray(db[colecao])) db[colecao] = [];
  });
  db.seq = { ...SEQUENCIAS_PADRAO, ...(db.seq ?? {}) };
  return db;
}

async function carregar() {
  const salvo = ler(CHAVE);
  if (salvo?.versao === VERSAO) return garantirEstrutura(salvo);
  const novo = await criarSeed();
  gravar(CHAVE, novo);
  return novo;
}

export function salvar(db) {
  gravar(CHAVE, db);
}

export function restaurarDadosDemo() {
  // dbPromise troca antes do seed ficar pronto: quem chamar getDb() no meio do
  // caminho espera o banco novo em vez de receber o antigo.
  dbPromise = criarSeed().then((novo) => {
    gravar(CHAVE, novo);
    return novo;
  });
  return dbPromise;
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
/** Horário local 'AAAA-MM-DDTHH:MM' daqui a N minutos, arredondado para o múltiplo de 5 seguinte. */
const daquiA = (base, minutos) => {
  const d = new Date(base.getTime() + minutos * 60000);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
  return agoraLocalISO(d);
};
const competencia = (base, meses) => {
  const d = new Date(base.getFullYear(), base.getMonth() + meses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const vencimento = (base, meses, dia = 10) => toISODate(new Date(base.getFullYear(), base.getMonth() + meses, dia));

async function criarSeed() {
  const hoje = new Date();
  const proximaConsulta = dataHora(hoje, 4, '09:30');
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const mesAberto = hoje.getDate() > 10 ? 1 : 0;

  return {
    versao: VERSAO,
    seq: { beneficiarios: 1, consultas: 7, exames: 5, resultados: 3, encaminhamentos: 3, notificacoes: 4, mensalidades: 7, interacoes: 0, scores: 0 },

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
        condicaoCronicaDeclarada: false,
        fotoUrl: null,
        // Questionário do primeiro acesso ainda por responder: a demo sempre o mostra.
        nomePreferido: null,
        perfilSaude: null,
        perfilSaudeAtualizadoEm: null,
        questionario: { status: 'PENDENTE', em: null },
        // Resultados de exame visíveis para quem vai atender em seguida (compartilhamentoService).
        compartilharResultados: true,
        consentimentoLgpdEm: minutosAtras(hoje, 60 * 24 * 120),
        senhaHash: await hashSenha('jornada123'),
      },
    ],

    especialidades: [
      // teleconsulta: recorte de demonstração — ver src/utils/teleconsulta.js
      { id: 1, nome: 'Clínico Geral', descricao: 'Atendimento integral e check-ups.', teleconsulta: true },
      { id: 2, nome: 'Cardiologia', descricao: 'Coração e sistema circulatório.', teleconsulta: true },
      { id: 3, nome: 'Dermatologia', descricao: 'Pele, cabelos e unhas.', teleconsulta: true },
      { id: 4, nome: 'Endocrinologia', descricao: 'Hormônios, diabetes e metabolismo.', teleconsulta: true },
      { id: 5, nome: 'Ginecologia', descricao: 'Saúde da mulher.', teleconsulta: true },
      { id: 6, nome: 'Oftalmologia', descricao: 'Saúde dos olhos e da visão.', teleconsulta: false },
      { id: 7, nome: 'Ortopedia', descricao: 'Ossos, músculos e articulações.', teleconsulta: false },
      { id: 8, nome: 'Pediatria', descricao: 'Crianças e adolescentes.', teleconsulta: true },
    ],

    unidades: [
      { id: 1, nome: 'Unimed Nacional — Espaço Saúde', tipo: 'CLINICA', descricao: 'Unidade de atendimento Unimed', endereco: 'Rua Pamplona, 1625', cidade: 'São Paulo', uf: 'SP', latitude: -23.5706447, longitude: -46.6601565 },
      { id: 2, nome: 'Unimed Guarulhos — Espaço Cuidar', tipo: 'CLINICA', descricao: 'Unidade de atendimento Unimed', endereco: 'Rua Arminda de Lima, 378', cidade: 'Guarulhos', uf: 'SP', latitude: -23.4592865, longitude: -46.53525 },
      { id: 3, nome: 'Complexo Hospitalar da Unimed Guarulhos', tipo: 'HOSPITAL', descricao: 'Hospital da rede própria Unimed', endereco: 'Rua Tabajara, 566', cidade: 'Guarulhos', uf: 'SP', latitude: -23.4632226, longitude: -46.5199875 },
      { id: 4, nome: 'Unimed Jundiaí — Unidade Polvilho', tipo: 'CLINICA', descricao: 'Unidade de atendimento Unimed', endereco: 'Avenida Tenente Marques, 5700', cidade: 'Cajamar', uf: 'SP', latitude: -23.4060569, longitude: -46.8643692 },
      { id: 5, nome: 'Unimed Jundiaí — Unidade Várzea Paulista', tipo: 'CLINICA', descricao: 'Unidade de atendimento Unimed', endereco: 'Rua Coronel Álvaro de Castro, 123', cidade: 'Várzea Paulista', uf: 'SP', latitude: -23.2131842, longitude: -46.8314367 },
      { id: 6, nome: 'Hospital Unimed Guarulhos', tipo: 'HOSPITAL', descricao: 'Hospital da rede própria Unimed', endereco: 'Rua Conceição', cidade: 'Guarulhos', uf: 'SP', latitude: -23.4693872, longitude: -46.5381899 },
      { id: 7, nome: 'Hospital Unimed São Roque', tipo: 'HOSPITAL', descricao: 'Hospital da rede própria Unimed', endereco: 'Rua Doutor José Juni Filho, 130', cidade: 'São Roque', uf: 'SP', latitude: -23.5295477, longitude: -47.142003 },
      { id: 8, nome: 'Hospital Unimed Campinas', tipo: 'HOSPITAL', descricao: 'Hospital da rede própria Unimed', endereco: 'Rua São Carlos, 369', cidade: 'Campinas', uf: 'SP', latitude: -22.9145195, longitude: -47.0648925 },
      { id: 9, nome: 'Unimed São Roque — Unidade Mairinque', tipo: 'CLINICA', descricao: 'Unidade de atendimento Unimed', endereco: 'Avenida Mitsuke, 621', cidade: 'Mairinque', uf: 'SP', latitude: -23.546357, longitude: -47.1907784 },
      { id: 10, nome: 'Unimed Salto/Itu — Atenção Integral à Saúde', tipo: 'CLINICA', descricao: 'Unidade de atendimento Unimed', endereco: 'Rua Madre Maria Basília, 278', cidade: 'Itu', uf: 'SP', latitude: -23.2702634, longitude: -47.2964858 },
      { id: 11, nome: 'Pronto Atendimento Unimed', tipo: 'HOSPITAL', descricao: 'Pronto atendimento da rede própria Unimed', endereco: 'Rua Paraná, 191', cidade: 'Santos', uf: 'SP', latitude: -23.9485887, longitude: -46.3323666 },
      { id: 12, nome: 'Unimed Santos — Unidade Cubatão', tipo: 'CLINICA', descricao: 'Unidade de atendimento Unimed', endereco: 'Rua Embaixador Pedro de Toledo, 134', cidade: 'Cubatão', uf: 'SP', latitude: -23.8884992, longitude: -46.4221761 },
      { id: 13, nome: 'Unimed Santos — Pronto Atendimento Praia Grande', tipo: 'HOSPITAL', descricao: 'Pronto atendimento da rede própria Unimed', endereco: 'Avenida Presidente Kennedy, 2213', cidade: 'Praia Grande', uf: 'SP', latitude: -24.0080959, longitude: -46.4305622 },
      { id: 14, nome: 'Hospital Unimed Rio', tipo: 'HOSPITAL', descricao: 'Hospital da rede própria Unimed', endereco: 'Avenida Ayrton Senna — Barra da Tijuca', cidade: 'Rio de Janeiro', uf: 'RJ', latitude: -22.9890452, longitude: -43.3638372 },
      { id: 15, nome: 'Pronto Atendimento Unimed Rio', tipo: 'HOSPITAL', descricao: 'Pronto atendimento da rede própria Unimed', endereco: 'Avenida das Américas — Jardim Oceânico', cidade: 'Rio de Janeiro', uf: 'RJ', latitude: -23.0044268, longitude: -43.3230091 },
      { id: 16, nome: 'Hospital Unimed Nova Iguaçu', tipo: 'HOSPITAL', descricao: 'Hospital da rede própria Unimed', endereco: 'Rua Coronel Bernardino de Melo, 1879', cidade: 'Nova Iguaçu', uf: 'RJ', latitude: -22.7618613, longitude: -43.4495723 },
      { id: 17, nome: 'Hospital Dia e Maternidade Unimed', tipo: 'HOSPITAL', descricao: 'Hospital-dia e maternidade da rede própria Unimed', endereco: 'Rua Viamão, 1171', cidade: 'Belo Horizonte', uf: 'MG', latitude: -19.9374517, longitude: -43.9684951 },
      { id: 18, nome: 'Hospital Infantil São Camilo Unimed', tipo: 'HOSPITAL', descricao: 'Hospital infantil da rede própria Unimed', endereco: 'Rua Pouso Alegre, 1771', cidade: 'Belo Horizonte', uf: 'MG', latitude: -19.9121406, longitude: -43.9228399 },
      { id: 19, nome: 'CPS - Unimed', tipo: 'CLINICA', descricao: 'Centro de promoção da saúde Unimed', endereco: 'Avenida Churchill, 36', cidade: 'Belo Horizonte', uf: 'MG', latitude: -19.9226971, longitude: -43.9178979 },
      { id: 20, nome: 'CPS Barreiro - Unimed', tipo: 'CLINICA', descricao: 'Centro de promoção da saúde Unimed', endereco: 'Avenida Olinto Meireles, 380', cidade: 'Belo Horizonte', uf: 'MG', latitude: -19.9745452, longitude: -44.0132108 },
      { id: 21, nome: 'Centro de Promoção da Saúde - Unimed', tipo: 'CLINICA', descricao: 'Centro de promoção da saúde Unimed', endereco: 'Avenida Dom Pedro I, 2840', cidade: 'Belo Horizonte', uf: 'MG', latitude: -19.8235489, longitude: -43.9533434 },
      { id: 22, nome: 'Unimed Contagem', tipo: 'HOSPITAL', descricao: 'Hospital da rede própria Unimed', endereco: 'Avenida Babita Camargos, 1695', cidade: 'Contagem', uf: 'MG', latitude: -19.9493095, longitude: -44.0265225 },
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
      { id: 5, nome: 'Ultrassonografia abdominal', categoria: 'Imagem', preparo: 'Jejum de 8 horas; pode tomar água até uma hora antes.', unidadeIds: [3, 6] },
      { id: 6, nome: 'Raio-X de tórax', categoria: 'Imagem', preparo: 'Retire objetos metálicos antes do exame.', unidadeIds: [3, 6] },
      { id: 7, nome: 'TSH e T4 livre', categoria: 'Análises clínicas', preparo: 'Jejum de 4 horas.', unidadeIds: [5, 1] },
      { id: 8, nome: 'Urina tipo 1', categoria: 'Análises clínicas', preparo: 'Colete a primeira urina da manhã.', unidadeIds: [5, 1, 3] },
    ],

    consultas: [
      { id: 1, beneficiarioId: 1, medicoId: 1, modalidade: 'PRESENCIAL', unidadeId: 1, dataHora: proximaConsulta, status: 'CONFIRMADA' },
      { id: 2, beneficiarioId: 1, medicoId: 5, modalidade: 'PRESENCIAL', unidadeId: 4, dataHora: dataHora(hoje, 19, '10:00'), status: 'AGENDADA' },
      { id: 3, beneficiarioId: 1, medicoId: 1, modalidade: 'PRESENCIAL', unidadeId: 1, dataHora: dataHora(hoje, -40, '08:00'), status: 'CONCLUIDA' },
      { id: 4, beneficiarioId: 1, medicoId: 3, modalidade: 'PRESENCIAL', unidadeId: 3, dataHora: dataHora(hoje, -95, '10:00'), status: 'CONCLUIDA' },
      { id: 5, beneficiarioId: 1, medicoId: 8, modalidade: 'PRESENCIAL', unidadeId: 3, dataHora: dataHora(hoje, -180, '15:30'), status: 'CONCLUIDA' },
      { id: 6, beneficiarioId: 1, medicoId: 2, modalidade: 'PRESENCIAL', unidadeId: 4, dataHora: dataHora(hoje, -60, '14:00'), status: 'CANCELADA' },
      // Retorno por vídeo daqui a pouco: com a sala já aberta, a demo mostra a teleconsulta
      // sem esperar. Como o seed é recriado a cada reinício, o horário acompanha a demo.
      { id: 7, beneficiarioId: 1, medicoId: 2, modalidade: 'TELECONSULTA', unidadeId: null, dataHora: daquiA(hoje, 10), status: 'CONFIRMADA' },
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

    // Uma conexão inicial deixa o painel útil na apresentação; todas as ações da
    // tela continuam simuladas e podem ser desfeitas pelo usuário.
    dispositivosConectados: [
      {
        id: 'apple-watch',
        beneficiarioId: 1,
        conectadoEm: minutosAtras(hoje, 60 * 24 * 18),
        ultimaSincronizacao: minutosAtras(hoje, 7),
        bateria: 74,
        permissoes: { atividade: true, coracao: true, sono: true, oxigenacao: true },
        leituras: structuredClone(LEITURAS_DEMO['apple-watch']),
      },
    ],

    prescricoes: [
      {
        id: 'prescricao-demo-1', beneficiarioId: 1, titulo: 'Orientação após consulta',
        origem: 'CONSULTA', dataAtendimento: data(hoje, -6),
        profissional: 'Dr. Marcelo Andrade', registroProfissional: 'CRM-SP 123456',
        local: 'Unimed Nacional — Espaço Saúde',
        medicamentos: [
          { nome: 'Exemplo de medicamento', posologia: 'Conforme orientação médica', duracao: '7 dias' },
        ],
        validadeAte: data(hoje, 24), arquivoNome: 'prescricao-demonstracao.pdf',
        observacoes: 'Documento fictício para demonstração acadêmica.',
        acessoValidoAte: new Date(hoje.getTime() + 15 * 60 * 1000).toISOString(),
        criadaEm: minutosAtras(hoje, 60 * 24 * 6),
      },
    ],

    // A parcela em aberto é sempre a próxima a vencer: se o dia 10 já passou,
    // a do mês corrente aparece paga e a aberta é a do mês seguinte.
    mensalidades: [
      { id: 1, beneficiarioId: 1, competencia: competencia(hoje, mesAberto), valor: 489.9, vencimento: vencimento(hoje, mesAberto), status: 'EM_ABERTO', formaPagamento: null, dataPagamento: null },
      { id: 2, beneficiarioId: 1, competencia: competencia(hoje, mesAberto - 1), valor: 489.9, vencimento: vencimento(hoje, mesAberto - 1), status: 'PAGA', formaPagamento: 'PIX', dataPagamento: vencimento(hoje, mesAberto - 1, 8) },
      { id: 3, beneficiarioId: 1, competencia: competencia(hoje, mesAberto - 2), valor: 489.9, vencimento: vencimento(hoje, mesAberto - 2), status: 'PAGA', formaPagamento: 'CARTAO', dataPagamento: vencimento(hoje, mesAberto - 2, 10) },
      { id: 4, beneficiarioId: 1, competencia: competencia(hoje, mesAberto - 3), valor: 489.9, vencimento: vencimento(hoje, mesAberto - 3), status: 'PAGA', formaPagamento: 'BOLETO', dataPagamento: vencimento(hoje, mesAberto - 3, 9) },
      { id: 5, beneficiarioId: 1, competencia: competencia(hoje, mesAberto - 4), valor: 489.9, vencimento: vencimento(hoje, mesAberto - 4), status: 'PAGA', formaPagamento: 'PIX', dataPagamento: vencimento(hoje, mesAberto - 4, 10) },
      { id: 6, beneficiarioId: 1, competencia: competencia(hoje, mesAberto - 5), valor: 501.8, vencimento: vencimento(hoje, mesAberto - 5), status: 'PAGA_COM_ATRASO', formaPagamento: 'BOLETO', dataPagamento: vencimento(hoje, mesAberto - 5, 22) },
      { id: 7, beneficiarioId: 1, competencia: competencia(hoje, mesAberto - 6), valor: 489.9, vencimento: vencimento(hoje, mesAberto - 6), status: 'PAGA', formaPagamento: 'CARTAO', dataPagamento: vencimento(hoje, mesAberto - 6, 10) },
    ],

    // Preenchidos em tempo de execução pelo chatbot e pelo cálculo de risco.
    interacoesChatbot: [],
    scoresRisco: [],

    notificacoes: [
      { id: 1, beneficiarioId: 1, tipo: 'CONSULTA', titulo: 'Consulta confirmada', mensagem: `Dr. Marcelo Andrade — ${formatarData(proximaConsulta)} às 09:30, Unidade Centro.`, link: '/consultas', lida: false, dataCriacao: minutosAtras(hoje, 10) },
      { id: 2, beneficiarioId: 1, tipo: 'RESULTADO', titulo: 'Resultado disponível', mensagem: 'Hemograma completo — toque para ver o laudo.', link: '/resultados/1', lida: false, dataCriacao: minutosAtras(hoje, 120) },
      { id: 3, beneficiarioId: 1, tipo: 'PAGAMENTO', titulo: 'Vencimento em 10 dias', mensagem: `Mensalidade ${formatarMesAno(proximoMes)} — R$ 489,90.`, link: null, lida: true, dataCriacao: minutosAtras(hoje, 60 * 26) },
      { id: 4, beneficiarioId: 1, tipo: 'ENCAMINHAMENTO', titulo: 'Encaminhamento atualizado', mensagem: 'Cardiologia — vaga disponível no Hospital São Lucas.', link: '/encaminhamentos', lida: true, dataCriacao: minutosAtras(hoje, 60 * 50) },
    ],
  };
}
