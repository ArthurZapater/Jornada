import { Code, Database, ExternalLink, FlaskConical, HeartPulse, MapPin, Mic, Phone, ShieldCheck, Smartphone, Users, Volume2, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/brand/Logo';
import IconTile from '../components/ui/IconTile';
import LeafArt from '../components/ui/LeafArt';
import PageHeader from '../components/ui/PageHeader';

/* global __VERSAO_APP__, __COMMIT_APP__ */
const VERSAO = typeof __VERSAO_APP__ === 'string' ? __VERSAO_APP__ : '1.0.0';
const COMMIT = typeof __COMMIT_APP__ === 'string' ? __COMMIT_APP__ : 'local';

const SQUAD = ['Enzo de Lucca Borba Pires', 'Felipe Silva de Carvalho', 'Arthur Zapater', 'Gabriel Morais'];

// Licenças conferidas no package.json de cada pacote instalado.
const BIBLIOTECAS = [
  { nome: 'React e React DOM', licenca: 'MIT', url: 'https://react.dev' },
  { nome: 'React Router', licenca: 'MIT', url: 'https://reactrouter.com' },
  { nome: 'Motion', licenca: 'MIT', url: 'https://motion.dev' },
  { nome: 'Leaflet', licenca: 'BSD-2-Clause', url: 'https://leafletjs.com' },
  { nome: 'React Leaflet', licenca: 'Hippocratic 2.1', url: 'https://react-leaflet.js.org' },
  { nome: 'Lucide (ícones)', licenca: 'ISC', url: 'https://lucide.dev' },
  { nome: 'Tailwind CSS', licenca: 'MIT', url: 'https://tailwindcss.com' },
  { nome: 'Fonte Figtree', licenca: 'SIL OFL 1.1', url: 'https://fonts.google.com/specimen/Figtree' },
];

const RECURSOS = [
  { icone: MapPin, titulo: 'Localização', texto: 'Só quando você toca em "Usar minha localização" na rede credenciada. Fica na memória e não é enviada.' },
  { icone: Mic, titulo: 'Microfone', texto: 'Só quando você toca no microfone ou abre a conversa por voz. A transcrição é feita pelo serviço de voz do navegador.' },
  { icone: Volume2, titulo: 'Voz', texto: 'A resposta falada usa as vozes do aparelho; vozes marcadas como "online" são geradas pelo fabricante do navegador.' },
  { icone: Camera, titulo: 'Fotos', texto: 'Só a imagem que você escolher para o perfil, redesenhada no aparelho sem os metadados (EXIF).' },
];

function LinkExterno({ href, children, className = '' }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 font-medium text-acento underline-offset-2 hover:underline ${className}`}>
      {children}
      <ExternalLink size={13} aria-hidden="true" />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}

function Bloco({ id, icone, titulo, children }) {
  return (
    <section aria-labelledby={id} className="glass-strong rounded-3xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <IconTile icone={icone} tamanho="sm" />
        <h2 id={id} className="font-semibold">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Sobre() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader titulo="Sobre a Jornada" subtitulo="O app, quem fez e de onde vêm os dados." voltarPara="/configuracoes" />

      <section className="glass relative overflow-hidden rounded-[2rem] px-6 py-8 text-center" aria-labelledby="sobre-app">
        <LeafArt className="-right-16 -top-12 h-60 w-[26rem]" />
        <LogoMark className="relative mx-auto h-16 w-16" />
        <h2 id="sobre-app" className="relative mt-3 text-3xl font-semibold tracking-tight text-acento">Jornada</h2>
        <p className="relative mt-1 text-salvia-600">Cuidar de você é o nosso destino.</p>
        <p className="relative mx-auto mt-4 inline-flex rounded-full bg-superficie/70 px-3 py-1 text-xs font-medium ring-1 ring-borda">
          Versão {VERSAO} · build {COMMIT}
        </p>
        <p className="relative mx-auto mt-5 max-w-xl text-[0.9375rem] leading-relaxed">
          Plataforma de cuidado hiper-personalizado para beneficiários de plano de saúde: consultas, exames, resultados,
          rede credenciada e um plano de cuidado que se ajusta ao seu momento de vida.
        </p>
      </section>

      <div role="note" className="flex gap-3 rounded-3xl bg-ambar-50 p-5 text-ambar-700">
        <FlaskConical size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-sm leading-relaxed">
          <strong className="block text-base">Protótipo acadêmico</strong>
          Não é um aplicativo oficial da Unimed. Beneficiária, médicos, consultas, exames e valores são fictícios; a
          carteirinha não vale para atendimento. As unidades do mapa são endereços reais, publicados no OpenStreetMap.
        </p>
      </div>

      <Bloco id="sobre-squad" icone={Users} titulo="Quem fez">
        <p className="text-sm text-salvia-600">Challenge FIAP 2026, em parceria com a Unimed Nacional.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {SQUAD.map((nome) => (
            <li key={nome} className="rounded-2xl bg-superficie/60 px-4 py-3 text-sm font-medium ring-1 ring-borda">
              {nome}
            </li>
          ))}
        </ul>
      </Bloco>

      <Bloco id="sobre-privacidade" icone={ShieldCheck} titulo="Como seus dados são tratados">
        <ul className="space-y-2.5 text-sm leading-relaxed">
          <li>Nesta versão não existe servidor: tudo o que você informa fica guardado neste navegador.</li>
          <li>Dado de saúde é dado sensível (LGPD, art. 11). O perfil de saúde é opcional e pode ser apagado em Configurações.</li>
          <li>A sessão encerra após 15 minutos sem uso, e o login bloqueia depois de 5 tentativas erradas.</li>
          <li>Mensagens de WhatsApp nunca levam resultado, diagnóstico ou nome de exame — só o aviso de que há novidade.</li>
        </ul>
        <Link to="/configuracoes" className="mt-4 inline-flex text-sm font-medium text-acento underline-offset-2 hover:underline">
          Ver atividade da conta e apagar dados
        </Link>
      </Bloco>

      <Bloco id="sobre-recursos" icone={Smartphone} titulo="Recursos do aparelho que o app pode pedir">
        <ul className="grid gap-3 sm:grid-cols-2">
          {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="rounded-2xl bg-superficie/60 p-4 ring-1 ring-borda">
              <span className="flex items-center gap-2 font-medium">
                <Icone size={17} className="text-acento" aria-hidden="true" />
                {titulo}
              </span>
              <span className="mt-1 block text-sm text-salvia-600">{texto}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-salvia-600">Nenhum desses recursos é ligado sem um toque seu.</p>
      </Bloco>

      <Bloco id="sobre-dados" icone={Database} titulo="Fontes de dados">
        <p className="text-sm leading-relaxed">
          Mapa e endereços das unidades: ©{' '}
          <LinkExterno href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</LinkExterno>, sob a
          licença ODbL. A rede mostrada reúne unidades próprias das cooperativas Unimed, não a rede credenciada completa —
          a lista oficial é o Guia Médico da Unimed.
        </p>
      </Bloco>

      <Bloco id="sobre-licencas" icone={Code} titulo="Software de código aberto">
        <ul className="divide-y divide-salvia-100">
          {BIBLIOTECAS.map(({ nome, licenca, url }) => (
            <li key={nome} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <LinkExterno href={url}>{nome}</LinkExterno>
              <span className="shrink-0 rounded-full bg-salvia-100 px-2.5 py-0.5 text-xs font-medium text-acento">{licenca}</span>
            </li>
          ))}
        </ul>
      </Bloco>

      <Bloco id="sobre-emergencia" icone={HeartPulse} titulo="Em uma emergência">
        <p className="text-sm">Não use o app. Ligue para o serviço de emergência:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="tel:192" className="inline-flex h-11 items-center gap-2 rounded-full bg-alerta-50 px-5 font-semibold text-alerta-600 transition hover:bg-alerta-100">
            <Phone size={17} aria-hidden="true" /> SAMU 192
          </a>
          <a href="tel:193" className="inline-flex h-11 items-center gap-2 rounded-full bg-superficie/75 px-5 font-semibold text-acento ring-1 ring-borda transition hover:bg-superficie">
            <Phone size={17} aria-hidden="true" /> Bombeiros 193
          </a>
        </div>
      </Bloco>

      <p className="pb-2 text-center text-xs text-salvia-600">© 2026 Squad Jornada · Feito para o Challenge FIAP</p>
    </div>
  );
}
