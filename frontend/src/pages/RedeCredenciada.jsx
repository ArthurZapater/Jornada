import { Suspense, lazy, useState } from 'react';
import { Building2, ChevronRight, Crosshair, Hospital, MapPin, SearchX } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import BotaoWhatsApp from '../components/ui/BotaoWhatsApp';
import Button from '../components/ui/Button';
import { ConteudoAssincrono, Vazio } from '../components/ui/Feedback';
import { CampoBusca, FiltroChips } from '../components/ui/Filtros';
import IconTile from '../components/ui/IconTile';
import PageHeader from '../components/ui/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useLocalizacao } from '../hooks/useLocalizacao';
import { listarRede } from '../services/redeService';
import { CENTRAL_WHATSAPP, mensagemUnidade } from '../utils/whatsapp';
import { formatarDistancia } from '../utils/format';

// O MapLibre só é necessário nesta tela: carregar sob demanda tira o motor do mapa
// do pacote inicial, que é o que pesa no primeiro acesso.
const MapaRede = lazy(() => import('../components/rede/MapaRede'));

function EsqueletoMapa() {
  return (
    <div className="glass-strong h-[20.75rem] animate-pulse rounded-[1.75rem] sm:h-[24.75rem] lg:h-[30.75rem]" aria-hidden="true" />
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
  const local = useLocalizacao();
  const rede = useAsync(() => listarRede({ busca, filtro, origem: local.posicao }), [busca, filtro, local.posicao]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Rede credenciada" subtitulo="Médicos, clínicas e hospitais perto de você." />
      <div className="space-y-3">
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar médico, clínica, hospital..." rotulo="Buscar na rede credenciada" />
        <FiltroChips opcoes={FILTROS} valor={filtro} onChange={setFiltro} rotulo="Filtrar por tipo" />
        <BarraLocalizacao local={local} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="lg:sticky lg:top-6">
          <Suspense fallback={<EsqueletoMapa />}>
            <MapaRede itens={rede.dados ?? []} usuario={local.posicao} localizacaoReal={local.real} />
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
          <p className="mt-4 px-1 text-xs leading-relaxed text-salvia-600">
            Unidades próprias das cooperativas Unimed, com endereço e coordenadas do OpenStreetMap.
            Não é a rede credenciada completa — ela passa de 30 mil estabelecimentos e muda conforme
            a cooperativa e o plano. Confirme a cobertura no Guia Médico oficial antes de ir. Médicos
            e horários são fictícios, criados para a demonstração.
          </p>
        </section>
      </div>
    </div>
  );
}

/**
 * Origem das distâncias. A localização real só é pedida quando o usuário clica —
 * nunca ao abrir a tela — e some ao recarregar a página.
 */
function BarraLocalizacao({ local }) {
  return (
    <div className="glass flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-4 py-3">
      {/* basis: estreito, o botão desce para a linha de baixo em vez de espremer o texto */}
      <p className="min-w-0 flex-1 basis-60 text-sm">
        {local.real ? (
          <>
            <span className="font-semibold">Distâncias a partir de você.</span>{' '}
            <span className="text-salvia-600">
              Precisão de cerca de {local.posicao.precisaoM} m. A posição não sai do aparelho.
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold">Distâncias a partir da Av. Paulista.</span>{' '}
            <span className="text-salvia-600">Posição de demonstração.</span>
          </>
        )}
      </p>
      {local.real ? (
        <button
          type="button"
          onClick={local.voltarParaSimulada}
          className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-salvia-600 transition hover:bg-superficie/70"
        >
          Voltar para a simulada
        </button>
      ) : (
        <Button tamanho="sm" variante="secundario" icone={Crosshair} onClick={local.usarLocalizacaoReal} carregando={local.buscando}>
          Usar minha localização
        </Button>
      )}
      {local.erro && (
        <p role="alert" className="w-full text-sm text-alerta-600">
          {local.erro}
        </p>
      )}
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
          <span className="rounded-full bg-salvia-100 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-acento">{item.rotuloTipo}</span>
        </span>
        <span className="block text-sm text-salvia-600">{item.descricao}</span>
        <span className="mt-1 flex items-center gap-1.5 text-sm">
          <MapPin size={14} className="shrink-0 text-salvia-600" aria-hidden="true" />
          <strong className="font-semibold">{formatarDistancia(item.distanciaKm)}</strong> — {item.endereco}
        </span>
        <span className="block text-sm text-salvia-600">{item.cidade}</span>
      </span>
    </>
  );

  if (medico) {
    return (
      <Link
        to={`/consultas/agendar?medico=${item.medicoId}`}
        className="glass-strong flex items-center gap-4 rounded-3xl p-4 transition hover:bg-superficie/90"
        aria-label={`${item.nome}, ${item.descricao}. Agendar consulta`}
      >
        {conteudo}
        <ChevronRight size={18} className="shrink-0 text-salvia-600" aria-hidden="true" />
      </Link>
    );
  }
  // Ação em linha própria: espremida ao lado do endereço, ela come a largura do texto.
  return (
    <div className="glass-strong rounded-3xl p-4">
      <div className="flex items-center gap-4">{conteudo}</div>
      <div className="mt-3 flex justify-end">
        <BotaoWhatsApp mensagem={mensagemUnidade(item)} numero={CENTRAL_WHATSAPP}>
          Falar no WhatsApp
        </BotaoWhatsApp>
      </div>
    </div>
  );
}
