import { useState } from 'react';
import { ArrowRight, Check, CircleCheck, Copy, CreditCard, History, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/brand/Logo';
import Button from '../components/ui/Button';
import { Carregando, MensagemErro } from '../components/ui/Feedback';
import LeafArt from '../components/ui/LeafArt';
import PageHeader from '../components/ui/PageHeader';
import SecurityNote from '../components/ui/SecurityNote';
import { useNotificacoes } from '../contexts/NotificacoesContext';
import { useAsync } from '../hooks/useAsync';
import { FORMAS_PAGAMENTO, obterResumo, pagar } from '../services/pagamentoService';
import { formatarData, formatarMoeda } from '../utils/format';

const CHAVE_PIX = 'jornada@unimed.demo';

export default function Pagamento() {
  const resumo = useAsync(obterResumo, []);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Pagamento do convênio" subtitulo="Mensalidade, formas de pagamento e situação do plano." />
      {resumo.carregando && !resumo.dados ? (
        <Carregando />
      ) : resumo.erro ? (
        <MensagemErro mensagem={resumo.erro.message} onTentarNovamente={resumo.recarregar} />
      ) : (
        <Conteudo resumo={resumo.dados} aoPagar={resumo.recarregar} />
      )}
    </div>
  );
}

function Conteudo({ resumo, aoPagar }) {
  const { carregar: atualizarNotificacoes } = useNotificacoes();
  const [forma, setForma] = useState('PIX');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [pago, setPago] = useState(null);

  async function confirmar() {
    setEnviando(true);
    setErro('');
    try {
      setPago(await pagar({ mensalidadeId: resumo.mensalidade.id, formaPagamento: forma }));
      atualizarNotificacoes();
      aoPagar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function copiarChave() {
    try {
      await navigator.clipboard.writeText(CHAVE_PIX);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro(`Não foi possível copiar. Chave Pix: ${CHAVE_PIX}`);
    }
  }

  if (pago) {
    return (
      <div className="glass-strong rounded-[2rem] p-8 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-petroleo-800 text-white">
          <Check size={30} strokeWidth={2.6} aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold">Pagamento confirmado</h2>
        <p className="mt-2 text-salvia-600">
          Mensalidade {pago.rotuloCompetencia} — {pago.valorFormatado} via {pago.rotuloForma}.
        </p>
        <div className="mt-6 grid gap-3">
          <Button as={Link} to="/pagamento/historico" bloco tamanho="lg" icone={History}>Ver histórico</Button>
          <Button as={Link} to="/" variante="secundario" bloco>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  if (!resumo.mensalidade) {
    return (
      <div className="space-y-4">
        <CartaoPlano resumo={resumo} />
        <div className="glass-strong flex items-center gap-4 rounded-3xl p-5">
          <CircleCheck size={28} className="shrink-0 text-petroleo-700" aria-hidden="true" />
          <p>
            <span className="block font-semibold">Nenhuma mensalidade em aberto</span>
            <span className="text-sm text-salvia-600">Seu plano está em dia. Obrigado!</span>
          </p>
        </div>
        <Button as={Link} to="/pagamento/historico" bloco tamanho="lg" icone={History} iconeFim={ArrowRight}>
          Ver histórico de pagamentos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CartaoPlano resumo={resumo} />

      <div className="grid grid-cols-3 gap-3">
        <MiniCard rotulo="Situação" valor={resumo.emDia ? 'Em dia' : 'Em atraso'} destaque={resumo.emDia} />
        <MiniCard rotulo="Parcelas em aberto" valor={`${resumo.parcelasEmAberto} parcela${resumo.parcelasEmAberto === 1 ? '' : 's'}`} />
        <MiniCard rotulo="Próx. venc." valor={resumo.diasParaVencimento >= 0 ? `${resumo.diasParaVencimento} dias` : 'Vencida'} />
      </div>

      <section aria-labelledby="formas">
        <h2 id="formas" className="mb-3 text-xs font-semibold uppercase tracking-wider text-salvia-600">Forma de pagamento</h2>
        <div className="grid grid-cols-2 gap-3">
          {FORMAS_PAGAMENTO.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setForma(f.id)}
              aria-pressed={forma === f.id}
              className={`rounded-3xl p-4 text-left ring-1 transition ${
                forma === f.id ? 'bg-salvia-100 ring-petroleo-700' : 'bg-white/70 ring-white hover:bg-white'
              }`}
            >
              <span className="block font-semibold">{f.rotulo}</span>
              <span className="block text-sm text-salvia-600">{f.descricao}</span>
            </button>
          ))}
        </div>
      </section>

      {forma === 'PIX' && (
        <section className="glass-strong flex flex-col items-center gap-3 rounded-3xl p-5 text-center">
          <span className="grid h-32 w-32 place-items-center rounded-2xl bg-white ring-1 ring-salvia-200" aria-hidden="true">
            <QrCode size={88} className="text-petroleo-900" />
          </span>
          <p className="text-sm text-salvia-600">QR Code Pix gerado (simulação)</p>
          <Button variante="secundario" tamanho="sm" icone={copiado ? Check : Copy} onClick={copiarChave}>
            {copiado ? 'Chave copiada' : 'Copiar chave Pix'}
          </Button>
        </section>
      )}

      <section className="glass-strong rounded-3xl p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-salvia-600">Total a pagar</p>
            <p className="text-sm text-salvia-600">Mensalidade — {resumo.mensalidade.rotuloCompetencia}</p>
          </div>
          <p className="text-2xl font-semibold">{resumo.mensalidade.valorFormatado}</p>
        </div>
        {erro && <p role="alert" className="mt-3 rounded-2xl bg-alerta-50 px-4 py-3 text-sm text-alerta-600">{erro}</p>}
        <Button className="mt-4" bloco tamanho="lg" icone={Check} carregando={enviando} onClick={confirmar}>
          Confirmar pagamento
        </Button>
        <p className="mt-3 text-center text-xs text-salvia-600">
          Simulação: nenhum dado de cartão ou conta bancária é solicitado ou armazenado.
        </p>
      </section>

      <Button as={Link} to="/pagamento/historico" variante="secundario" bloco icone={History}>
        Ver histórico de pagamentos
      </Button>
      <SecurityNote />
    </div>
  );
}

function CartaoPlano({ resumo }) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-petroleo-600 via-petroleo-800 to-petroleo-950 p-6 text-white shadow-[0_24px_40px_-24px_rgb(14_42_37/0.9)]">
      <LeafArt tom="escuro" className="-right-10 -top-6 h-52 w-80" />
      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold">
          <LogoMark variante="claro" className="h-6 w-6" /> {resumo.plano}
        </span>
        <CreditCard size={20} className="text-white/80" aria-hidden="true" />
      </div>
      <p className="relative mt-6 text-xs uppercase tracking-widest text-white/75">
        {resumo.mensalidade ? 'Mensalidade atual' : 'Total pago no ano'}
      </p>
      <p className="relative text-3xl font-semibold">
        {resumo.mensalidade ? resumo.mensalidade.valorFormatado : formatarMoeda(resumo.totalPagoNoAno)}
      </p>
      {resumo.mensalidade && (
        <p className="relative mt-2 text-sm text-white/85">Vencimento em {formatarData(resumo.mensalidade.vencimento)}</p>
      )}
    </section>
  );
}

function MiniCard({ rotulo, valor, destaque = false }) {
  return (
    <div className="glass-strong rounded-2xl p-3 text-center">
      <p className="text-[11px] font-medium text-salvia-600">{rotulo}</p>
      <p className={`mt-0.5 font-semibold ${destaque ? 'text-petroleo-800' : ''}`}>{valor}</p>
    </div>
  );
}
