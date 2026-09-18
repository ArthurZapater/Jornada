import { ArrowRight, BellOff, CalendarCheck, CheckCheck, CreditCard, FileText, FlaskConical, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Carregando, Vazio } from '../components/ui/Feedback';
import IconTile from '../components/ui/IconTile';
import PageHeader from '../components/ui/PageHeader';
import { useNotificacoes } from '../contexts/NotificacoesContext';
import { tempoRelativo } from '../utils/format';

const ICONES = {
  CONSULTA: CalendarCheck,
  EXAME: FlaskConical,
  RESULTADO: FileText,
  PAGAMENTO: CreditCard,
  ENCAMINHAMENTO: ArrowRight,
  SISTEMA: Sparkles,
};

export default function Notificacoes() {
  const navigate = useNavigate();
  const { notificacoes, naoLidas, carregando, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();

  function abrir(n) {
    if (!n.lida) marcarComoLida(n.id);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Notificações"
        subtitulo={naoLidas ? `${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}` : 'Tudo em dia por aqui.'}
        acao={
          naoLidas > 0 && (
            <button
              type="button"
              onClick={marcarTodasComoLidas}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-acento hover:bg-superficie/70"
            >
              <CheckCheck size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Marcar todas como lidas</span>
              <span className="sm:hidden">Ler todas</span>
            </button>
          )
        }
      />
      {carregando && !notificacoes.length ? (
        <Carregando />
      ) : !notificacoes.length ? (
        <Vazio icone={BellOff} titulo="Nenhuma notificação" descricao="Avisos de consultas, resultados e lembretes aparecem aqui." />
      ) : (
        <ul className="space-y-3">
          {notificacoes.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => abrir(n)}
                className={`flex w-full items-start gap-4 rounded-3xl p-4 text-left ring-1 transition ${
                  n.lida ? 'bg-superficie/50 ring-borda/70 hover:bg-superficie/70' : 'glass-strong bg-salvia-100/80 ring-borda hover:bg-superficie/90'
                }`}
              >
                <IconTile icone={ICONES[n.tipo] ?? Sparkles} tom={n.lida ? 'vidro' : 'verde'} tamanho="sm" />
                <span className="min-w-0 flex-1">
                  {/* flex-wrap: sem espaço (tela estreita, texto grande), a data desce em vez de empurrar o cartão. */}
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className={`min-w-0 break-words hyphens-auto ${n.lida ? 'font-medium' : 'font-semibold'}`}>{n.titulo}</span>
                    <span className="shrink-0 text-xs text-salvia-600">{tempoRelativo(n.dataCriacao)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-salvia-600">{n.mensagem}</span>
                </span>
                {!n.lida && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-petroleo-800" aria-label="Não lida" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
