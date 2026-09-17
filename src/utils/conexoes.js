// Leituras fictícias usadas pelas conexões da demonstração. Cada fonte entrega
// sinais já normalizados para a interface e para o score heurístico. Em produção,
// estes DTOs viriam de HealthKit, Health Connect ou da API do fabricante.
export const LEITURAS_DEMO = {
  'apple-watch': {
    atividade: {
      rotulo: 'Média de passos (7 dias)',
      valor: '4.820 passos/dia',
      estado: 'ATENCAO',
      pontos: 3,
      detalhe: 'abaixo da meta pessoal de movimento',
    },
    coracao: { rotulo: 'Pulso em repouso', valor: '72 bpm', estado: 'ESTAVEL', pontos: 0 },
    sono: {
      rotulo: 'Média de sono (7 dias)',
      valor: '5h 55min/noite',
      estado: 'ATENCAO',
      pontos: 2,
      detalhe: 'abaixo da meta pessoal de sono',
    },
    oxigenacao: { rotulo: 'Oxigenação recente', valor: '98%', estado: 'ESTAVEL', pontos: 0 },
  },
  'health-connect': {
    atividade: {
      rotulo: 'Média de passos (7 dias)',
      valor: '4.820 passos/dia',
      estado: 'ATENCAO',
      pontos: 3,
      detalhe: 'abaixo da meta pessoal de movimento',
    },
    coracao: { rotulo: 'Pulso em repouso', valor: '72 bpm', estado: 'ESTAVEL', pontos: 0 },
    sono: {
      rotulo: 'Média de sono (7 dias)',
      valor: '5h 55min/noite',
      estado: 'ATENCAO',
      pontos: 2,
      detalhe: 'abaixo da meta pessoal de sono',
    },
    peso: { rotulo: 'Último peso', valor: '68,4 kg', estado: 'ESTAVEL', pontos: 0 },
  },
  'anel-inteligente': {
    coracao: { rotulo: 'Pulso em repouso', valor: '72 bpm', estado: 'ESTAVEL', pontos: 0 },
    sono: {
      rotulo: 'Média de sono (7 dias)',
      valor: '5h 55min/noite',
      estado: 'ATENCAO',
      pontos: 2,
      detalhe: 'abaixo da meta pessoal de sono',
    },
    temperatura: { rotulo: 'Temperatura recente', valor: '36,4 °C', estado: 'ESTAVEL', pontos: 0 },
    oxigenacao: { rotulo: 'Oxigenação recente', valor: '98%', estado: 'ESTAVEL', pontos: 0 },
  },
  'sensor-glicose': {
    glicose: { rotulo: 'Última glicose', valor: '104 mg/dL', estado: 'ESTAVEL', pontos: 0 },
  },
  'medidor-pressao': {
    pressao: { rotulo: 'Última pressão', valor: '12/8', estado: 'ESTAVEL', pontos: 0 },
    coracao: { rotulo: 'Pulso na medição', valor: '72 bpm', estado: 'ESTAVEL', pontos: 0 },
  },
  'balanca-inteligente': {
    peso: { rotulo: 'Último peso', valor: '68,4 kg', estado: 'ESTAVEL', pontos: 0 },
  },
};

/** Uma categoria aparece uma vez no score, mesmo quando duas fontes a oferecem. */
export function sinaisAtivosDosDispositivos(conexoes = []) {
  const porTipo = new Map();
  const ordenadas = [...conexoes].sort((a, b) =>
    (b.ultimaSincronizacao ?? '').localeCompare(a.ultimaSincronizacao ?? ''),
  );
  ordenadas.forEach((conexao) => {
    Object.entries(conexao.leituras ?? {}).forEach(([tipo, leitura]) => {
      if (conexao.permissoes?.[tipo] && !porTipo.has(tipo)) {
        porTipo.set(tipo, { tipo, fonteId: conexao.id, ...leitura });
      }
    });
  });
  return [...porTipo.values()];
}
