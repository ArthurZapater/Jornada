import { useState } from 'react';
import {
  Activity,
  BatteryMedium,
  Bluetooth,
  Check,
  ChevronDown,
  CircleDot,
  Droplets,
  HeartPulse,
  Info,
  LockKeyhole,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  Smartphone,
  Watch,
  Wifi,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Carregando, MensagemErro } from '../components/ui/Feedback';
import IconTile from '../components/ui/IconTile';
import Interruptor from '../components/ui/Interruptor';
import PageHeader from '../components/ui/PageHeader';
import { AO_TOCAR, grupoEscalonado, itemEntrada, MOLA } from '../components/ui/animacoes';
import { useAsync } from '../hooks/useAsync';
import {
  conectarDispositivo,
  definirPermissaoDispositivo,
  desconectarDispositivo,
  listarConexoes,
  ROTULOS_DADOS,
  sincronizarDispositivo,
  sincronizarTodosDispositivos,
} from '../services/conexoesService';
import { tempoRelativo } from '../utils/format';

const ICONES = {
  'apple-watch': Watch,
  'health-connect': Smartphone,
  'anel-inteligente': CircleDot,
  'sensor-glicose': Droplets,
  'medidor-pressao': Activity,
  'balanca-inteligente': Scale,
};

const TONS = {
  verde: 'from-salvia-100 to-salvia-200 text-acento',
  nevoa: 'from-nevoa-100 to-nevoa-300 text-acento',
  lilas: 'from-lilas-100 to-lilas-200 text-lilas-600',
};

