// Teste do assistente (chatbotService) contra o roteiro de treinamento do time.
//
//   npm run test:assistente
//
// Roda no Node, sem navegador: o localStorage é um dublê em memória e a sessão é a
// da conta de demonstração. Cada pergunta diz qual intenção deve responder; o
// script mostra as que caíram em outra e sai com erro se alguma falhar — dá para
// usar antes de cada deploy.
//
// Blocos 1 a 8: as 100 perguntas de TREINAMENTO-ASSISTENTE-IA-JORNADA.md.
// Bloco 9: módulos do app que o roteiro não cobria.

import { register } from 'node:module';

// O código do app importa sem extensão (padrão do Vite); no Node, este gancho completa o ".js".
register(
  `data:text/javascript,${encodeURIComponent(`
export async function resolve(especificador, contexto, proximo) {
  try {
    return await proximo(especificador, contexto);
  } catch (erro) {
    if (erro?.code !== 'ERR_MODULE_NOT_FOUND' || !/^\\.{1,2}\\//.test(especificador)) throw erro;
    return proximo(especificador + '.js', contexto);
  }
}`)}`,
);

const memoria = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
};
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node' }, configurable: true });

const { login } = await import('../src/services/authService.js');
const { enviarPergunta } = await import('../src/services/chatbotService.js');

/** [intenção esperada (ou lista de aceitas), ...perguntas] */
const ROTEIRO = {
  '1. Agendamento de consulta': [
    ['documentos', 'Quais documentos eu preciso para marcar uma consulta?', 'O que eu levo pra agendar uma consulta médica?', 'Preciso do cartão do SUS pra marcar consulta?', 'É obrigatório levar comprovante de endereço na consulta?'],
    ['agendar', 'Como eu faço para marcar uma consulta?', 'Onde eu agendo uma consulta pelo aplicativo?', 'Quero marcar uma consulta com um clínico geral, como faço?', 'É possível escolher o médico na hora de agendar?'],
    ['cancelar', 'Como eu cancelo uma consulta que já marquei?', 'Posso remarcar minha consulta pra outro dia?', 'Marquei errado, como desfaço o agendamento?', 'Tem multa se eu cancelar a consulta em cima da hora?'],
    ['especialidades', 'Quais especialidades médicas vocês atendem?', 'Tem cardiologista disponível no app?', 'Vocês têm oftalmologista na rede?'],
  ],
  '2. Exames': [
    ['agendar_exame', 'Como eu marco um exame de sangue?', 'Onde eu agendo um exame pelo app?', 'Preciso de pedido médico pra agendar exame?', 'Dá pra marcar mais de um exame no mesmo dia?'],
    ['preparo', 'Preciso estar em jejum para fazer exame de sangue?', 'Quantas horas de jejum são necessárias pro exame?', 'Tem algum preparo especial antes do exame?'],
    ['resultado_prazo', 'Quanto tempo demora para sair o resultado do exame?', 'Em quantos dias fica pronto o exame de sangue?', 'Por que meu exame ainda está "aguardando"?', 'Vou ser avisado quando o resultado sair?'],
    ['resultados', 'Onde eu vejo o resultado do meu exame?', 'Como eu baixo o laudo do exame?', 'Posso ver exames antigos, de meses atrás?'],
  ],
  '3. Encaminhamento': [
    ['encaminhamento_o_que_e', 'O que é um encaminhamento médico?', 'Pra que serve o encaminhamento no app?', 'Preciso de encaminhamento pra ver um especialista?', 'Como funciona o encaminhamento pela Unimed?'],
    ['encaminhamento_validade', 'Por quanto tempo vale um encaminhamento?', 'Meu encaminhamento pode vencer?', 'Como eu sei a validade do meu encaminhamento?', 'O que acontece se o encaminhamento vencer antes de eu usar?'],
    ['encaminhamento', 'Como eu acompanho meu encaminhamento?', 'Onde vejo o histórico de encaminhamentos antigos?', 'O que significa "em processo" no encaminhamento?'],
  ],
  '4. Rede credenciada': [
    ['rede', 'Como encontro um médico credenciado perto de mim?', 'Onde tem hospital da rede Unimed próximo?', 'Vocês têm clínica credenciada na minha região?', 'Como eu vejo o CRM do médico antes de agendar?'],
    ['rede_tipos', 'Quais tipos de unidade fazem parte da rede?', 'Tem diferença entre UBS e clínica credenciada?', 'Como filtro só por hospitais na busca?'],
  ],
  '5. Pagamento e mensalidade': [
    ['pagamento_formas', 'Quais formas de pagamento vocês aceitam?', 'Dá pra pagar a mensalidade no cartão de crédito?', 'Como eu configuro o débito automático?', 'É possível parcelar a mensalidade?'],
    ['pagamento', 'Quando vence minha mensalidade?'],
    ['pagamento_atraso', 'O que acontece se eu atrasar o pagamento?', 'Tem multa por pagamento atrasado?', 'Meu plano pode ser cancelado por falta de pagamento?'],
    ['historico_pagamento', 'Onde vejo os pagamentos que já fiz?', 'Como consigo o comprovante de uma mensalidade paga?', 'Dá pra baixar o boleto de um mês anterior?'],
  ],
  '6. Perfil, plano e cadastro': [
    ['cadastro', 'Como eu atualizo meu telefone no cadastro?', 'Onde mudo meu endereço no app?', 'Posso trocar meu e-mail de contato?', 'Como corrijo meu nome se está errado no cadastro?'],
    ['carteirinha', 'Onde vejo o número da minha carteirinha?', 'Preciso levar a carteirinha física no médico?', 'Como emito uma segunda via da carteirinha?', 'A carteirinha digital vale em qualquer clínica credenciada?'],
    ['dependentes', 'Como eu adiciono meu filho no plano?', 'Onde vejo quem está incluído no plano familiar?', 'O que preciso pra incluir um dependente?'],
  ],
  '7. Privacidade e LGPD': [
    ['privacidade', 'Meus dados de saúde estão seguros nesse app?', 'Vocês seguem a LGPD?', 'Meus dados são compartilhados com terceiros?'],
    [['privacidade', 'compartilhamento_resultados'], 'Quem tem acesso ao meu histórico médico?'],
    ['excluir_conta', 'Como eu apago minha conta do app?', 'Dá pra excluir todos os meus dados?', 'Se eu sair do plano, meus dados somem do sistema?'],
  ],
  '8. Casos de borda': [
    ['emergencia', 'Estou com dor no peito, o que eu faço?', 'Isso é uma emergência, preciso de ajuda agora', 'Meu pai desmaiou, o que eu faço?', 'Estou com falta de ar, é grave?', 'tô passando mal', 'cadê o pronto-socorro mais perto'],
    ['clinico', 'Esse sintoma que estou sentindo pode ser o quê?', 'Posso tomar dipirona pra essa dor de cabeça?', 'Acha que eu preciso ir ao médico com essa tosse?', 'Esse resultado do meu exame está normal?'],
    ['atendente', 'Quero falar com uma pessoa de verdade', 'Isso aqui é só robô? Quero atendente', 'Como eu ligo pra central de atendimento?', 'Não consegui resolver, quero ajuda humana'],
    ['fora_de_escopo', 'Qual é a previsão do tempo pra amanhã?', 'Me conta uma piada', 'Quem ganhou o jogo ontem?', 'Você pode me ajudar com meu imposto de renda?'],
    [['saudacao', 'ajuda'], 'Oi', 'Boa tarde, tudo bem?', 'Olá, preciso de ajuda', 'E aí, você pode me ajudar?'],
    ['elogio_reclamacao', 'Esse app é muito bom, parabéns', 'Estou muito insatisfeito com o atendimento', 'Demorei muito pra conseguir marcar minha consulta', 'Adorei a facilidade de agendar exame pelo celular'],
  ],
  '9. Módulos do app': [
    ['telemedicina', 'Tem consulta por vídeo?', 'Como entro na sala da teleconsulta?'],
    ['proxima_consulta', 'Quando é minha próxima consulta?'],
    ['risco', 'O que é o plano de cuidado?'],
    ['perfil_saude', 'Quais são minhas alergias?', 'Qual meu tipo sanguíneo?'],
    ['compartilhamento_resultados', 'O médico vai ver meu exame?', 'Preciso levar o laudo na consulta?'],
    ['libras', 'Tem Libras no app?', 'Sou surdo, como uso o app?'],
    ['configuracoes', 'Como coloco o modo escuro?', 'Quero aumentar o tamanho da letra'],
    ['conversa_voz', 'Como converso por voz com a assistente?', 'A voz da assistente está baixa'],
    ['wallet', 'Dá pra colocar a carteirinha no Google Wallet?', 'Adicionar a carteirinha na carteira do iPhone'],
    ['notificacoes', 'Onde vejo minhas notificações?'],
    ['sessao', 'Por que o app me deslogou sozinho?'],
    ['carencia', 'Quanto tempo de carência eu tenho?'],
    ['cobertura', 'Meu plano cobre apartamento?'],
  ],
};

