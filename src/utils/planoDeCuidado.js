const AREAS_CUIDADO = [
  {
    chave: 'CONSULTAS',
    rotulo: 'Consultas',
    descricao: 'Frequência de consultas, adesão e encaminhamentos.',
    fatores: ['ACOMPANHAMENTO', 'ADESAO', 'ENCAMINHAMENTO'],
    maximo: 28,
  },
  {
    chave: 'EXAMES',
    rotulo: 'Exames',
    descricao: 'Resultados recentes com alteração.',
    fatores: ['EXAMES'],
    maximo: 24,
  },
  {
    chave: 'PREVENCAO',
    rotulo: 'Prevenção',
    descricao: 'Condições declaradas e histórico familiar.',
    fatores: ['CRONICA', 'FAMILIA'],
    maximo: 20,
  },
  {
    chave: 'BEM_ESTAR',
    rotulo: 'Bem-estar',
    descricao: 'Hábitos de rotina registrados no perfil.',
    fatores: ['HABITOS'],
    maximo: 16,
  },
];

function scoreDaArea(pontos, maximo) {
  const proporcao = maximo > 0 ? pontos / maximo : 0;
  return Math.max(0, Math.min(100, Math.round(100 - (proporcao * 100))));
}

function statusDaArea(score) {
  if (score >= 75) return 'Bom ritmo';
  if (score >= 55) return 'Atenção';
  return 'Prioridade';
}

export function resumirAreasDoCuidado(fatores = []) {
  const pontosPorChave = new Map(fatores.map((fator) => [fator.chave, fator.pontos]));
  return AREAS_CUIDADO.map((area) => {
    const pontos = area.fatores.reduce((soma, chave) => soma + (pontosPorChave.get(chave) ?? 0), 0);
    const score = scoreDaArea(pontos, area.maximo);
    return {
      chave: area.chave,
      rotulo: area.rotulo,
      descricao: area.descricao,
      score,
      status: statusDaArea(score),
    };
  });
}
