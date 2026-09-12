import { Contact, HeartPulse, Pill, Sun, UserRound } from 'lucide-react';

/** Etapas do questionário do perfil. `campos` diz em qual etapa mostrar o erro de cada campo. */
export const ETAPAS = [
  {
    id: 'sobre',
    titulo: 'Sobre você',
    descricao: 'Para o app falar com você do seu jeito.',
    icone: UserRound,
    campos: ['nomePreferido', 'telefone', 'profissao', 'genero', 'estadoCivil', 'cep', 'cidade', 'uf'],
  },
  {
    id: 'saude',
    titulo: 'Sua saúde',
    descricao: 'O básico que todo atendimento pergunta — respondido uma vez só.',
    icone: HeartPulse,
    campos: ['alturaCm', 'pesoKg', 'tipoSanguineo', 'condicoes', 'condicoesOutra'],
  },
  {
    id: 'historico',
    titulo: 'Alergias e histórico',
    descricao: 'Ajuda a equipe a evitar riscos antes mesmo da consulta.',
    icone: Pill,
    campos: ['alergias', 'alergiasDetalhe', 'medicamentos', 'cirurgias', 'historicoFamiliar', 'acessibilidade'],
  },
  {
    id: 'habitos',
    titulo: 'Seu dia a dia',
    descricao: 'Sem julgamento: é o que deixa as recomendações certeiras.',
    icone: Sun,
    campos: ['tabagismo', 'alcool', 'atividadeFisica', 'sono', 'estresse'],
  },
  {
    id: 'cuidado',
    titulo: 'Contatos e objetivos',
    descricao: 'Quem avisar numa emergência e aonde você quer chegar.',
    icone: Contact,
    campos: ['contatoNome', 'contatoParentesco', 'contatoTelefone', 'periodoPreferido', 'canaisAviso', 'objetivos'],
  },
];
