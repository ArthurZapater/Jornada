import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Crosshair, Hospital, Info, MapPinOff, Minus, Navigation, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { LngLatBounds, Map as MapaGL, Marker, setWorkerUrl } from 'maplibre-gl';
import urlDoWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import IconTile from '../ui/IconTile';
import { MOLA } from '../ui/animacoes';
import { usePreferencias } from '../../contexts/PreferenciasContext';
import { useTema } from '../../contexts/TemaContext';
import { formatarDistancia } from '../../utils/format';

// Mapa vetorial (MapLibre GL) com os estilos do OpenFreeMap: sem chave de API, sem
// cadastro e sem cookies — nada de segredo no repositório. Google Maps e Apple
// MapKit exigiriam chave exposta no navegador.
//
// Worker servido pelo próprio site (?worker&url): a CSP não precisa liberar blob:.
setWorkerUrl(urlDoWorker);

const ESTILOS = {
  claro: 'https://tiles.openfreemap.org/styles/liberty',
  escuro: 'https://tiles.openfreemap.org/styles/dark',
};

/** Pontos de interesse do estilo (lojas, outros hospitais) competem com os pinos da rede. */
const CAMADAS_OCULTAS = /^poi_/;

/**
 * O estilo escuro de fábrica é cinza-carvão, com ruas mais escuras que o chão. No
 * app, ele ganha os tons do tema escuro (tokens de index.css): chão verde-petróleo
 * profundo, água azulada e ruas um pouco mais claras que o fundo, como nos mapas
 * noturnos do iPhone.
 */
const TINTA_ESCURA = [
  ['background', 'background-color', '--color-salvia-50'],
  ['water', 'fill-color', '--color-nevoa-100'],
  ['landuse_park', 'fill-color', '--color-salvia-100'],
  ['landcover_wood', 'fill-color', '--color-salvia-100'],
  ['building', 'fill-color', '--color-salvia-100'],
  ['highway_minor', 'line-color', '--color-salvia-200'],
  ['highway_major_inner', 'line-color', '--color-salvia-300'],
  ['highway_motorway_inner', 'line-color', '--color-salvia-400'],
];

/** Raio que o enquadramento automático tenta cobrir, e o mínimo de unidades à vista. */
const RAIO_ENQUADRAMENTO_KM = 25;
const MINIMO_ENQUADRAMENTO = 3;

// SEGURANÇA: os pinos são montados com a API do DOM. Dado (nome, distância) só
// entra por setAttribute — nunca por innerHTML, setHTML ou atribuição personalizada.
// O único innerHTML é o desenho CONSTANTE do ícone. Os detalhes do local ficam num
// cartão React (escapado), e não em Popup do MapLibre.
const ICONE_HOSPITAL =
  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>';
const ICONE_CLINICA =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h18M10 7h4M10 11h4M10 15h4"/></svg>';

function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

/**
 * O MapLibre posiciona o marcador escrevendo no `transform` do elemento que recebe:
 * por isso o botão é só o suporte, e quem gira e cresce é o desenho de dentro.
 */
function criarPino(unidade) {
  const hospital = unidade.categoria === 'HOSPITAL';
  const botao = elemento('button', 'suporte-pino');
  botao.type = 'button';
  botao.setAttribute('aria-label', `${unidade.nome}, ${formatarDistancia(unidade.distanciaKm)}`);
  const desenho = elemento('span', `pino-mapa ${hospital ? 'pino-mapa--hospital' : ''}`);
  desenho.innerHTML = hospital ? ICONE_HOSPITAL : ICONE_CLINICA;
  botao.append(desenho);
  return botao;
}

