import { Suspense, lazy, useState } from 'react';
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

// O Leaflet só é necessário nesta tela: carregar sob demanda tira ~42 kB (gzip)
// do pacote inicial, que é o que pesa no primeiro acesso.
const MapaRede = lazy(() => import('../components/rede/MapaRede'));

function EsqueletoMapa() {
  return (
    <div className="glass-strong h-[17.5rem] animate-pulse rounded-[1.75rem] sm:h-[21.5rem]" aria-hidden="true" />
  );
}

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
          <Suspense fallback={<EsqueletoMapa />}>
            <MapaRede itens={rede.dados ?? []} usuario={LOCALIZACAO_USUARIO} />
          </Suspense>
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
