// Módulo "pagamento": mensalidade do convênio e histórico.
//
// SIMULAÇÃO: nenhum dado de pagamento real é solicitado, transmitido ou
// armazenado. Não há campo de número de cartão, CVV ou conta bancária — o
// usuário apenas escolhe a forma e o app registra a mensalidade como paga.
import { getDb, porId, salvar } from './mockDb';
import { ApiError, idLogado, simularRequisicao } from './http';
import { criarNotificacao } from './notificacaoService';
import { formatarCompetencia, formatarMoeda, parseData, toISODate } from '../utils/format';

export const FORMAS_PAGAMENTO = [
  { id: 'PIX', rotulo: 'Pix', descricao: 'Instantâneo' },
  { id: 'CARTAO', rotulo: 'Cartão de crédito', descricao: 'Até 3x sem juros' },
  { id: 'BOLETO', rotulo: 'Boleto bancário', descricao: 'Venc. em 2 dias úteis' },
  { id: 'DEBITO_AUTOMATICO', rotulo: 'Débito automático', descricao: 'Configurar conta' },
];

export const ROTULO_FORMA = Object.fromEntries(FORMAS_PAGAMENTO.map((f) => [f.id, f.rotulo]));

const diasAte = (data) => Math.ceil((parseData(data) - new Date().setHours(0, 0, 0, 0)) / 86400000);

function paraMensalidadeDTO(m) {
  return {
    id: m.id,
    competencia: m.competencia,
    rotuloCompetencia: formatarCompetencia(m.competencia),
    valor: m.valor,
    valorFormatado: formatarMoeda(m.valor),
    vencimento: m.vencimento,
    status: m.status,
    formaPagamento: m.formaPagamento,
    rotuloForma: m.formaPagamento ? ROTULO_FORMA[m.formaPagamento] : null,
    dataPagamento: m.dataPagamento,
  };
}

export function obterResumo() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    const beneficiario = porId(db.beneficiarios, id);
    const minhas = db.mensalidades.filter((m) => m.beneficiarioId === id);
    const emAberto = minhas.filter((m) => m.status === 'EM_ABERTO').sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    const proxima = emAberto[0] ?? null;
    const anoAtual = String(new Date().getFullYear());

    return {
      plano: beneficiario.plano,
      carteirinha: beneficiario.carteirinha,
      mensalidade: proxima ? paraMensalidadeDTO(proxima) : null,
      parcelasEmAberto: emAberto.length,
      diasParaVencimento: proxima ? diasAte(proxima.vencimento) : null,
      emDia: emAberto.every((m) => diasAte(m.vencimento) >= 0),
      totalPagoNoAno: minhas
        .filter((m) => m.status !== 'EM_ABERTO' && m.dataPagamento?.startsWith(anoAtual))
        .reduce((soma, m) => soma + m.valor, 0),
    };
  });
}

export function listarHistorico() {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    return db.mensalidades
      .filter((m) => m.beneficiarioId === id && m.status !== 'EM_ABERTO')
      .sort((a, b) => b.competencia.localeCompare(a.competencia))
      .map(paraMensalidadeDTO);
  });
}

/** Confirma o pagamento simulado da mensalidade. */
export function pagar({ mensalidadeId, formaPagamento }) {
  return simularRequisicao(async () => {
    const db = await getDb();
    const id = idLogado();
    if (!FORMAS_PAGAMENTO.some((f) => f.id === formaPagamento)) {
      throw new ApiError('Forma de pagamento inválida.', 422);
    }
    const mensalidade = porId(db.mensalidades, mensalidadeId);
    if (!mensalidade || mensalidade.beneficiarioId !== id) throw new ApiError('Mensalidade não encontrada.', 404);
    if (mensalidade.status !== 'EM_ABERTO') throw new ApiError('Esta mensalidade já está paga.', 409);

    const hoje = toISODate(new Date());
    mensalidade.status = hoje > mensalidade.vencimento ? 'PAGA_COM_ATRASO' : 'PAGA';
    mensalidade.formaPagamento = formaPagamento;
    mensalidade.dataPagamento = hoje;
    criarNotificacao(db, id, {
      tipo: 'PAGAMENTO',
      titulo: 'Pagamento confirmado',
      mensagem: `Mensalidade ${formatarCompetencia(mensalidade.competencia)} — ${formatarMoeda(mensalidade.valor)} via ${ROTULO_FORMA[formaPagamento]}.`,
      link: '/pagamento',
    });
    salvar(db);
    return paraMensalidadeDTO(mensalidade);
  }, 700);
}