/** Rotas no app de mapas do aparelho: Apple Mapas no iPhone/Mac, Google Maps no resto. */
function linkComoChegar({ latitude, longitude }) {
  const destino = `${latitude},${longitude}`;
  return /iPhone|iPad|Macintosh/.test(navigator.userAgent)
    ? `https://maps.apple.com/?daddr=${destino}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
}

function enquadrar(mapa, pontos, duracao) {
  if (!mapa || pontos.length < 2) return;
  const [primeiro, ...resto] = pontos;
  const limites = resto.reduce(
    (caixa, p) => caixa.extend([p.longitude, p.latitude]),
    new LngLatBounds([primeiro.longitude, primeiro.latitude], [primeiro.longitude, primeiro.latitude]),
  );
  mapa.fitBounds(limites, { padding: { top: 56, bottom: 56, left: 48, right: 72 }, maxZoom: 15, duration: duracao });
}

/** Controles próprios, no visual de vidro do app. */
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
    <div className="glass-strong absolute right-4 top-4 z-10 flex flex-col divide-y divide-borda/60 overflow-hidden rounded-2xl">
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
 * Créditos recolhidos num "(i)": a atribuição exigida pelo OpenFreeMap e pela
 * licença do OpenStreetMap continua a um toque, como permitem as diretrizes.
 */
function CreditosMapa({ localizacaoReal }) {
  const [aberto, setAberto] = useState(false);
  const link = 'font-semibold underline underline-offset-2';
  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center justify-end gap-2">
      {aberto && (
        <p className="glass-strong max-w-[16rem] rounded-2xl px-3 py-2 text-[0.6875rem] leading-snug">
          <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className={link}>OpenFreeMap</a>{' '}
          © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer" className={link}>OpenMapTiles</a>.
          Dados ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className={link}>
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

/** Detalhes do local tocado, num cartão de vidro na base do mapa (como no Apple Mapas). */
function CartaoLocal({ local, localizacaoReal, aoFechar }) {
  const usuario = local.tipo === 'usuario';
  const hospital = local.categoria === 'HOSPITAL';
  return (
    <motion.div
      role="dialog"
      aria-label={usuario ? 'Sua localização' : local.nome}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={MOLA}
      className="glass-strong absolute inset-x-4 bottom-4 z-20 rounded-3xl p-3.5 sm:right-auto sm:w-[22rem] sm:p-4"
    >
      <div className="flex items-start gap-3">
        {usuario ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center" aria-hidden="true">
            <span className="ponto-usuario" />
          </span>
        ) : (
          <IconTile icone={hospital ? Hospital : Building2} tom={hospital ? 'lilas' : 'verde'} tamanho="sm" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-salvia-600">
            {usuario ? 'Você está aqui' : hospital ? 'Hospital' : 'Clínica'}
          </p>
          <p className="line-clamp-2 font-semibold leading-snug">
            {usuario ? (localizacaoReal ? 'Posição do seu aparelho' : 'Av. Paulista (demonstração)') : local.nome}
          </p>
          <p className={`mt-0.5 text-sm text-salvia-600 ${usuario ? '' : 'truncate'}`}>
            {usuario
              ? localizacaoReal
                ? `Precisão de cerca de ${local.precisaoM} m. A posição não sai do aparelho.`
                : 'Localização simulada. Toque em "Usar minha localização" para usar a real.'
              : [local.endereco, local.cidade].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar detalhes do local"
          className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-salvia-600 transition hover:bg-salvia-100 hover:text-acento"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {!usuario && (
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-salvia-100 pt-2.5">
          <span className="min-w-0 text-sm">
            <strong className="whitespace-nowrap font-semibold text-acento">{formatarDistancia(local.distanciaKm)}</strong>
            <span className="text-salvia-600"> de você</span>
          </span>
          <a
            href={linkComoChegar(local)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-petroleo-800 px-4 text-sm font-semibold text-white transition hover:bg-petroleo-700"
          >
            <Navigation size={15} aria-hidden="true" /> Como chegar
          </a>
        </div>
      )}
    </motion.div>
  );
}

export default function MapaRede({ itens, usuario, localizacaoReal = false }) {
  const { tema } = useTema();
  const { preferencias } = usePreferencias();
  const container = useRef(null);
  const [mapa, setMapa] = useState(null);
  const [falhou, setFalhou] = useState(false);
  const temaAplicado = useRef(tema);
  const duracao = preferencias.movimento === 'reduzido' ? 0 : 900;
  // Local tocado no mapa: 'usuario' ou o unidadeId. Mostra o cartão de detalhes.
  const [selecionado, setSelecionado] = useState(null);
  const pinos = useRef(new Map());

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
  const reenquadrar = useCallback(() => enquadrar(mapa, pontos, duracao), [mapa, pontos, duracao]);

  // Cria o mapa uma vez. Sem WebGL (aparelho antigo, aceleração desligada), a tela
  // avisa e a lista continua funcionando.
  useEffect(() => {
    let instancia;
    try {
      instancia = new MapaGL({
        container: container.current,
        style: ESTILOS[temaAplicado.current],
        center: [usuario.longitude, usuario.latitude],
        zoom: 12,
        maxZoom: 18,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
    } catch {
      setFalhou(true);
      return undefined;
    }
    instancia.touchZoomRotate.disableRotation();
    instancia.keyboard.disableRotation();
    const ajustarEstilo = () => {
      instancia.getStyle().layers
        .filter((camada) => CAMADAS_OCULTAS.test(camada.id))
        .forEach((camada) => instancia.setLayoutProperty(camada.id, 'visibility', 'none'));
      if (temaAplicado.current !== 'escuro') return;
      const raiz = getComputedStyle(document.documentElement);
      TINTA_ESCURA.forEach(([camada, propriedade, token]) => {
        const cor = raiz.getPropertyValue(token).trim();
        if (cor && instancia.getLayer(camada)) instancia.setPaintProperty(camada, propriedade, cor);
      });
    };
    instancia.on('style.load', ajustarEstilo);
    instancia.once('load', () => setMapa(instancia));
    return () => {
      setMapa(null);
      instancia.remove();
    };
    // O centro inicial só importa na criação; depois quem manda é o enquadramento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tema do app trocado: troca o estilo; os pinos são DOM e continuam no lugar.
  useEffect(() => {
    if (!mapa || temaAplicado.current === tema) return;
    temaAplicado.current = tema;
    mapa.setStyle(ESTILOS[tema]);
  }, [mapa, tema]);

  useEffect(() => {
    if (!mapa) return undefined;
    const registro = pinos.current;
    const marcadores = unidades.map((unidade) => {
      const pino = criarPino(unidade);
      pino.addEventListener('click', (evento) => {
        evento.stopPropagation();
        setSelecionado(unidade.unidadeId);
      });
      registro.set(unidade.unidadeId, pino);
      return new Marker({ element: pino, anchor: 'bottom' }).setLngLat([unidade.longitude, unidade.latitude]).addTo(mapa);
    });
    return () => {
      marcadores.forEach((marcador) => marcador.remove());
      registro.clear();
    };
  }, [mapa, unidades]);

  useEffect(() => {
    if (!mapa) return undefined;
    const ponto = elemento('button', 'suporte-pino');
    ponto.type = 'button';
    ponto.setAttribute('aria-label', 'Sua localização');
    ponto.append(elemento('span', 'ponto-usuario'));
    ponto.addEventListener('click', (evento) => {
      evento.stopPropagation();
      setSelecionado('usuario');
    });
    const marcador = new Marker({ element: ponto }).setLngLat([usuario.longitude, usuario.latitude]).addTo(mapa);
    return () => marcador.remove();
  }, [mapa, usuario]);

  // Tocar no mapa fora dos pinos fecha o cartão; Esc também.
  useEffect(() => {
    if (!mapa) return undefined;
    const fechar = () => setSelecionado(null);
    const aoTeclar = (evento) => evento.key === 'Escape' && fechar();
    mapa.on('click', fechar);
    mapa.getContainer().addEventListener('keydown', aoTeclar);
    return () => {
      mapa.off('click', fechar);
      mapa.getContainer().removeEventListener('keydown', aoTeclar);
    };
  }, [mapa]);

  const detalhe =
    selecionado === 'usuario' ? { ...usuario, tipo: 'usuario' } : unidades.find((u) => u.unidadeId === selecionado) ?? null;

  // Pino destacado e mapa deslizando para o local ficar acima do cartão.
  useEffect(() => {
    pinos.current.forEach((pino, id) => pino.classList.toggle('suporte-pino--ativo', id === selecionado));
    if (!mapa || !detalhe) return;
    mapa.easeTo({
      center: [detalhe.longitude, detalhe.latitude],
      offset: [0, -mapa.getContainer().clientHeight * 0.18],
      duration: duracao,
    });
    // Só quando a seleção muda; recalcular por causa do objeto recriado a cada render moveria o mapa sem pedido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, selecionado]);

  // Filtro ou busca que tirem o local da lista fecham o cartão.
  useEffect(() => {
    if (selecionado && selecionado !== 'usuario' && !unidades.some((u) => u.unidadeId === selecionado)) setSelecionado(null);
  }, [unidades, selecionado]);

  useEffect(() => {
    enquadrar(mapa, pontos, duracao);
    // Reenquadra quando a lista muda (filtro, busca, localização), não quando a
    // preferência de movimento muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, pontos]);

  return (
    <div className="glass-strong relative overflow-hidden rounded-[1.75rem] p-1.5">
      <div
        ref={container}
        role="region"
        aria-label={`Mapa com ${unidades.length} locais da rede credenciada`}
        className="mapa-jornada h-80 w-full overflow-hidden rounded-[1.45rem] bg-salvia-100 sm:h-96 lg:h-[30rem]"
      />
      {falhou && (
        <div className="absolute inset-1.5 grid place-items-center rounded-[1.45rem] bg-salvia-100 p-6 text-center">
          <p className="max-w-xs text-sm text-salvia-600">
            <MapPinOff size={28} className="mx-auto mb-2 text-acento" aria-hidden="true" />
            Este navegador não conseguiu desenhar o mapa. As distâncias continuam na lista.
          </p>
        </div>
      )}
      {mapa && <ControlesMapa mapa={mapa} aoReenquadrar={reenquadrar} />}
      <AnimatePresence>
        {detalhe && (
          <CartaoLocal
            key={detalhe.tipo === 'usuario' ? 'usuario' : detalhe.unidadeId}
            local={detalhe}
            localizacaoReal={localizacaoReal}
            aoFechar={() => setSelecionado(null)}
          />
        )}
      </AnimatePresence>
      {!detalhe && <CreditosMapa localizacaoReal={localizacaoReal} />}
    </div>
  );
}
