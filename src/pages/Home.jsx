import { ArrowRight, CalendarDays, CalendarPlus, ClipboardList, CreditCard, FileCheck, FileText, FlaskConical, HeartPulse, IdCard, MapPin, Phone, Sparkles, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/brand/Logo';
import ProximaConsultaCard from '../components/consulta/ProximaConsultaCard';
import Button from '../components/ui/Button';
import { ConteudoAssincrono, Vazio } from '../components/ui/Feedback';
import IconTile from '../components/ui/IconTile';
import LeafArt from '../components/ui/LeafArt';
import TopicList from '../components/ui/TopicList';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { listarProximasConsultas } from '../services/agendamentoService';
import { comoChamar } from '../utils/perfilSaude';
import { AO_TOCAR, grupoEscalonado, itemEntrada } from '../components/ui/animacoes';
import { LEMBRETES } from '../utils/segmento';

const LinkAnimado = motion.create(Link);

/** Aparece enquanto o questionário do perfil não foi concluído (pulado no 1º acesso). */
function ConviteCompletarPerfil() {
  return (
    <LinkAnimado
      to="/perfil/saude"
      whileTap={AO_TOCAR}
      className="glass-strong flex items-center gap-4 rounded-3xl p-4 transition-colors hover:bg-superficie/80 lg:rounded-[2rem] lg:p-5"
    >
      <IconTile icone={ClipboardList} tom="solido" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Complete seu perfil de saúde</span>
        <span className="block text-sm text-salvia-600">
          Alergias, hábitos e contato de emergência deixam lembretes e plano de cuidado sob medida.
        </span>
      </span>
      <ArrowRight size={18} className="shrink-0 text-salvia-600" aria-hidden="true" />
    </LinkAnimado>
  );
}

const ACOES = [
  { titulo: 'Agendar consulta', descricao: 'Encontre o profissional ideal para você.', to: '/consultas/agendar', icone: CalendarDays, destaque: true },
  { titulo: 'Agendar exame', descricao: 'Realize seus exames com facilidade.', to: '/exames/agendar', icone: FlaskConical },
  { titulo: 'Resultados de exames', descricao: 'Acesse seus laudos e resultados.', to: '/resultados', icone: FileText },
  { titulo: 'Encaminhamentos', tituloMobile: 'Solicitação de encaminhamento', descricao: 'Solicite e acompanhe seus pedidos.', to: '/encaminhamentos', icone: ArrowRight },
  { titulo: 'Rede credenciada', descricao: 'Médicos, clínicas e hospitais perto de você.', to: '/rede', icone: MapPin },
];

// Diferenciais do pitch, fora dos 5 cards do protótipo.
const ACOES_EXTRA = [
  { titulo: 'Plano de cuidado', descricao: 'Veja o que mais pesa na sua saúde hoje.', to: '/plano-de-cuidado', icone: HeartPulse },
  { titulo: 'Pagamento', tituloMobile: 'Pagamento do convênio', descricao: 'Mensalidade, Pix, boleto e histórico.', to: '/pagamento', icone: CreditCard },
  { titulo: 'Assistente', descricao: 'Tire dúvidas sobre consultas e exames.', to: '/assistente', icone: Sparkles },
];

export default function Home() {
  const { usuario } = useAuth();
  const consultas = useAsync(() => listarProximasConsultas(2), []);
  const nome = comoChamar(usuario);
  const lembrete = LEMBRETES[usuario.segmento] ?? LEMBRETES.ADULTO;

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-5 lg:space-y-6">
        {/* Saudação — mobile */}
        <section className="glass-strong relative overflow-hidden rounded-[1.75rem] px-5 py-5 lg:hidden">
          <LeafArt className="-right-12 -top-8 h-40 w-64" />
          <h1 className="relative text-2xl font-semibold tracking-tight">Olá, {nome}</h1>
          <p className="relative mt-1 text-sm text-salvia-600">Que bom ter você por aqui!</p>
        </section>

        {/* Ações rápidas — mobile (grid 3 + 2) */}
        <motion.nav
          aria-label="Ações rápidas"
          className="grid grid-cols-6 gap-3 lg:hidden"
          variants={grupoEscalonado}
          initial="initial"
          animate="animate"
        >
          {[...ACOES, ...ACOES_EXTRA.slice(0, 2)].map((acao, i) => (
            <LinkAnimado
              key={acao.to}
              to={acao.to}
              variants={itemEntrada}
              whileTap={AO_TOCAR}
              className={`${i < 3 ? 'col-span-2' : 'col-span-3'} glass-strong flex min-h-[7.5rem] flex-col justify-between gap-3 rounded-3xl p-4`}
            >
              <IconTile icone={acao.icone} tom="vidro" tamanho="sm" />
              <span className="text-[0.8125rem] font-medium leading-tight">{acao.tituloMobile ?? acao.titulo}</span>
            </LinkAnimado>
          ))}
        </motion.nav>

        {/* Banner de saudação + ações — desktop */}
        <section className="glass relative hidden overflow-hidden rounded-[2rem] p-7 lg:block" aria-labelledby="saudacao">
          <LeafArt className="-right-10 -top-10 h-72 w-[30rem]" />
          <div className="relative flex items-start justify-between gap-6">
            <div>
              <p className="text-lg">Olá, {nome}</p>
              <h1 id="saudacao" className="mt-1 text-[2.1rem] font-semibold leading-tight tracking-tight">
                Sua saúde, nossa prioridade
              </h1>
              <p className="mt-2 max-w-sm text-salvia-600">Conte com um time de especialistas sempre ao seu lado.</p>
            </div>
            <div className="glass-strong mr-4 hidden items-center gap-3 rounded-3xl px-5 py-4 xl:flex">
              <LogoMark className="h-7 w-7" />
              <p className="text-sm leading-snug">
                Mais saúde,
                <br />
                mais momentos
                <br />
                para você.
              </p>
            </div>
          </div>
          <motion.nav
            aria-label="Ações rápidas"
            className="relative mt-7 grid grid-cols-3 gap-3 xl:grid-cols-5"
            variants={grupoEscalonado}
            initial="initial"
            animate="animate"
          >
            {ACOES.map((acao) => (
              <LinkAnimado
                key={acao.to}
                to={acao.to}
                variants={itemEntrada}
                whileHover={{ y: -3 }}
                whileTap={AO_TOCAR}
                className="group flex min-h-40 flex-col rounded-3xl bg-superficie/60 p-4 ring-1 ring-borda shadow-[0_8px_24px_-16px_rgb(20_58_51/0.4)] transition-colors hover:bg-superficie/85"
              >
                <IconTile icone={acao.icone} tom={acao.destaque ? 'solido' : 'verde'} />
                <span className="mt-4 max-w-[8rem] text-[0.9375rem] font-semibold leading-snug">{acao.titulo}</span>
                <span className="mt-auto pt-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-superficie text-acento transition group-hover:bg-petroleo-800 group-hover:text-white">
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </span>
              </LinkAnimado>
            ))}
          </motion.nav>
        </section>

        {usuario.questionario !== 'CONCLUIDO' && <ConviteCompletarPerfil />}

        {/* Próximas consultas */}
        <section className="lg:glass lg:rounded-[2rem] lg:p-6" aria-labelledby="proximas">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="proximas" className="text-base font-semibold lg:text-xl">Próximas consultas</h2>
            <Link to="/consultas" className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-acento hover:bg-superficie/60">
              Ver todas <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ConteudoAssincrono
            estado={consultas}
            vazio={
              <Vazio
                icone={CalendarPlus}
                titulo="Nenhuma consulta agendada"
                descricao="Que tal marcar seu check-up?"
                acao={<Button as={Link} to="/consultas/agendar" tamanho="sm">Agendar consulta</Button>}
              />
            }
          >
            {(lista) => (
              <div className="grid gap-3 xl:grid-cols-2">
                {lista.map((c) => (
                  <ProximaConsultaCard key={c.id} consulta={c} />
                ))}
              </div>
            )}
          </ConteudoAssincrono>
        </section>

        {/* Acesso rápido — desktop */}
        <section className="hidden lg:block" aria-labelledby="acesso-rapido">
          <h2 id="acesso-rapido" className="text-xl font-semibold">Acesso rápido</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[...ACOES_EXTRA, ACOES[2]].map((acao) => (
              <Link
                key={acao.to}
                to={acao.to}
                className="glass group flex flex-col rounded-3xl p-5 transition hover:-translate-y-0.5 hover:bg-superficie/70"
              >
                <IconTile icone={acao.icone} tamanho="sm" />
                <span className="mt-4 font-semibold leading-snug">{acao.titulo}</span>
                <span className="mt-1 text-sm text-salvia-600">{acao.descricao}</span>
                <span className="mt-auto flex justify-end pt-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-superficie text-acento transition group-hover:bg-petroleo-800 group-hover:text-white">
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Lembrete personalizado por segmento — mobile */}
        <Link
          to="/exames"
          className="relative flex items-center gap-4 overflow-hidden rounded-3xl bg-linear-to-r from-salvia-200/90 to-salvia-100/90 p-4 ring-1 ring-borda/80 lg:hidden"
        >
          <IconTile icone={HeartPulse} tom="vidro" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{lembrete.titulo}</span>
            <span className="block text-sm text-acento">{lembrete.texto}</span>
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-petroleo-800 text-white">
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>
      </div>

      {/* Coluna lateral */}
      <aside className="hidden content-start gap-6 md:grid md:grid-cols-2 2xl:grid-cols-1" aria-label="Seu plano e informações">
        <section className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-salvia-100 via-salvia-200 to-salvia-300 p-6 ring-1 ring-borda/80 shadow-[var(--shadow-glass)]">
          <LeafArt className="-bottom-10 -right-10 h-52 w-80" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-acento">Plano familiar</p>
            <p className="mt-2 text-2xl font-semibold leading-tight tracking-tight">
              Mais cuidado
              <br />
              para o que importa
            </p>
            <p className="mt-2 max-w-60 text-sm text-acento">{lembrete.texto}</p>
            <Button as={Link} to="/perfil" tamanho="sm" iconeFim={ArrowRight} className="mt-5">
              Ver detalhes
            </Button>
          </div>
        </section>

        <section className="glass rounded-[2rem] p-5" aria-labelledby="seus-dados">
          <h2 id="seus-dados" className="mb-3 font-semibold">Seus dados</h2>
          <Link to="/perfil" className="flex items-start gap-3 rounded-3xl bg-superficie/70 p-4 ring-1 ring-borda transition hover:bg-superficie/90">
            <IconTile icone={UserRound} tamanho="sm" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block text-base font-semibold">{usuario.nome}</span>
              <span className="block text-salvia-600">{usuario.titularidade}</span>
              <span className="mt-2 block text-salvia-600">Plano: {usuario.plano}</span>
              <span className="block text-salvia-600">
                Carteirinha: <span className="whitespace-nowrap">{usuario.carteirinha}</span>
              </span>
            </span>
            <ArrowRight size={16} className="mt-1 text-salvia-600" aria-hidden="true" />
          </Link>
        </section>

        <section aria-labelledby="informacoes">
          <h2 id="informacoes" className="mb-3 px-1 font-semibold">Informações importantes</h2>
          <TopicList
            itens={[
              { icone: Phone, titulo: 'Telefones de contato', descricao: 'Atualize seus dados de contato.', to: '/perfil/saude' },
              { icone: IdCard, titulo: 'Dados pessoais', descricao: 'Confira e mantenha seus dados atualizados.', to: '/perfil' },
              { icone: FileCheck, titulo: 'Autorização de exames', descricao: 'Veja o status das suas solicitações.', to: '/exames' },
            ]}
          />
        </section>

        <Link to="/rede" className="glass flex items-center gap-4 rounded-[2rem] p-5 transition hover:bg-superficie/70">
          <IconTile icone={HeartPulse} tom="vidro" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Sua saúde em boas mãos</span>
            <span className="block text-sm text-salvia-600">Conte com uma rede completa de hospitais, clínicas e laboratórios.</span>
          </span>
          <ArrowRight size={18} className="text-salvia-600" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}
