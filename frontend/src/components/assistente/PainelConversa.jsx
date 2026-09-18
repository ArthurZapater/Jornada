import { useEffect, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { MOLA } from '../ui/animacoes';
import { MOTIVOS_VOZ_RESERVA } from '../../hooks/useVozNatural';

const ROTULOS = {
  ouvindo: 'Ouvindo',
  pensando: 'Pensando…',
  falando: 'Respondendo',
  pausada: 'Pausado',
};

const DICAS = {
  ouvindo: 'Pode falar. Quando você parar, eu respondo.',
  pensando: 'Buscando nos seus dados.',
  falando: 'Toque na bolinha para me interromper.',
  pausada: 'Toque na bolinha para falar.',
};

const ACOES = {
  ouvindo: 'Terminei de falar',
  pensando: 'Aguarde a resposta',
  falando: 'Interromper e falar',
  pausada: 'Falar',
};

/**
 * Bolinha da conversa por voz, no lugar da barra de digitar. Enquanto o assistente
 * fala com a voz natural, ela pulsa com o volume do áudio; no resto, cada fase tem
 * seu movimento (respirar ao ouvir, girar ao pensar).
 */
function Bolinha({ fase, lerNivel, aoTocar }) {
  const bolinha = useRef(null);

  useEffect(() => {
    if (fase !== 'falando') {
      bolinha.current?.style.setProperty('--nivel', '0');
      return undefined;
    }
    let quadro;
    let suave = 0;
    const animar = () => {
      suave += (lerNivel() - suave) * 0.35;
      bolinha.current?.style.setProperty('--nivel', suave.toFixed(3));
      quadro = requestAnimationFrame(animar);
    };
    quadro = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(quadro);
  }, [fase, lerNivel]);

  return (
    <button
      type="button"
      onClick={aoTocar}
      disabled={fase === 'pensando'}
      aria-label={ACOES[fase]}
      className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full disabled:cursor-wait"
    >
      <span ref={bolinha} className={`orbe orbe--${fase}`} aria-hidden="true">
        <span className="orbe__aura" />
        <span className="orbe__nucleo" />
      </span>
    </button>
  );
}

/**
 * @param flutuante true fora do chat: o painel flutua sobre a tela, acima do menu.
 *   No chat, ele ocupa o lugar da barra de digitar.
 */
export default function PainelConversa({ conversa, flutuante = false }) {
  const { fase, legenda, parcial, erro, lerNivel, origemDaVoz, motivoDaVozReserva, encerrar, tocarNaBolinha } = conversa;

  useEffect(() => {
    const aoTeclar = (evento) => evento.key === 'Escape' && encerrar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [encerrar]);

  // Enquanto a pessoa fala, a legenda acompanha em tempo real.
  const textoLegenda = fase === 'ouvindo' && parcial ? parcial : legenda.texto;
  const autor = fase === 'ouvindo' && parcial ? 'voce' : legenda.autor;

  return (
    <motion.section
      aria-label="Conversa por voz"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={MOLA}
      className={`glass-strong rounded-[2rem] px-5 pb-4 pt-5 ${
        flutuante
          ? 'fixed inset-x-3 bottom-24 z-40 shadow-[0_24px_60px_-20px_rgb(14_42_37/0.55)] sm:left-auto sm:right-6 sm:w-[24rem] lg:bottom-6'
          : 'sticky bottom-24 lg:bottom-4'
      }`}
    >
      <button
        type="button"
        onClick={encerrar}
        aria-label="Encerrar conversa por voz"
        className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-salvia-600 transition hover:bg-salvia-100 hover:text-acento"
      >
        <X size={20} aria-hidden="true" />
      </button>

      <div className="flex flex-col items-center text-center">
        <Bolinha fase={fase} lerNivel={lerNivel} aoTocar={tocarNaBolinha} />
        <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-acento">
          {ROTULOS[fase]}
        </p>
        <p
          aria-live="polite"
          className={`mt-2 line-clamp-3 min-h-[3.75rem] max-w-xl text-[1.0625rem] leading-snug ${
            autor === 'voce' ? 'text-texto' : autor === 'assistente' ? 'text-salvia-600' : 'text-salvia-600'
          }`}
        >
          {textoLegenda ? (autor === 'voce' ? `“${textoLegenda}”` : textoLegenda) : DICAS[fase]}
        </p>
        {flutuante && legenda.autor === 'assistente' && legenda.link && !(fase === 'ouvindo' && parcial) && (
          <Link
            to={legenda.link.para}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-salvia-100 px-3 py-1.5 text-sm font-semibold text-acento transition hover:bg-salvia-200"
          >
            {legenda.link.rotulo} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
        {erro && (
          <p role="alert" className="mt-2 rounded-2xl bg-alerta-50 px-4 py-2 text-sm text-alerta-600">
            {erro}
          </p>
        )}
        <p className="mt-3 text-[0.6875rem] leading-snug text-salvia-600">
          {origemDaVoz === 'aparelho'
            ? `Voz do aparelho${motivoDaVozReserva ? `: ${MOTIVOS_VOZ_RESERVA[motivoDaVozReserva]}` : ''}. `
            : 'Voz natural gerada pela OpenAI, que recebe o texto das respostas. '}
          A fala é transcrita pelo navegador. Diga “tchau” para encerrar.
        </p>
      </div>
    </motion.section>
  );
}
