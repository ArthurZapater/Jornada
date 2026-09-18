import { useState } from 'react';
import { ArrowLeft, Check, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/** Cabeçalho das telas internas: voltar + título + ação opcional (ex.: compartilhar). */
export default function PageHeader({ titulo, subtitulo, voltarPara = '/', compartilhar = false, acao }) {
  const navigate = useNavigate();
  return (
    <header className="mb-5 flex items-center gap-3 lg:mb-7">
      <button
        type="button"
        onClick={() => navigate(voltarPara)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-superficie/70 text-acento ring-1 ring-borda transition hover:bg-superficie"
        aria-label="Voltar"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight lg:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 hidden text-salvia-600 lg:block">{subtitulo}</p>}
      </div>
      {acao}
      {compartilhar && <BotaoCompartilhar titulo={titulo} />}
    </header>
  );
}

function BotaoCompartilhar({ titulo }) {
  const [copiado, setCopiado] = useState(false);
  async function compartilhar() {
    const dados = { title: `Jornada — ${titulo}`, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(dados);
      } else {
        await navigator.clipboard.writeText(dados.url);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    } catch {
      /* usuário cancelou o compartilhamento */
    }
  }
  return (
    <button
      type="button"
      onClick={compartilhar}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-acento transition hover:bg-superficie/70"
      aria-label={copiado ? 'Link copiado' : 'Compartilhar'}
    >
      {copiado ? <Check size={20} aria-hidden="true" /> : <Share2 size={20} aria-hidden="true" />}
    </button>
  );
}
