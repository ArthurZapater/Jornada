// Integração com o WhatsApp por link (wa.me): o app monta a conversa já escrita e
// quem aperta "enviar" é o usuário. Não exige chave, conta Business nem servidor,
// e nada sai daqui sem uma ação dele.
//
// Mandar mensagem sozinho (lembrete de consulta, aviso de resultado) é outra
// história: precisa da Cloud API da Meta, com número dedicado, modelos aprovados e
// um servidor guardando o token — token em código de navegador é token público.
// Fica para quando o backend existir; o README explica a arquitetura.
//
// LGPD: dado de saúde é dado sensível (art. 11) e mensagem aparece na tela de
// bloqueio, à vista de quem estiver por perto. Por isso nenhuma mensagem daqui
// leva resultado, diagnóstico, valor de exame ou nome de procedimento: só avisa
// que há novidade no app, que fica atrás do login.

import { formatarDataLonga, formatarHora, somenteDigitos } from './format';

/**
 * Central de atendimento, só dígitos e com DDI (ex.: '5511999999999').
 *
 * Vazio de propósito: sem número, o link abre o WhatsApp com a mensagem pronta
 * para o usuário escolher o destinatário — assim a demonstração funciona sem
 * depender de uma linha de verdade. Preenchendo aqui, os botões de atendimento
 * passam a cair direto nessa conversa.
 */
export const CENTRAL_WHATSAPP = '';

/** Monta o link do WhatsApp. Sem número, o próprio app pede o contato. */
export function linkWhatsApp(mensagem, numero = '') {
  return `https://wa.me/${somenteDigitos(numero)}?text=${encodeURIComponent(mensagem)}`;
}

export const MENSAGEM_ATENDIMENTO = 'Olá! Vim pelo app Jornada e gostaria de falar com o atendimento.';

/** Detalhes da consulta para mandar a quem vai acompanhar o beneficiário. */
export function mensagemConsulta(consulta) {
  return [
    `Consulta de ${consulta.especialidade.nome} marcada pelo app Jornada:`,
    `${formatarDataLonga(consulta.dataHora)}, às ${formatarHora(consulta.dataHora)}`,
    `${consulta.medico.nome}`,
    `${consulta.unidade.nome} — ${consulta.unidade.endereco}`,
  ].join('\n');
}

export function mensagemUnidade(unidade) {
  return `Olá! Vim pelo app Jornada e gostaria de falar com a ${unidade.nome} (${unidade.endereco}).`;
}

/**
 * Aviso de resultado liberado. Sem o nome do exame de propósito: o próprio
 * procedimento já entrega informação clínica (um exame de HIV diz muito antes de
 * qualquer valor). Quem quiser ver, abre o app.
 */
export const MENSAGEM_RESULTADO_DISPONIVEL =
  'Meu resultado de exame já está disponível no app Jornada. Vou conferir por lá.';
