import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crosshair, Info, Minus, Plus } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatarDistancia } from '../../utils/format';

// SEGURANÇA (CVE-2025-69993): o Leaflet renderiza HTML cru em bindPopup/divIcon.
// Por isso, os ícones abaixo usam HTML CONSTANTE, sem interpolar nenhum dado, e
// o conteúdo dos balões vai como filhos React de <Popup>, que o React escapa.
// Nenhum dado (nome de unidade, endereço) chega a um sink de HTML.
const criarPino = (classe) =>
  L.divIcon({
    className: 'pino-jornada',
    html: `<span class="pino ${classe}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });

/** Raio que o enquadramento automático tenta cobrir, e o mínimo de unidades à vista. */
const RAIO_ENQUADRAMENTO_KM = 25;
const MINIMO_ENQUADRAMENTO = 3;

const PINO_UNIDADE = criarPino('pino-unidade');
const PINO_HOSPITAL = criarPino('pino-hospital');
const PINO_USUARIO = L.divIcon({
  className: 'pino-jornada',
  html: '<span class="ponto-usuario"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function enquadrar(mapa, pontos) {
  if (!mapa || pontos.length < 2) return;
  mapa.fitBounds(L.latLngBounds(pontos.map((p) => [p.latitude, p.longitude])), {
    padding: [36, 36],
    maxZoom: 15,
    animate: true,
  });
}

/** Reenquadra sempre que a lista muda (filtro ou busca da tela). */
function AjustarLimites({ pontos }) {
  const mapa = useMap();
  useEffect(() => {
    enquadrar(mapa, pontos);
  }, [mapa, pontos]);
  return null;
}

/** Controles próprios, no lugar dos botões padrão do Leaflet. */
function ControlesMapa({ mapa, aoReenquadrar }) {
  const [zoom, setZoom] = useState(() => mapa.getZoom());

  useEffect(() => {
    const atualizar = () => setZoom(mapa.getZoom());
    mapa.on('zoomend', atualizar);
    return () => {
      mapa.off('zoomend', atualizar);
    };
  }, [mapa]);

  const botao =
    'grid h-10 w-10 place-items-center text-acento transition hover:bg-salvia-100 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="glass-strong absolute right-4 top-4 z-[1000] flex flex-col divide-y divide-borda/60 overflow-hidden rounded-2xl">
      <button type="button" onClick={() => mapa.zoomIn()} disabled={zoom >= mapa.getMaxZoom()} className={botao} aria-label="Aproximar o mapa">
        <Plus size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => mapa.zoomOut()} disabled={zoom <= mapa.getMinZoom()} className={botao} aria-label="Afastar o mapa">
        <Minus size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={aoReenquadrar} className={botao} aria-label="Reenquadrar o mapa nos locais próximos">
        <Crosshair size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Crédito do OpenStreetMap recolhido num "(i)", como permitem as diretrizes de
 * atribuição da OSM Foundation: pode ficar oculto desde que continue acessível.
 */
function CreditosMapa({ localizacaoReal }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex items-center justify-end gap-2">
      {aberto && (
        <p className="glass-strong max-w-[15rem] rounded-2xl px-3 py-2 text-[0.6875rem] leading-snug">
          Mapa e dados ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            colaboradores do OpenStreetMap
          </a>
          .{' '}
          {localizacaoReal ? 'Sua posição vem do aparelho e não sai dele.' : 'Sua localização é simulada nesta demonstração.'}
        </p>
      )}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label="Créditos e licença do mapa"
        className="glass-strong grid h-8 w-8 shrink-0 place-items-center rounded-full text-salvia-600 transition hover:text-acento"
      >
        <Info size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function MapaRede({ itens, usuario, localizacaoReal = false }) {
  const [mapa, setMapa] = useState(null);

  // Médicos compartilham unidade: o mapa mostra locais, não profissionais.
  const unidades = useMemo(
    () => [...new Map(itens.map((item) => [item.unidadeId, item])).values()],
    [itens],
  );
  // O enquadramento cobre só a vizinhança: a lista atravessa estados, e incluir
  // tudo de uma vez jogaria o mapa para a altura do país. Quando não há nada por
  // perto, mostra as mais próximas mesmo que longe, para o mapa não ficar vazio.
  const pontos = useMemo(() => {
    const perto = unidades.filter((u) => u.distanciaKm <= RAIO_ENQUADRAMENTO_KM);
    const base = perto.length >= MINIMO_ENQUADRAMENTO ? perto : unidades.slice(0, MINIMO_ENQUADRAMENTO);
    return [...base, usuario];
  }, [unidades, usuario]);
  const reenquadrar = useCallback(() => enquadrar(mapa, pontos), [mapa, pontos]);

  return (
    <div className="glass-strong relative overflow-hidden rounded-[1.75rem] p-1.5">
      <MapContainer
        ref={setMapa}
        center={[usuario.latitude, usuario.longitude]}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        className="h-64 w-full rounded-[1.45rem] sm:h-80"
        aria-label={`Mapa com ${unidades.length} locais da rede credenciada`}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <AjustarLimites pontos={pontos} />

        <Marker position={[usuario.latitude, usuario.longitude]} icon={PINO_USUARIO}>
          <Popup>
            <strong>Você está aqui</strong>
            <br />
            {localizacaoReal
              ? `Posição do aparelho, com precisão de cerca de ${usuario.precisaoM} m.`
              : 'Localização simulada para a demonstração.'}
          </Popup>
        </Marker>

        {unidades.map((unidade) => (
          <Marker
            key={unidade.unidadeId}
            position={[unidade.latitude, unidade.longitude]}
            icon={unidade.categoria === 'HOSPITAL' ? PINO_HOSPITAL : PINO_UNIDADE}
          >
            <Popup>
              <strong>{unidade.nome}</strong>
              <br />
              {unidade.endereco}
              <br />
              {formatarDistancia(unidade.distanciaKm)} de você
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {mapa && <ControlesMapa mapa={mapa} aoReenquadrar={reenquadrar} />}
      <CreditosMapa localizacaoReal={localizacaoReal} />
    </div>
  );
}