await login({ identificador: 'ana.souza@email.com', senha: 'jornada123' });

let total = 0;
const falhas = [];
for (const [bloco, grupos] of Object.entries(ROTEIRO)) {
  let acertosBloco = 0;
  let totalBloco = 0;
  for (const [esperada, ...perguntas] of grupos) {
    const aceitas = [esperada].flat();
    for (const pergunta of perguntas) {
      const { resposta } = await enviarPergunta(pergunta, { latenciaMs: 0 });
      total += 1;
      totalBloco += 1;
      if (aceitas.includes(resposta.intencao)) acertosBloco += 1;
      else falhas.push({ bloco, pergunta, esperada: aceitas.join(' ou '), obtida: resposta.intencao, texto: resposta.texto });
    }
  }
  console.log(`${acertosBloco === totalBloco ? 'ok   ' : 'FALHA'} ${bloco}: ${acertosBloco}/${totalBloco}`);
}

// Recomendação do roteiro: duas perguntas sem entender seguidas oferecem atendente.
await enviarPergunta('xpto qwerty', { latenciaMs: 0 });
const segunda = (await enviarPergunta('asdfgh zxcv', { latenciaMs: 0 })).resposta;
const ofereceHumano = segunda.whatsapp && /de novo/i.test(segunda.texto);
console.log(`${ofereceHumano ? 'ok   ' : 'FALHA'} 2 "não entendi" seguidos oferecem atendente`);
total += 1;
if (!ofereceHumano) falhas.push({ bloco: 'extra', pergunta: '2x não entendi', esperada: 'oferta de atendente', obtida: segunda.intencao, texto: segunda.texto });

console.log(`\n${total - falhas.length}/${total} perguntas na intenção certa.`);
falhas.forEach((f) => console.log(`\n- [${f.bloco}] "${f.pergunta}"\n  esperada: ${f.esperada} | obtida: ${f.obtida}\n  ${f.texto.slice(0, 120)}`));
process.exit(falhas.length ? 1 : 0);
