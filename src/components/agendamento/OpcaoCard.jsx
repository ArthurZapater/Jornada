import { ChevronRight } from 'lucide-react';
import Avatar from '../ui/Avatar';
import IconTile from '../ui/IconTile';

export default function OpcaoCard({ titulo, descricao, extra, icone, avatar, tom = 'verde', selecionado = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionado}
      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition ${
        selecionado ? 'bg-salvia-100 ring-petroleo-700' : 'bg-white/75 ring-white hover:bg-white hover:ring-salvia-200'
      }`}
    >
      {avatar ? <Avatar nome={avatar} tamanho="sm" /> : icone && <IconTile icone={icone} tom={tom} tamanho="sm" />}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{titulo}</span>
        {descricao && <span className="block text-sm text-salvia-600">{descricao}</span>}
      </span>
      {extra && <span className="shrink-0 text-sm font-medium text-salvia-600">{extra}</span>}
      <ChevronRight size={18} className="shrink-0 text-salvia-600" aria-hidden="true" />
    </button>
  );
}
