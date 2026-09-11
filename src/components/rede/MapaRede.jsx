import { useEffect } from 'react';
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

const PINO_UNIDADE = criarPino('pino-unidade');
const PINO_HOSPITAL = criarPino('pino-hospital');
const PINO_USUARIO = L.divIcon({
  className: 'pino-jornada',
  html: '<span class="ponto-usuario"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** Enquadra o mapa em todos os pontos listados, respeitando os filtros da busca. */
function AjustarLimites({ pontos }) {
  const mapa = useMap();
  useEffect(() => {
    if (pontos.length < 2) return;
    mapa.fitBounds(
      L.latLngBounds(pontos.map((p) => [p.latitude, p.longitude])),
      { padding: [36, 36], maxZoom: 15, animate: true },
    );
  }, [mapa, pontos]);
  return null;
}

export default function MapaRede({ itens, usuario }) {
  // Médicos compartilham unidade: o mapa mostra locais, não profissionais.
  const unidades = [...new Map(itens.map((item) => [item.unidadeId, item])).values()];
  const pontos = [...unidades, usuario];

  return (
    <div className="glass-strong overflow-hidden rounded-[1.75rem] p-1.5">
      <MapContainer
        center={[usuario.latitude, usuario.longitude]}
        zoom={13}
        scrollWheelZoom={false}
        className="h-64 w-full rounded-[1.45rem] sm:h-80"
        aria-label={`Mapa com ${unidades.length} locais da rede credenciada`}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <AjustarLimites pontos={pontos} />

        <Marker position={[usuario.latitude, usuario.longitude]} icon={PINO_USUARIO}>
          <Popup>
            <strong>Você está aqui</strong>
            <br />
            Localização simulada para a demonstração.
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
      <p className="px-3 pb-1 pt-2 text-xs text-salvia-600">
        Mapa © OpenStreetMap · sua localização é simulada (Av. Paulista) nesta demonstração.
      </p>
    </div>
  );
}
