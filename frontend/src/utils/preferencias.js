// Opções das preferências de interface (Configurações). O estado mora em
// PreferenciasContext; aqui ficam só as listas, para telas e contexto usarem as mesmas.

export const TIPOS_NOTIFICACAO = [
  { tipo: 'CONSULTA', rotulo: 'Consultas', descricao: 'Confirmações, lembretes e cancelamentos.' },
  { tipo: 'EXAME', rotulo: 'Exames', descricao: 'Agendamentos e orientações de preparo.' },
  { tipo: 'RESULTADO', rotulo: 'Resultados', descricao: 'Aviso quando um laudo é liberado.' },
  { tipo: 'ENCAMINHAMENTO', rotulo: 'Encaminhamentos', descricao: 'Mudanças no status dos seus pedidos.' },
  { tipo: 'PAGAMENTO', rotulo: 'Pagamento', descricao: 'Vencimento e confirmação da mensalidade.' },
  { tipo: 'SISTEMA', rotulo: 'Novidades da conta', descricao: 'Boas-vindas e avisos gerais.' },
];

export const TAMANHOS_TEXTO = ['padrao', 'grande', 'maior'];
export const VELOCIDADES_VOZ = [0.85, 1, 1.2];
