import { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buscar } from '../../services/buscaService';

const ATRASO_MS = 200;

export default function BuscaGlobal({ className = '' }) {
  const navigate = useNavigate();
  const idLista = useId();
  const raiz = useRef(null);
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(-1);

  const termoValido = termo.trim().length >= 2;

  useEffect(() => {
    if (!termoValido) return;
    let ativo = true;
    setCarregando(true);
    const timer = setTimeout(() => {
      buscar(termo)
        .then((lista) => ativo && (setResultados(lista), setDestaque(-1)))
        .finally(() => ativo && setCarregando(false));
    }, ATRASO_MS);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [termo, termoValido]);

  useEffect(() => {
    const fechar = (e) => !raiz.current?.contains(e.target) && setAberto(false);
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  function ir(resultado) {
    setAberto(false);
    setTermo('');
    navigate(resultado.link);
  }

  function aoTeclar(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAberto(true);
      setDestaque((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestaque((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && resultados.length) {
      e.preventDefault();
      ir(resultados[Math.max(destaque, 0)]);
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  }

  const mostrarLista = aberto && termoValido;

  return (
    <div ref={raiz} className={`relative ${className}`}>
      <div className="glass-strong flex h-12 items-center gap-3 rounded-full px-5 focus-within:ring-2 focus-within:ring-petroleo-600">
        <Search size={19} className="shrink-0 text-acento" aria-hidden="true" />
        <input
          type="search"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={aoTeclar}
          placeholder="Buscar por consultas, exames, especialistas..."
          aria-label="Buscar por consultas, exames, especialistas"
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={idLista}
          aria-activedescendant={destaque >= 0 ? `${idLista}-${destaque}` : undefined}
          className="h-full w-full min-w-0 bg-transparent text-[0.9375rem] outline-none placeholder:text-salvia-600 [&::-webkit-search-cancel-button]:hidden"
        />
        {carregando && <LoaderCircle size={16} className="shrink-0 animate-spin text-salvia-600" aria-hidden="true" />}
      </div>
      {mostrarLista && (
        <ul id={idLista} role="listbox" className="glass-strong absolute inset-x-0 top-full z-40 mt-2 max-h-96 overflow-auto rounded-3xl p-2">
          {!carregando && resultados.length === 0 && (
            <li className="px-4 py-3 text-sm text-salvia-600">Nada encontrado para “{termo}”.</li>
          )}
          {resultados.map((r, i) => (
            <li
              key={r.chave}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === destaque}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => ir(r)}
              onMouseEnter={() => setDestaque(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-2.5 ${i === destaque ? 'bg-salvia-100' : ''}`}
            >
              <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wider text-salvia-600">{r.tipo}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.titulo}</span>
                <span className="block truncate text-sm text-salvia-600">{r.subtitulo}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
