import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, LoaderCircle, Mic, MicOff, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import BotaoWhatsApp from '../ui/BotaoWhatsApp';
import Button from '../ui/Button';
import { MOLA, MOLA_SUAVE, bolhaChat } from '../ui/animacoes';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferencias } from '../../contexts/PreferenciasContext';
import { sinalizarAtividade } from '../../hooks/useInatividade';
import { useReconhecimentoDeFala } from '../../hooks/useReconhecimentoDeFala';
import { useSinteseDeFala } from '../../hooks/useSinteseDeFala';
import { enviarPergunta } from '../../services/chatbotService';
import { normalizar } from '../../utils/format';
import { comoChamar } from '../../utils/perfilSaude';
import { CENTRAL_WHATSAPP, MENSAGEM_ATENDIMENTO } from '../../utils/whatsapp';

// Conversa por voz: a pessoa fala, o assistente responde falando e volta a ouvir.
// As respostas são as MESMAS do chat (enviarPergunta), e cada troca entra no
// histórico — abrir o chat depois mostra a conversa inteira.
//
// Cuidados com o microfone num ciclo automático:
// - só começa com um toque (o botão que abre esta tela);
// - só ouve depois que a voz do assistente termina, para não transcrever a si mesmo;
// - silêncio pausa a conversa em vez de religar o microfone sem fim;
// - sair da aba ou fechar a tela desliga tudo na hora.

/** "Tchau", "pode parar", "era só isso"... encerram a conversa sem tocar na tela. */
const PEDIDO_PARA_ENCERRAR = /^(tchau|ate mais|ate logo|encerrar|encerra|pode parar|parar|sair|so isso|era so isso|obrigad[oa],? (era )?so isso)\b/;

const FASES = {
  saudando: { rotulo: 'Oi!', dica: 'Já vou te ouvir.', acao: 'Falar agora' },
  ouvindo: { rotulo: 'Estou ouvindo', dica: 'Pode perguntar. Quando você parar de falar, eu respondo.', acao: 'Terminei de falar' },
  pensando: { rotulo: 'Pensando…', dica: 'Buscando nos seus dados.', acao: 'Aguarde' },
  falando: { rotulo: 'Respondendo', dica: 'Toque no círculo para me interromper.', acao: 'Interromper e falar' },
  pausado: { rotulo: 'Conversa pausada', dica: 'Toque no círculo quando quiser falar.', acao: 'Falar' },
};

/** O que vai para a voz: texto e itens, sem os sinais que soam estranhos lidos em voz alta. */
function textoParaFala(resposta) {
  return [resposta.texto, ...(resposta.itens ?? [])]
    .map((trecho) => trecho.replace(/\s+—\s+/g, ', ').replace(/(\p{L})\/(\p{Lu}{2})\b/gu, '$1, $2').trim())
    .map((trecho) => (/[.!?]$/.test(trecho) ? trecho : `${trecho}.`))
    .join(' ');
}

export default function ConversaPorVoz({ aberta, aoFechar, aoInteragir }) {
  return createPortal(
    <AnimatePresence>{aberta && <Painel aoFechar={aoFechar} aoInteragir={aoInteragir} />}</AnimatePresence>,
    document.body,
  );
}

