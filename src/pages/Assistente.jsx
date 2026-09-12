import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, AudioLines, Mic, Send, Sparkles, Square } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PainelConversa from '../components/assistente/PainelConversa';
import BotaoWhatsApp from '../components/ui/BotaoWhatsApp';
import IconTile from '../components/ui/IconTile';
import PageHeader from '../components/ui/PageHeader';
import { enviarPergunta, listarHistorico, saudacaoInicial } from '../services/chatbotService';
import { AO_TOCAR, MOLA, bolhaChat } from '../components/ui/animacoes';
import { useReconhecimentoDeFala } from '../hooks/useReconhecimentoDeFala';
import { conversaPorVozDisponivel, useConversaPorVoz } from '../hooks/useConversaPorVoz';
import { formatarHora } from '../utils/format';
import { CENTRAL_WHATSAPP, MENSAGEM_ATENDIMENTO } from '../utils/whatsapp';

export default function Assistente() {
  const [mensagens, setMensagens] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fim = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // O que foi dito na conversa por voz entra no chat, como se tivesse sido digitado.
  const registrarDaConversa = useCallback((interacao) => {
    setMensagens((atual) => [
      ...atual,
      { id: `u${interacao.id}`, autor: 'usuario', conteudo: { texto: interacao.pergunta }, dataHora: interacao.dataHora },
      { id: `b${interacao.id}`, autor: 'bot', conteudo: interacao.resposta, dataHora: interacao.dataHora },
    ]);
    setSugestoes(interacao.resposta.sugestoes);
  }, []);
  const conversa = useConversaPorVoz({ aoInteragir: registrarDaConversa });

  // Veio do botão "Conversar" de outra tela: começa já. O toque que trouxe a pessoa
  // até aqui ainda vale como gesto para liberar microfone e áudio.
  useEffect(() => {
    if (!location.state?.conversar) return;
    navigate(location.pathname, { replace: true, state: null });
    if (conversaPorVozDisponivel()) conversa.iniciar();
    // Só na chegada à tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let ativo = true;
    Promise.all([listarHistorico(), saudacaoInicial()]).then(([historico, saudacao]) => {
      if (!ativo) return;
      const anteriores = historico.flatMap((i) => [
        { id: `u${i.id}`, autor: 'usuario', conteudo: { texto: i.pergunta }, dataHora: i.dataHora },
        { id: `b${i.id}`, autor: 'bot', conteudo: i.resposta, dataHora: i.dataHora },
      ]);
      setMensagens([{ id: 'inicial', autor: 'bot', conteudo: saudacao, dataHora: new Date().toISOString() }, ...anteriores]);
      setSugestoes(historico.at(-1)?.resposta.sugestoes ?? saudacao.sugestoes);
    });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens, enviando]);

  // O que já estava escrito quando o microfone ligou: o ditado é somado a isso.
  const textoAntesDaFala = useRef('');

  const fala = useReconhecimentoDeFala({
    aoTranscrever: (trecho) => setTexto((atual) => (atual ? `${atual} ${trecho}` : trecho)),
    // Parou de falar, o assistente responde — sem precisar apertar enviar.
    aoConcluir: (ditado) => {
      const completo = [textoAntesDaFala.current.trim(), ditado].filter(Boolean).join(' ');
      setTexto('');
      perguntar(completo);
    },
  });

  function comecarConversa() {
    if (fala.ouvindo) fala.alternar();
    conversa.iniciar();
  }

  function alternarFala() {
    if (!fala.ouvindo) textoAntesDaFala.current = texto;
    fala.alternar();
  }

  async function perguntar(pergunta) {
    const limpa = pergunta.trim();
    if (!limpa || enviando) return;
    setTexto('');
    setSugestoes([]);
    setMensagens((atual) => [...atual, { id: `u-${Date.now()}`, autor: 'usuario', conteudo: { texto: limpa }, dataHora: new Date().toISOString() }]);
    setEnviando(true);
    try {
      const interacao = await enviarPergunta(limpa);
      setMensagens((atual) => [...atual, { id: `b-${interacao.id}`, autor: 'bot', conteudo: interacao.resposta, dataHora: interacao.dataHora }]);
      setSugestoes(interacao.resposta.sugestoes);
    } catch {
      setMensagens((atual) => [...atual, { id: `e-${Date.now()}`, autor: 'bot', conteudo: { texto: 'Não consegui responder agora. Tente de novo em instantes.' }, dataHora: new Date().toISOString() }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col">
      <PageHeader
        titulo="Assistente Jornada"
        subtitulo="Tire dúvidas sobre consultas, exames e seu plano."
        acao={
          <BotaoWhatsApp mensagem={MENSAGEM_ATENDIMENTO} numero={CENTRAL_WHATSAPP}>
            <span className="hidden sm:inline">Atendente</span>
            <span className="sr-only sm:hidden">Falar com atendente</span>
          </BotaoWhatsApp>
        }
      />

      <div className="flex-1 space-y-3 pb-4" role="log" aria-live="polite" aria-label="Conversa com o assistente">
        {mensagens.map((m) => (
          <Mensagem key={m.id} mensagem={m} />
        ))}
        {enviando && (
          <p className="glass-strong w-fit rounded-3xl rounded-bl-lg px-4 py-3 text-sm text-salvia-600" aria-label="Assistente digitando">
            digitando…
          </p>
        )}
        <div ref={fim} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {conversa.ativa ? (
          <PainelConversa key="conversa" conversa={conversa} />
        ) : (
          <motion.div key="digitar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={MOLA}>
            {sugestoes.length > 0 && (
              // Espaço à direita: o botão de conversar flutua acima do enviar.
              <div className="mb-3 flex flex-wrap gap-2 pr-14">
                {sugestoes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => perguntar(s)}
                    className="rounded-full bg-superficie/75 px-4 py-2 text-sm font-medium text-acento ring-1 ring-borda transition hover:bg-superficie"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {(fala.ouvindo || fala.erro) && (
              <p
                role="status"
                className={`mb-2 mr-14 rounded-2xl px-4 py-2 text-sm ${fala.erro ? 'bg-alerta-50 text-alerta-600' : 'glass-strong text-salvia-600'}`}
              >
                {fala.erro ?? (fala.parcial ? `"${fala.parcial}"` : 'Ouvindo… quando você parar de falar, eu respondo.')}
              </p>
            )}

            <div className="sticky bottom-24 lg:bottom-4">
              {conversaPorVozDisponivel() && (
                <motion.button
                  type="button"
                  onClick={comecarConversa}
                  whileTap={AO_TOCAR}
                  aria-label="Conversar por voz com o assistente"
                  title="Conversar por voz"
                  className="orbe-botao absolute bottom-full right-2 mb-3 grid h-11 w-11 place-items-center overflow-hidden rounded-full text-white shadow-[0_12px_24px_-12px_rgb(20_58_51/0.9)]"
                >
                  <AudioLines size={19} aria-hidden="true" className="relative" />
                </motion.button>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  perguntar(texto);
                }}
                className="glass-strong flex items-center gap-2 rounded-full p-2 pl-5"
              >
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  aria-label="Sua mensagem"
                  className="h-10 w-full min-w-0 bg-transparent text-[0.9375rem] outline-none placeholder:text-salvia-600"
                />
                {fala.suportado && (
                  <button
                    type="button"
                    onClick={alternarFala}
                    aria-pressed={fala.ouvindo}
                    aria-label={fala.ouvindo ? 'Parar de gravar' : 'Falar em vez de digitar'}
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${
                      fala.ouvindo ? 'animate-pulse bg-alerta-100 text-alerta-600' : 'text-acento hover:bg-salvia-100'
                    }`}
                  >
                    {fala.ouvindo ? <Square size={16} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!texto.trim() || enviando}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-petroleo-800 text-white transition hover:bg-petroleo-700 disabled:opacity-40"
                  aria-label="Enviar mensagem"
                >
                  <Send size={18} aria-hidden="true" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-3 text-center text-xs text-salvia-600">
        Assistente por regras, sem diagnóstico médico. Em emergência, ligue 192.
        {fala.suportado && ' A transcrição da fala é feita pelo serviço de voz do navegador, que pode enviar o áudio para os servidores dele.'}
      </p>
    </div>
  );
}

function Mensagem({ mensagem: { autor, conteudo, dataHora } }) {
  const doBot = autor === 'bot';
  return (
    <motion.div {...bolhaChat} className={`flex gap-2 ${doBot ? '' : 'justify-end'}`}>
      {doBot && <IconTile icone={Sparkles} tamanho="sm" className="mt-1" />}
      <div
        className={`max-w-[80%] rounded-3xl px-4 py-3 ${
          doBot ? 'glass-strong rounded-bl-lg' : 'rounded-br-lg bg-petroleo-800 text-white'
        }`}
      >
        <p className="whitespace-pre-line">{conteudo.texto}</p>
        {conteudo.itens?.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {conteudo.itens.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true">•</span>
                {item}
              </li>
            ))}
          </ul>
        )}
        {conteudo.whatsapp && (
          <BotaoWhatsApp mensagem={MENSAGEM_ATENDIMENTO} numero={CENTRAL_WHATSAPP} className="mt-3 mr-2" />
        )}
        {conteudo.link && (
          <Link
            to={conteudo.link.para}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-salvia-100 px-3 py-1.5 text-sm font-semibold text-acento transition hover:bg-salvia-200"
          >
            {conteudo.link.rotulo} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
        <p className={`mt-1.5 text-[0.6875rem] ${doBot ? 'text-salvia-600' : 'text-white/70'}`}>{formatarHora(dataHora)}</p>
      </div>
    </motion.div>
  );
}
