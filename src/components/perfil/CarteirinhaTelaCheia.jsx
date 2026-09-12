import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCw, X } from 'lucide-react';
import { CarteirinhaFrente, CarteirinhaVerso } from './Carteirinha';
import { AO_TOCAR, MOLA_SUAVE } from '../ui/animacoes';

/**
 * Mantém a tela acesa enquanto a carteirinha está aberta — ela existe para ficar
 * exibida no balcão do atendimento. Navegador sem suporte simplesmente ignora.
 */
function manterTelaAcesa() {
  let bloqueio = null;
  let cancelado = false;
  navigator.wakeLock
    ?.request('screen')
    .then((obtido) => {
      if (cancelado) obtido.release().catch(() => {});
      else bloqueio = obtido;
    })
    .catch(() => {});
  return () => {
    cancelado = true;
    bloqueio?.release().catch(() => {});
  };
}

/** Carteirinha em tela cheia, deitada no celular em pé e com frente e verso. */
export default function CarteirinhaTelaCheia({ perfil, aberta, aoFechar }) {
  const [virada, setVirada] = useState(false);
  const painel = useRef(null);

  useEffect(() => {
    if (!aberta) return undefined;
    setVirada(false);
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') aoFechar();
    };
    const focoAnterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';
    painel.current?.focus();
    const liberarTela = manterTelaAcesa();
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      liberarTela();
      focoAnterior?.focus?.();
    };
  }, [aberta, aoFechar]);

  return createPortal(
    <AnimatePresence>
      {aberta && (
        <motion.div
          ref={painel}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Carteirinha virtual em tela cheia"
          onClick={aoFechar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-petroleo-950/92 outline-none backdrop-blur-md"
        >
          <button
            type="button"
            onClick={aoFechar}
            className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <X size={20} aria-hidden="true" />
            <span className="sr-only">Fechar carteirinha</span>
          </button>

          <div className="palco-carteirinha">
            <div className="giro-carteirinha">
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={MOLA_SUAVE}
                onClick={(evento) => evento.stopPropagation()}
              >
                <div className="@container relative aspect-[1.586] w-full [perspective:1600px]">
                  <motion.div
                    className="relative h-full w-full [transform-style:preserve-3d]"
                    animate={{ rotateY: virada ? 180 : 0 }}
                    transition={MOLA_SUAVE}
                    onClick={() => setVirada((v) => !v)}
                  >
                    {/* Cada face é uma camada do mesmo tamanho: a de trás nasce virada,
                        e o "backface-visibility" esconde a que está de costas. */}
                    <div className="absolute inset-0 [backface-visibility:hidden]">
                      <CarteirinhaFrente perfil={perfil} />
                    </div>
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      <CarteirinhaVerso perfil={perfil} />
                    </div>
                  </motion.div>
                </div>

                <div className="mt-4 flex justify-center">
                  <motion.button
                    type="button"
                    whileTap={AO_TOCAR}
                    onClick={() => setVirada((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
                  >
                    <RotateCw size={16} aria-hidden="true" />
                    {virada ? 'Ver a frente' : 'Ver o verso'}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
