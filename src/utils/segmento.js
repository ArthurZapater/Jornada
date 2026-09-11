import { idade } from './format';

// Segmento do beneficiário: a chave da hiper-personalização (briefing Unimed).
export const ROTULOS_SEGMENTO = {
  JOVEM: 'Jovem',
  ADULTO: 'Adulto',
  IDOSO: 'Idoso',
  CRONICO: 'Condição crônica',
};

export function calcularSegmento({ dataNascimento, condicaoCronica }) {
  if (condicaoCronica) return 'CRONICO';
  const anos = idade(dataNascimento);
  if (anos >= 60) return 'IDOSO';
  if (anos < 30) return 'JOVEM';
  return 'ADULTO';
}

// Lembrete da Home, adaptado ao perfil de cuidado de cada segmento.
export const LEMBRETES = {
  JOVEM: {
    titulo: 'Hábitos que fazem diferença',
    texto: '30 minutos de movimento hoje. Pequenas escolhas, grandes resultados.',
  },
  ADULTO: {
    titulo: 'Cuide de você todos os dias',
    texto: 'Previna hoje, viva melhor amanhã. Seu check-up anual está em dia?',
  },
  IDOSO: {
    titulo: 'Seu cuidado, no seu ritmo',
    texto: 'Mantenha vacinas e consultas de rotina em dia. Estamos com você.',
  },
  CRONICO: {
    titulo: 'Acompanhamento contínuo',
    texto: 'Tome sua medicação e mantenha o retorno com o especialista em dia.',
  },
};
