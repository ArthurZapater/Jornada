import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Mic, Send, Sparkles, Square } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import BotaoWhatsApp from '../components/ui/BotaoWhatsApp';
import IconTile from '../components/ui/IconTile';
import PageHeader from '../components/ui/PageHeader';
import { enviarPergunta, listarHistorico, saudacaoInicial } from '../services/chatbotService';
import { bolhaChat } from '../components/ui/animacoes';
import { useReconhecimentoDeFala } from '../hooks/useReconhecimentoDeFala';
import { formatarHora } from '../utils/format';
import { CENTRAL_WHATSAPP, MENSAGEM_ATENDIMENTO } from '../utils/whatsapp';

export default function Assistente() {
  const [mensagens, setMensagens] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fim = useRef(null);

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
        acao={<BotaoWhatsApp mensagem={MENSAGEM_ATENDIMENTO} numero={CENTRAL_WHATSAPP}>Atendente</BotaoWhatsApp>}
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

      {sugestoes.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
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
          className={`mb-2 rounded-2xl px-4 py-2 text-sm ${fala.erro ? 'bg-alerta-50 text-alerta-600' : 'glass-strong text-salvia-600'}`}
        >
          {fala.erro ?? (fala.parcial ? `"${fala.parcial}"` : 'Ouvindo… quando você parar de falar, eu respondo.')}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          perguntar(texto);
        }}
        className="glass-strong sticky bottom-24 flex items-center gap-2 rounded-full p-2 pl-5 lg:bottom-4"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite sua mensagem..."
          aria-label="Sua mensagem"
          className="h-10 w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-salvia-600"
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
        <p className={`mt-1.5 text-[11px] ${doBot ? 'text-salvia-600' : 'text-white/70'}`}>{formatarHora(dataHora)}</p>
      </div>
    </motion.div>
  );
}
