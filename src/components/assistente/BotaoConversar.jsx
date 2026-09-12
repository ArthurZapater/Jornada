import { AudioLines } from 'lucide-react';
import { motion } from 'motion/react';
import { AO_TOCAR } from '../ui/animacoes';
import { useConversa } from '../../contexts/ConversaContext';
import { conversaPorVozDisponivel } from '../../hooks/useConversaPorVoz';

/**
 * Bolinha colorida que abre a conversa por voz ali mesmo, na tela em que a pessoa
 * está. iniciar() roda dentro do clique: é o gesto que libera microfone e áudio.
 */
export default function BotaoConversar({ className = '', tamanho = 'h-11 w-11' }) {
  const conversa = useConversa();
  if (!conversaPorVozDisponivel()) return null;
  return (
    <motion.button
      type="button"
      onClick={conversa.iniciar}
      whileTap={AO_TOCAR}
      aria-label="Conversar por voz com o assistente"
      title="Conversar por voz"
      className={`orbe-botao grid shrink-0 place-items-center overflow-hidden rounded-full text-white shadow-[0_12px_24px_-12px_rgb(20_58_51/0.9)] ${tamanho} ${className}`}
    >
      <AudioLines size={20} aria-hidden="true" className="relative" />
    </motion.button>
  );
}