function Painel({ aoFechar, aoInteragir }) {
  const { usuario } = useAuth();
  const { preferencias } = usePreferencias();
  const [fase, setFase] = useState('saudando');
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState(null);
  const ativo = useRef(false);
  const interagir = useRef(aoInteragir);
  const fechar = useRef(aoFechar);
  const botaoFechar = useRef(null);

  useEffect(() => {
    interagir.current = aoInteragir;
    fechar.current = aoFechar;
  }, [aoInteragir, aoFechar]);

  const voz = useSinteseDeFala({ vozURI: preferencias.vozURI, velocidade: preferencias.velocidadeVoz });
  const fala = useReconhecimentoDeFala({
    aoConcluir: (ditado) => responder(ditado),
    aoEncerrarSemFala: () => ativo.current && setFase((atual) => (atual === 'ouvindo' ? 'pausado' : atual)),
  });

  function ouvir() {
    if (!ativo.current) return;
    voz.parar();
    setFase(fala.iniciar() ? 'ouvindo' : 'pausado');
  }

  async function falarEOuvir(texto) {
    setFase('falando');
    const terminou = await voz.falar(texto);
    // Interrompida (toque, fechar, nova fala) não religa o microfone.
    if (terminou && ativo.current) ouvir();
  }

  async function responder(ditado) {
    if (!ativo.current) return;
    sinalizarAtividade();
    setPergunta(ditado);

    if (PEDIDO_PARA_ENCERRAR.test(normalizar(ditado))) {
      const despedida = { texto: 'Até mais! Quando precisar, é só chamar.' };
      setResposta(despedida);
      setFase('falando');
      await voz.falar(despedida.texto);
      if (ativo.current) encerrar();
      return;
    }

    setResposta(null);
    setFase('pensando');
    try {
      const interacao = await enviarPergunta(ditado);
      if (!ativo.current) return;
      interagir.current?.(interacao);
      setResposta(interacao.resposta);
      falarEOuvir(textoParaFala(interacao.resposta));
    } catch {
      if (!ativo.current) return;
      const falha = { texto: 'Não consegui responder agora. Tente de novo em instantes.' };
      setResposta(falha);
      falarEOuvir(falha.texto);
    }
  }

  // Desliga na hora: a tela ainda fica montada durante a animação de saída, e o
  // microfone não pode continuar aberto nesse meio-tempo.
  function encerrar() {
    ativo.current = false;
    fala.cancelar();
    voz.parar();
    fechar.current();
  }

  function tocarNoCirculo() {
    if (fase === 'ouvindo') fala.parar(); // entrega o que já foi dito
    else if (fase !== 'pensando') ouvir();
  }

  // Abre cumprimentando pelo nome e, quando a voz acaba, passa a ouvir.
  useEffect(() => {
    ativo.current = true;
    const saudacao = { texto: `Oi, ${comoChamar(usuario)}! Pode falar, estou ouvindo.` };
    setResposta(saudacao);
    falarEOuvir(saudacao.texto);
    return () => {
      ativo.current = false;
    };
    // Só na abertura; as funções usadas leem refs e setters estáveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tela modal: foco no fechar, Esc fecha, rolagem do fundo presa, foco devolvido.
  useEffect(() => {
    const anterior = document.activeElement;
    botaoFechar.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const aoTeclar = (evento) => evento.key === 'Escape' && encerrar();
    // Aba em segundo plano: nada de microfone aberto nem voz falando sozinha.
    const aoEsconder = () => {
      if (!document.hidden) return;
      fala.cancelar();
      voz.parar();
      setFase('pausado');
    };
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('visibilitychange', aoEsconder);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
    // encerrar só usa refs e funções estáveis dos hooks de voz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fala.cancelar, voz.parar]);

  const info = FASES[fase];

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conversa-voz-titulo"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={MOLA_SUAVE}
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-salvia-50/95 backdrop-blur-xl"
    >
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
        <header className="flex items-center justify-between gap-3">
          <h2 id="conversa-voz-titulo" className="font-semibold">
            Conversa com o assistente
          </h2>
          <button
            ref={botaoFechar}
            type="button"
            onClick={encerrar}
            aria-label="Encerrar conversa por voz"
            className="grid h-11 w-11 place-items-center rounded-full bg-superficie/75 text-acento ring-1 ring-borda transition hover:bg-superficie"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <p role="status" aria-live="polite" className="text-2xl font-semibold tracking-tight">
            {info.rotulo}
          </p>
          <p className="mt-1 min-h-10 max-w-xs text-sm text-salvia-600">{info.dica}</p>

          <div className="relative mt-8 grid h-48 w-48 place-items-center">
            {fase === 'ouvindo' && (
              <span className="absolute inset-3 animate-ping rounded-full bg-petroleo-600/25" aria-hidden="true" />
            )}
            <motion.button
              type="button"
              onClick={tocarNoCirculo}
              disabled={fase === 'pensando'}
              aria-label={info.acao}
              animate={{ scale: fase === 'ouvindo' ? 1.06 : fase === 'pensando' ? 0.94 : 1 }}
              whileTap={{ scale: 0.92 }}
              transition={MOLA}
              className="relative grid h-40 w-40 place-items-center rounded-full bg-linear-to-br from-petroleo-700 to-petroleo-900 text-white shadow-[0_24px_48px_-20px_rgb(20_58_51/0.9)] disabled:cursor-wait"
            >
              {fase === 'falando' || fase === 'saudando' ? (
                <span className="onda-voz flex items-center gap-1.5" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              ) : fase === 'pensando' ? (
                <LoaderCircle size={44} className="animate-spin" aria-hidden="true" />
              ) : fase === 'pausado' ? (
                <MicOff size={44} aria-hidden="true" />
              ) : (
                <Mic size={48} aria-hidden="true" />
              )}
            </motion.button>
          </div>

          <p className="mt-6 min-h-12 max-w-md text-lg text-salvia-600" aria-live="polite">
            {fase === 'ouvindo' && fala.parcial ? `"${fala.parcial}"` : ''}
          </p>

          {fala.erro && (
            <p role="alert" className="mt-2 rounded-2xl bg-alerta-50 px-4 py-2 text-sm text-alerta-600">
              {fala.erro}
            </p>
          )}
        </div>

        <div className="space-y-3" aria-live="polite">
          <AnimatePresence initial={false}>
            {pergunta && (
              <motion.p key={`p-${pergunta}`} {...bolhaChat} className="ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-lg bg-petroleo-800 px-4 py-3 text-white">
                {pergunta}
              </motion.p>
            )}
          </AnimatePresence>
          {resposta && (
            <motion.div key={resposta.texto} {...bolhaChat} className="glass-strong max-w-[92%] rounded-3xl rounded-bl-lg px-4 py-3">
              <p>{resposta.texto}</p>
              {resposta.itens?.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {resposta.itens.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {(resposta.link || resposta.whatsapp) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {resposta.link && (
                    <Link
                      to={resposta.link.para}
                      onClick={encerrar}
                      className="inline-flex items-center gap-1.5 rounded-full bg-salvia-100 px-3 py-1.5 text-sm font-semibold text-acento transition hover:bg-salvia-200"
                    >
                      {resposta.link.rotulo} <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  )}
                  {resposta.whatsapp && <BotaoWhatsApp mensagem={MENSAGEM_ATENDIMENTO} numero={CENTRAL_WHATSAPP} />}
                </div>
              )}
            </motion.div>
          )}
        </div>

        <Button variante="secundario" bloco className="mt-6" onClick={encerrar}>
          Encerrar conversa
        </Button>
        <p className="mt-3 text-center text-xs text-salvia-600">
          Diga "tchau" para encerrar. A fala é transcrita pelo serviço de voz do navegador, e as respostas ficam no
          histórico do chat. Sem diagnóstico médico; em emergência, ligue 192.
        </p>
      </div>
    </motion.div>
  );
}
