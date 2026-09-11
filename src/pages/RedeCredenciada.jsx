import { useState } from 'react';
import { Building2, ChevronRight, Hospital, MapPin, SearchX } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import { ConteudoAssincrono, Vazio } from '../components/ui/Feedback';
import { CampoBusca, FiltroChips } from '../components/ui/Filtros';
import IconTile from '../components/ui/IconTile';
import PageHeader from '../components/ui/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { LOCALIZACAO_USUARIO } from '../services/mockDb';
import { listarRede } from '../services/redeService';
import { formatarDistancia } from '../utils/format';

const FILTROS = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'MEDICOS', rotulo: 'Médicos' },
  { valor: 'CLINICAS', rotulo: 'Clínicas' },
  { valor: 'HOSPITAIS', rotulo: 'Hospitais' },
];

export default function RedeCredenciada() {
  const [params] = useSearchParams();
  const [busca, setBusca] = useState(params.get('busca') ?? '');
  const [filtro, setFiltro] = useState(params.get('filtro') ?? 'TODOS');
  const rede = useAsync(() => listarRede({ busca, filtro }), [busca, filtro]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Rede credenciada" subtitulo="Médicos, clínicas e hospitais perto de você." />
      <div className="space-y-3">
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar médico, clínica, hospital..." rotulo="Buscar na rede credenciada" />
        <FiltroChips opcoes={FILTROS} valor={filtro} onChange={setFiltro} rotulo="Filtrar por tipo" />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="lg:sticky lg:top-6">
          <MapaIlustrativo itens={rede.dados ?? []} />
        </div>
        <section aria-labelledby="proximos">
          <h2 id="proximos" className="mb-3 text-xs font-semibold uppercase tracking-wider text-salvia-600">Mais próximos</h2>
          <ConteudoAssincrono estado={rede} vazio={<Vazio icone={SearchX} titulo="Nada encontrado" descricao="Tente outro termo ou filtro." />}>
            {(lista) => (
              <ul className={`space-y-3 transition-opacity ${rede.carregando ? 'opacity-60' : ''}`}>
                {lista.map((item) => (
                  <li key={item.chave}>
                    <ItemRede item={item} />
                  </li>
                ))}
              </ul>
            )}
          </ConteudoAssincrono>
        </section>
      </div>
    </div>
  );
}

function ItemRede({ item }) {
  const medico = item.categoria === 'MEDICO';
  const conteudo = (
    <>
      {medico ? (
        <Avatar nome={item.nome} />
      ) : (
        <IconTile icone={item.categoria === 'HOSPITAL' ? Hospital : Building2} tom={item.categoria === 'HOSPITAL' ? 'lilas' : 'verde'} />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{item.nome}</span>
          <span className="rounded-full bg-salvia-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-petroleo-700">{item.rotuloTipo}</span>
        </span>
        <span className="block text-sm text-salvia-600">{item.descricao}</span>
        <span className="mt-1 flex items-center gap-1.5 text-sm">
          <MapPin size={14} className="shrink-0 text-salvia-600" aria-hidden="true" />
          <strong className="font-semibold">{formatarDistancia(item.distanciaKm)}</strong> — {item.endereco}
        </span>
      </span>
    </>
  );

  if (medico) {
    return (
      <Link
        to={`/consultas/agendar?medico=${item.medicoId}`}
        className="glass-strong flex items-center gap-4 rounded-3xl p-4 transition hover:bg-white/90"
        aria-label={`${item.nome}, ${item.descricao}. Agendar consulta`}
      >
        {conteudo}
        <ChevronRight size={18} className="shrink-0 text-salvia-600" aria-hidden="true" />
      </Link>
    );
  }
  return <div className="glass-strong flex items-center gap-4 rounded-3xl p-4">{conteudo}</div>;
}

/** Mapa ilustrativo: posiciona os pins pela latitude/longitude real das unidades. */
function MapaIlustrativo({ itens }) {
  const unidades = [...new Map(itens.map((i) => [i.unidadeId, i])).values()];
  const pontos = [...unidades, LOCALIZACAO_USUARIO];
  const lats = pontos.map((p) => p.latitude);
  const lngs = pontos.map((p) => p.longitude);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const posicao = (p) => ({
    left: `${10 + ((p.longitude - minLng) / (maxLng - minLng || 1)) * 80}%`,
    top: `${12 + ((maxLat - p.latitude) / (maxLat - minLat || 1)) * 72}%`,
  });

  return (
    <div
      className="glass-strong relative h-64 overflow-hidden rounded-[1.75rem] sm:h-80"
      role="img"
      aria-label={`Mapa ilustrativo com ${unidades.length} ${unidades.length === 1 ? 'local' : 'locais'} próximos`}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="quadras" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="#cfe0d6" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="#eef5f1" />
        <rect width="400" height="300" fill="url(#quadras)" />
        <path d="M250 -10c-30 60 40 110 0 170s-60 90-20 150" fill="none" stroke="#b9d3d6" strokeWidth="14" strokeLinecap="round" opacity=".7" />
        <path d="M-10 190C90 160 190 200 410 120" fill="none" stroke="#fff" strokeWidth="10" />
        <path d="M60 -10L150 310" fill="none" stroke="#fff" strokeWidth="8" />
        <ellipse cx="95" cy="80" rx="48" ry="30" fill="#cfe0d6" />
      </svg>
      {unidades.map((u) => (
        <span key={u.unidadeId} className="absolute -translate-x-1/2 -translate-y-full drop-shadow-md" style={posicao(u)} title={u.endereco}>
          <MapPin size={30} strokeWidth={1.6} className={u.categoria === 'HOSPITAL' ? 'fill-lilas-500 text-white' : 'fill-petroleo-800 text-white'} aria-hidden="true" />
        </span>
      ))}
      <span className="absolute -translate-x-1/2 -translate-y-1/2" style={posicao(LOCALIZACAO_USUARIO)}>
        <span className="block h-4 w-4 rounded-full bg-petroleo-600 ring-[6px] ring-petroleo-600/25" />
      </span>
      <p className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1.5 text-xs font-medium">Mapa ilustrativo · São Paulo, SP</p>
      <p className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-medium">
        <span className="h-2.5 w-2.5 rounded-full bg-petroleo-600" aria-hidden="true" /> Você
      </p>
    </div>
  );
}