export default function Conexoes() {
  const painel = useAsync(listarConexoes, []);
  const [processando, setProcessando] = useState(null);
  const [configurando, setConfigurando] = useState(null);
  const [removendo, setRemovendo] = useState(null);
  const [aviso, setAviso] = useState('');

  async function executar(chave, acao, mensagem) {
    setProcessando(chave);
    setAviso('');
    try {
      await acao();
      setAviso(mensagem);
      painel.recarregar();
    } catch (erro) {
      setAviso(erro.message);
    } finally {
      setProcessando(null);
    }
  }

  async function alternarPermissao(dispositivo, tipo, ativo) {
    setProcessando(`${dispositivo.id}-${tipo}`);
    try {
      await definirPermissaoDispositivo(dispositivo.id, tipo, ativo);
      setAviso(`${ROTULOS_DADOS[tipo]} ${ativo ? 'ativado' : 'pausado'} para ${dispositivo.nome}.`);
      painel.recarregar();
    } catch (erro) {
      setAviso(erro.message);
    } finally {
      setProcessando(null);
    }
  }

  const dados = painel.dados;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Conexões"
        subtitulo="Seus dispositivos de saúde, reunidos com privacidade."
        acao={
          <Button as="a" href="#novas-conexoes" tamanho="sm" icone={Plus} className="hidden sm:inline-flex">
            Conectar
          </Button>
        }
      />

      <p className="sr-only" role="status" aria-live="polite">{aviso}</p>

      {painel.carregando && !dados ? (
        <Carregando texto="Preparando suas conexões..." />
      ) : painel.erro ? (
        <MensagemErro mensagem={painel.erro.message} onTentarNovamente={painel.recarregar} />
      ) : (
        <div className="space-y-7">
          <ResumoConexoes dados={dados} />

          {aviso && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={MOLA}
              className="flex items-center gap-2 rounded-2xl bg-salvia-100 px-4 py-3 text-sm font-medium text-acento"
            >
              <Check size={17} aria-hidden="true" /> {aviso}
            </motion.p>
          )}

          <section aria-labelledby="conectados">
            <div className="mb-3 flex flex-col items-start justify-between gap-3 px-1 sm:flex-row sm:items-end">
              <div>
                <h2 id="conectados" className="text-lg font-semibold lg:text-xl">Conectados a você</h2>
                <p className="text-sm text-salvia-600">Controle a sincronização e escolha quais dados entram na Jornada.</p>
              </div>
              <Button
                tamanho="sm"
                variante="secundario"
                icone={RefreshCw}
                carregando={processando === 'sincronizar-todos'}
                disabled={dados.conectados.length === 0}
                onClick={() => executar(
                  'sincronizar-todos',
                  sincronizarTodosDispositivos,
                  'Todos os dispositivos foram atualizados.',
                )}
              >
                Atualizar todos
              </Button>
            </div>

            {dados.conectados.length === 0 ? (
              <div className="glass-strong rounded-[1.75rem] px-6 py-9 text-center">
                <Bluetooth size={28} className="mx-auto text-salvia-600" aria-hidden="true" />
                <p className="mt-3 font-semibold">Nenhum dispositivo conectado</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-salvia-600">
                  Escolha uma opção abaixo para começar a montar seu histórico de saúde.
                </p>
              </div>
            ) : (
              <motion.div className="grid grid-cols-1 gap-4 xl:grid-cols-2" variants={grupoEscalonado} initial="initial" animate="animate">
                {dados.conectados.map((dispositivo) => (
                  <DispositivoConectado
                    key={dispositivo.id}
                    dispositivo={dispositivo}
                    aberto={configurando === dispositivo.id}
                    removendo={removendo === dispositivo.id}
                    processando={processando}
                    aoConfigurar={() => setConfigurando((atual) => atual === dispositivo.id ? null : dispositivo.id)}
                    aoPedirRemocao={() => setRemovendo(dispositivo.id)}
                    aoCancelarRemocao={() => setRemovendo(null)}
                    aoRemover={() => executar(
                      `remover-${dispositivo.id}`,
                      () => desconectarDispositivo(dispositivo.id),
                      `${dispositivo.nome} foi desconectado.`,
                    ).then(() => setRemovendo(null))}
                    aoSincronizar={() => executar(
                      `sincronizar-${dispositivo.id}`,
                      () => sincronizarDispositivo(dispositivo.id),
                      `${dispositivo.nome} sincronizado agora.`,
                    )}
                    aoAlternar={(tipo, ativo) => alternarPermissao(dispositivo, tipo, ativo)}
                  />
                ))}
              </motion.div>
            )}
          </section>

          <section id="novas-conexoes" aria-labelledby="catalogo-conexoes" className="scroll-mt-5">
            <div className="mb-3 px-1">
              <h2 id="catalogo-conexoes" className="text-lg font-semibold lg:text-xl">Adicionar uma conexão</h2>
              <p className="text-sm text-salvia-600">Adicione quantos dispositivos precisar, inclusive do mesmo tipo. Cada um tem suas próprias permissões.</p>
            </div>
            <motion.div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" variants={grupoEscalonado} initial="initial" animate="animate">
              {dados.disponiveis.map((dispositivo) => (
                <ConexaoDisponivel
                  key={dispositivo.id}
                  dispositivo={dispositivo}
                  conectando={processando === `conectar-${dispositivo.id}`}
                  aoConectar={(nome) => executar(
                    `conectar-${dispositivo.id}`,
                    () => conectarDispositivo(dispositivo.id, nome),
                    `${dispositivo.nome} conectado com sucesso.`,
                  )}
                />
              ))}
            </motion.div>
          </section>

          <Privacidade />
        </div>
      )}
    </div>
  );
}

