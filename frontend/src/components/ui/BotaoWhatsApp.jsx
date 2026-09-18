import { MessageCircle } from 'lucide-react';
import { linkWhatsApp } from '../../utils/whatsapp';

const TAMANHOS = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-14 px-7 text-base',
};

/**
 * Abre o WhatsApp com a mensagem já escrita. É um link comum: o envio depende do
 * usuário apertar "enviar" lá dentro — o app não manda nada sozinho.
 */
export default function BotaoWhatsApp({ mensagem, numero = '', tamanho = 'sm', children = 'WhatsApp', className = '' }) {
  return (
    <a
      href={linkWhatsApp(mensagem, numero)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex select-none items-center justify-center gap-2 rounded-full bg-superficie/75 font-semibold text-acento ring-1 ring-borda transition hover:bg-superficie ${TAMANHOS[tamanho]} ${className}`}
    >
      <MessageCircle size={tamanho === 'sm' ? 16 : 18} aria-hidden="true" />
      {children}
    </a>
  );
}
