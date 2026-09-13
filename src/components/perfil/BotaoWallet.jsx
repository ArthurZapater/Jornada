import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Info, Wallet, X } from 'lucide-react';
import { LogoMark } from '../brand/Logo';
import CodigoBarras from './CodigoBarras';
import { AO_TOCAR, MOLA_SUAVE } from '../ui/animacoes';
import { PLANO } from '../../utils/plano';

// "Adicionar à Carteira" — SÓ DEMONSTRAÇÃO.
//
// De verdade, o cartão da Apple Wallet (.pkpass) e o do Google Wallet (JWT) precisam ser
// assinados com credenciais do emissor guardadas num servidor (conta Apple Developer e
// conta de emissor do Google). Este protótipo não tem isso: o botão mostra como o
// cartão ficaria na Carteira e diz com clareza que nada foi adicionado ao celular.
// Não imitar o selo oficial "Add to Apple Wallet"/"Google Wallet": ele é marca
// registrada e só pode ser usado com o cartão funcionando.

function plataforma() {
  if (typeof navigator === 'undefined') return 'outro';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'outro';
}

const ROTULOS = {
  ios: { botao: 'Adicionar à Carteira', destino: 'na Carteira do iPhone' },
  android: { botao: 'Adicionar ao Google Wallet', destino: 'no Google Wallet' },
  outro: { botao: 'Adicionar à carteira do celular', destino: 'na Carteira do iPhone ou no Google Wallet' },
};

export default function BotaoWallet({ perfil, className = '', claro = false }) {
  const [aberto, setAberto] = useState(false);
  const rotulos = ROTULOS[plataforma()];

  return (
    <>
      <motion.button
        type="button"
        whileTap={AO_TOCAR}
        onClick={(evento) => {
          evento.stopPropagation();
          setAberto(true);
        }}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
          claro ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-petroleo-950 text-white hover:bg-petroleo-900'
        } ${className}`}
      >
        <Wallet size={17} aria-hidden="true" />
        {rotulos.botao}
      </motion.button>
      <PreviaWallet perfil={perfil} aberto={aberto} aoFechar={() => setAberto(false)} destino={rotulos.destino} />
    </>
  );
}

function PreviaWallet({ perfil, aberto, aoFechar, destino }) {
  const painel = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const focoAnterior = document.activeElement;
    painel.current?.focus();
    // Captura na janela: roda antes do Esc da carteirinha em tela cheia, que fecharia as duas.
    const aoTeclar = (evento) => {
      if (evento.key !== 'Escape') return;
      evento.stopPropagation();
      aoFechar();
    };
    window.addEventListener('keydown', aoTeclar, true);
    return () => {
      window.removeEventListener('keydown', aoTeclar, true);
      focoAnterior?.focus?.();
    };
  }, [aberto, aoFechar]);

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={aoFechar}
          className="fixed inset-0 z-[60] overflow-y-auto bg-petroleo-950/80 p-4 backdrop-blur-sm"
        >
          <div className="flex min-h-full items-center justify-center">
            <motion.div
              ref={painel}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="wallet-titulo"
              initial={{ y: 24, scale: 0.97, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={MOLA_SUAVE}
              onClick={(evento) => evento.stopPropagation()}
              className="glass-strong relative w-full max-w-sm rounded-[2rem] p-5 outline-none"
            >
              <button
                type="button"
                onClick={aoFechar}
                className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-salvia-600 transition hover:bg-superficie/70"
              >
                <X size={18} aria-hidden="true" />
                <span className="sr-only">Fechar</span>
              </button>

              <h2 id="wallet-titulo" className="pr-10 text-lg font-semibold">Sua carteirinha na Carteira</h2>
              <p className="mt-1 text-sm text-salvia-600">Assim ela ficaria {destino}:</p>

              {/* Prévia no formato de cartão da Wallet (em pé, campos em rótulo + valor, código embaixo). */}
              <div className="mt-4 overflow-hidden rounded-[1.25rem] bg-linear-to-br from-petroleo-700 to-petroleo-950 text-white shadow-[var(--shadow-glass)]">
                <div className="flex items-center justify-between gap-3 px-4 pt-4">
                  <span className="flex items-center gap-2">
                    <LogoMark className="h-7 w-7" variante="claro" />
                    <span className="font-semibold">Jornada</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[0.625rem] font-semibold uppercase tracking-widest text-white/70">Plano</span>
                    <span className="block text-sm font-semibold">{perfil.plano}</span>
                  </span>
                </div>

                <div className="px-4 pt-5">
                  <span className="block text-[0.625rem] font-semibold uppercase tracking-widest text-white/70">Beneficiário</span>
                  <span className="block text-xl font-semibold leading-tight">{perfil.nome}</span>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pt-4">
                  <Campo rotulo="Carteirinha" valor={perfil.carteirinha} largo />
                  <Campo rotulo="Titularidade" valor={perfil.titularidade} />
                  <Campo rotulo="Acomodação" valor={PLANO.acomodacao} />
                </dl>

                <div className="mx-4 mb-4 mt-5">
                  <CodigoBarras valor={perfil.carteirinha} className="h-14 w-full rounded-xl px-3 py-2" />
                  <p className="mt-1.5 text-center font-mono text-[0.6875rem] tracking-widest text-white/80">{perfil.carteirinha}</p>
                </div>
                <p className="bg-white/10 px-4 py-1.5 text-center text-[0.625rem] font-semibold uppercase tracking-widest text-white/80">
                  Demonstração · dados fictícios
                </p>
              </div>

              <p className="mt-4 flex gap-2.5 rounded-2xl bg-ambar-50 p-3 text-sm text-ambar-700">
                <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="block">Simulação: nada foi adicionado ao seu celular.</strong>
                  Na versão com servidor da operadora, o cartão é assinado e vai direto para a Carteira: abre com um toque no
                  balcão, até sem internet.
                </span>
              </p>

              <button
                type="button"
                onClick={aoFechar}
                className="mt-4 h-11 w-full rounded-full bg-petroleo-800 text-sm font-semibold text-white transition hover:bg-petroleo-900"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Campo({ rotulo, valor, largo = false }) {
  return (
    <div className={largo ? 'col-span-2' : ''}>
      <dt className="text-[0.625rem] font-semibold uppercase tracking-widest text-white/70">{rotulo}</dt>
      <dd className="font-mono text-sm font-medium tracking-wide">{valor}</dd>
    </div>
  );
}