function ResumoConexoes({ dados }) {
  const temConexao = dados.resumo.quantidade > 0;
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-petroleo-700 to-petroleo-950 p-6 text-white shadow-[0_22px_54px_-24px_rgb(14_42_37/0.9)] lg:p-8">
      <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border border-salvia-100/15" aria-hidden="true" />
      <div className="absolute -right-8 -top-14 h-52 w-52 rounded-full border border-salvia-100/15" aria-hidden="true" />
      <div className="relative grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-white/75">
            <span className={`h-2.5 w-2.5 rounded-full ${temConexao ? 'bg-salvia-300' : 'bg-salvia-100/45'}`} />
            {temConexao ? 'Ecossistema de saúde ativo' : 'Pronto para conectar'}
          </div>
          <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight lg:text-3xl">
            Sua saúde também acontece entre uma consulta e outra.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 lg:text-base">
            A Jornada transforma sinais dos seus dispositivos em um histórico simples, que ajuda você a perceber tendências e chegar mais preparado ao cuidado.
          </p>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <dd className="text-2xl font-semibold">{dados.resumo.quantidade}</dd>
              <dt className="text-xs text-white/70">{dados.resumo.quantidade === 1 ? 'conexão ativa' : 'conexões ativas'}</dt>
            </div>
            <div>
              <dd className="text-2xl font-semibold">{dados.resumo.fontesAtivas}</dd>
              <dt className="text-xs text-white/70">tipos de dado</dt>
            </div>
            <div>
              <dd className="text-base font-semibold">{dados.resumo.ultimaSincronizacao ? tempoRelativo(dados.resumo.ultimaSincronizacao) : 'Ainda não'}</dd>
              <dt className="text-xs text-white/70">última sincronização</dt>
            </div>
          </dl>
          {temConexao && (
            <Link
              to="/plano-de-cuidado"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-salvia-100/10 px-3.5 py-2 text-sm font-medium text-white ring-1 ring-salvia-100/20 transition hover:bg-salvia-100/20"
            >
              <HeartPulse size={16} aria-hidden="true" />
              Estes dados participam do seu score de cuidado
            </Link>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[26rem] lg:grid-cols-2" aria-label="Indicadores recentes">
          {(dados.indicadores.length ? dados.indicadores : [
            { tipo: 'atividade', rotulo: 'Passos hoje', valor: '—' },
            { tipo: 'coracao', rotulo: 'Último pulso', valor: '—' },
            { tipo: 'sono', rotulo: 'Sono', valor: '—' },
            { tipo: 'oxigenacao', rotulo: 'Oxigenação', valor: '—' },
          ]).map((item) => (
            <div key={item.tipo} className="rounded-2xl bg-salvia-100/10 p-3.5 ring-1 ring-salvia-100/15 backdrop-blur-sm">
              <p className="flex items-start justify-between gap-2 text-xs text-white/65">
                <span>{item.rotulo}</span>
                {item.estado === 'ATENCAO' && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ambar-50" aria-label="Em atenção" />}
              </p>
              <p className="mt-1 truncate font-semibold">{item.valor}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DispositivoConectado({
  dispositivo,
  aberto,
  removendo,
  processando,
  aoConfigurar,
  aoPedirRemocao,
  aoCancelarRemocao,
  aoRemover,
  aoSincronizar,
  aoAlternar,
}) {
  const Icone = ICONES[dispositivo.tipoId] ?? Bluetooth;
  return (
    <motion.article variants={itemEntrada} className="glass-strong overflow-hidden rounded-[1.75rem]">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <IconTile icone={Icone} tom={dispositivo.tom === 'lilas' ? 'lilas' : 'verde'} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words font-semibold">{dispositivo.nome}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-salvia-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-acento">
                <span className="h-1.5 w-1.5 rounded-full bg-petroleo-600" /> Conectado
              </span>
            </div>
            <p className="mt-0.5 text-sm text-salvia-600">{dispositivo.categoria} · {dispositivo.compatibilidade}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-salvia-600">
              <span className="flex items-center gap-1"><RefreshCw size={13} /> {tempoRelativo(dispositivo.ultimaSincronizacao)}</span>
              {dispositivo.bateria !== null && (
                <span className="flex items-center gap-1"><BatteryMedium size={14} /> {dispositivo.bateria}%</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            tamanho="sm"
            variante="secundario"
            icone={RefreshCw}
            carregando={processando === `sincronizar-${dispositivo.id}`}
            onClick={aoSincronizar}
          >
            Sincronizar
          </Button>
          <motion.button
            type="button"
            whileTap={AO_TOCAR}
            onClick={aoConfigurar}
            aria-expanded={aberto}
            className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold text-acento transition hover:bg-superficie/70"
          >
            Dados compartilhados
            <motion.span animate={{ rotate: aberto ? 180 : 0 }} transition={MOLA}>
              <ChevronDown size={16} aria-hidden="true" />
            </motion.span>
          </motion.button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={MOLA}
            className="overflow-hidden border-t border-salvia-100"
          >
            <div className="px-5 pt-4">
              <p className="text-sm font-medium">O que a Jornada pode importar</p>
              <p className="text-xs text-salvia-600">Você pode pausar qualquer categoria sem desconectar o dispositivo.</p>
            </div>
            <div className="divide-y divide-salvia-100 px-1 py-2" aria-busy={Boolean(processando)}>
              {Object.entries(dispositivo.permissoes).map(([tipo, ativo]) => (
                <Interruptor
                  key={tipo}
                  id={`${dispositivo.id}-${tipo}`}
                  rotulo={ROTULOS_DADOS[tipo]}
                  ligado={ativo}
                  onChange={(valor) => aoAlternar(tipo, valor)}
                  className={processando === `${dispositivo.id}-${tipo}` ? 'opacity-60' : ''}
                />
              ))}
            </div>
            <div className="flex justify-end border-t border-salvia-100 px-5 py-3">
              <button type="button" onClick={aoPedirRemocao} className="rounded-full px-3 py-2 text-sm font-medium text-alerta-600 hover:bg-alerta-50">
                Desconectar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {removendo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOLA}
            className="border-t border-alerta-100 bg-alerta-50 p-4"
            role="alertdialog"
            aria-labelledby={`remover-${dispositivo.id}`}
          >
            <p id={`remover-${dispositivo.id}`} className="text-sm font-medium text-alerta-600">
              Desconectar {dispositivo.nome}? O histórico já importado continua na sua Jornada.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button tamanho="sm" variante="fantasma" icone={X} onClick={aoCancelarRemocao}>Cancelar</Button>
              <Button
                tamanho="sm"
                variante="perigo"
                carregando={processando === `remover-${dispositivo.id}`}
                onClick={aoRemover}
              >
                Desconectar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function ConexaoDisponivel({ dispositivo, conectando, aoConectar }) {
  const [nome, setNome] = useState('');
  const Icone = ICONES[dispositivo.id] ?? Bluetooth;
  const Rede = dispositivo.compatibilidade.includes('Wi-Fi') ? Wifi : Bluetooth;
  return (
    <motion.article variants={itemEntrada} className="glass group flex min-w-0 flex-col rounded-[1.75rem] p-5 transition hover:-translate-y-0.5 hover:bg-superficie/65">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br ${TONS[dispositivo.tom]}`} aria-hidden="true">
          <Icone size={23} strokeWidth={1.9} />
        </span>
        <span className="flex items-center gap-1 rounded-full bg-superficie/65 px-2.5 py-1 text-[0.6875rem] font-medium text-salvia-600 ring-1 ring-borda">
          <Rede size={12} aria-hidden="true" /> {dispositivo.compatibilidade}
        </span>
      </div>
      <h3 className="mt-4 font-semibold">{dispositivo.nome}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-salvia-600">{dispositivo.descricao}</p>
      <p className="mt-3 text-xs text-salvia-600">{dispositivo.quantidade} conectado(s) deste tipo</p>
      <form onSubmit={(event) => { event.preventDefault(); aoConectar(nome); }} className="mt-3">
      <label htmlFor={`nome-${dispositivo.id}`} className="text-sm font-medium">Nome do dispositivo (opcional)</label>
      <input
        id={`nome-${dispositivo.id}`}
        value={nome}
        onChange={(event) => setNome(event.target.value)}
        maxLength={60}
        disabled={conectando}
        placeholder="Ex.: meu relógio de treino"
        className="mt-1 w-full min-w-0 rounded-xl bg-superficie/70 px-3 py-2 text-sm ring-1 ring-borda placeholder:text-salvia-600"
      />
      <Button
        type="submit"
        variante="secundario"
        tamanho="sm"
        icone={Plus}
        carregando={conectando}
        className="mt-4 self-start"
      >
        {dispositivo.quantidade > 0 ? 'Adicionar outro' : 'Conectar'}
      </Button>
      </form>
    </motion.article>
  );
}

function Privacidade() {
  return (
    <section className="grid grid-cols-1 gap-4 rounded-[2rem] bg-linear-to-br from-salvia-100/90 to-nevoa-100/80 p-5 ring-1 ring-borda/80 md:grid-cols-[auto_minmax(0,1fr)_minmax(16rem,0.65fr)] md:items-center lg:p-6">
      <IconTile icone={ShieldCheck} tom="solido" tamanho="lg" />
      <div>
        <h2 className="font-semibold">Você decide o que entra na sua Jornada</h2>
        <p className="mt-1 text-sm leading-relaxed text-salvia-600">
          Cada categoria de dado pode ser pausada separadamente. Desconectar uma fonte não apaga o histórico que você já escolheu importar.
        </p>
      </div>
      <div className="rounded-2xl bg-superficie/60 p-4 text-sm ring-1 ring-borda">
        <p className="flex items-center gap-2 font-medium"><LockKeyhole size={16} className="text-acento" /> Demonstração segura</p>
        <p className="mt-1 text-xs leading-relaxed text-salvia-600">
          Nesta versão, conexões e leituras são simuladas no próprio navegador. Nenhum wearable real é acessado.
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-salvia-600"><Info size={14} className="mt-0.5 shrink-0" /> Uma versão real exigirá autorização do sistema e da fabricante.</p>
      </div>
    </section>
  );
}
