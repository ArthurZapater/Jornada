import { useEffect, useState } from 'react';
import { CalendarClock, Headphones, IdCard, Lightbulb, LogOut, Pill, ShieldCheck, Video, Wifi } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { NotaResultados } from '../components/exame/ResultadosCompartilhados';
import Avatar from '../components/ui/Avatar';
import BotaoWhatsApp from '../components/ui/BotaoWhatsApp';
import Button from '../components/ui/Button';
import { ConteudoAssincrono } from '../components/ui/Feedback';
import IconTile from '../components/ui/IconTile';
import PageHeader from '../components/ui/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { obterConsulta } from '../services/agendamentoService';
import { obterCompartilhamento } from '../services/compartilhamentoService';
import { formatarDataLonga, formatarHora } from '../utils/format';
import { ABRE_ANTES_MIN, estadoDaSala, formatarEspera } from '../utils/teleconsulta';
import { CENTRAL_WHATSAPP, MENSAGEM_ATENDIMENTO } from '../utils/whatsapp';

// Sala de espera da teleconsulta.
//
// LIMITE HONESTO: a chamada de vídeo em si não existe neste protótipo. Numa operadora,
// ela roda na plataforma de telessaúde integrada ao prontuário, com gravação e
// criptografia definidas por contrato. Aqui fica a experiência até ela: consentimento
// (Resolução CFM nº 2.314/2022), preparo e espera pelo médico. Por isso a tela não
// liga câmera nem microfone — o Permissions-Policy do site, aliás, bloqueia a câmera.

const PREPARO = [
  { icone: Wifi, texto: 'Internet estável — de preferência Wi-Fi' },
  { icone: Headphones, texto: 'Fone de ouvido, para ouvir e ser ouvido melhor' },
  { icone: Lightbulb, texto: 'Lugar reservado e bem iluminado' },
  { icone: IdCard, texto: 'Documento com foto e carteirinha à mão' },
  { icone: Pill, texto: 'Lista dos remédios que você usa' },
];

export default function SalaTeleconsulta() {
  const { id } = useParams();
  const consulta = useAsync(() => obterConsulta(id), [id]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader titulo="Teleconsulta" subtitulo="Sala de espera virtual." voltarPara="/consultas" />
      <ConteudoAssincrono estado={consulta}>{(c) => <Sala consulta={c} />}</ConteudoAssincrono>
    </div>
  );
}

function Sala({ consulta }) {
  const [agora, setAgora] = useState(() => new Date());
  const [consentiu, setConsentiu] = useState(false);
  const [naSala, setNaSala] = useState(false);
  const compartilhamento = useAsync(obterCompartilhamento, []);

  // O estado da sala muda com o relógio: reavalia a cada 30 s.
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (consulta.modalidade !== 'TELECONSULTA' || ['CANCELADA', 'CONCLUIDA'].includes(consulta.status)) {
    return <Aviso titulo="Esta consulta não tem sala virtual" texto="Só teleconsultas agendadas ou confirmadas têm sala de espera." />;
  }

  const { estado, minutosParaAbrir } = estadoDaSala(consulta.dataHora, agora);
  if (estado === 'antes') {
    return (
      <Aviso
        titulo={`A sala abre ${formatarEspera(minutosParaAbrir)}`}
        texto={`Ela abre ${ABRE_ANTES_MIN} minutos antes da consulta, marcada para ${formatarDataLonga(consulta.dataHora)}, às ${formatarHora(consulta.dataHora)}. Enquanto isso, vale deixar tudo pronto:`}
        comPreparo
      />
    );
  }
  if (estado === 'encerrada') {
    return <Aviso titulo="O horário desta teleconsulta já passou" texto="Se você não conseguiu entrar, fale com o atendimento para remarcar." comAtendente />;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <section aria-labelledby="sala-titulo" className="overflow-hidden rounded-[2rem] bg-linear-to-br from-petroleo-800 to-petroleo-950 text-white shadow-[var(--shadow-glass)]">
        <div className="flex aspect-video flex-col items-center justify-center gap-4 p-6 text-center">
          <span className={`rounded-full ${naSala ? 'animate-pulse' : ''}`}>
            <Avatar nome={consulta.medico.nome} tamanho="lg" className="ring-4 ring-petroleo-600" />
          </span>
          <div>
            <h2 id="sala-titulo" className="text-lg font-semibold">
              {naSala ? `Aguardando ${consulta.medico.nome} entrar` : 'Você ainda não entrou na sala'}
            </h2>
            <p className="mt-1 text-sm text-white/80">
              {consulta.especialidade.nome} · hoje às {formatarHora(consulta.dataHora)}
            </p>
          </div>
          {naSala && (
            <p role="status" className="rounded-full bg-petroleo-700/70 px-4 py-1.5 text-sm">
              O médico foi avisado. Mantenha esta tela aberta.
            </p>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        {!naSala ? (
          <div className="glass-strong rounded-3xl p-5">
            <h2 className="font-semibold">Antes de entrar</h2>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={consentiu}
                onChange={(e) => setConsentiu(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo-800"
              />
              <span>
                Concordo em ser atendido(a) por telemedicina, conforme a <strong>Resolução CFM nº 2.314/2022</strong>, e
                sei que o médico pode pedir uma consulta presencial se achar necessário.
              </span>
            </label>
            <Button bloco icone={Video} className="mt-4" disabled={!consentiu} onClick={() => setNaSala(true)}>
              Entrar na sala de espera
            </Button>
          </div>
        ) : (
          <Button as={Link} to="/consultas" variante="perigo" bloco icone={LogOut}>
            Sair da sala
          </Button>
        )}
        <NotaResultados compartilhamento={compartilhamento.dados} tipo="CONSULTA" referenciaId={consulta.id} />
        <Preparo />
        <div role="note" className="flex gap-3 rounded-3xl bg-ambar-50 p-4 text-sm text-ambar-700">
          <ShieldCheck size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            <strong className="block">Demonstração</strong>
            A chamada de vídeo seria feita pela plataforma de telessaúde da operadora. Este protótipo mostra a sala de
            espera; ele não liga sua câmera nem seu microfone.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Preparo() {
  return (
    <section aria-labelledby="preparo" className="glass-strong rounded-3xl p-5">
      <h2 id="preparo" className="font-semibold">Para dar tudo certo</h2>
      <ul className="mt-3 space-y-2.5">
        {PREPARO.map(({ icone: Icone, texto }) => (
          <li key={texto} className="flex items-center gap-3 text-sm">
            <Icone size={17} className="shrink-0 text-acento" aria-hidden="true" />
            {texto}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Aviso({ titulo, texto, comPreparo = false, comAtendente = false }) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="glass-strong rounded-[2rem] p-6 text-center">
        <IconTile icone={CalendarClock} tom="lilas" tamanho="lg" className="mx-auto" />
        <h2 className="mt-4 text-xl font-semibold">{titulo}</h2>
        <p className="mt-2 text-salvia-600">{texto}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button as={Link} to="/consultas" variante="secundario">
            Minhas consultas
          </Button>
          {comAtendente && <BotaoWhatsApp mensagem={MENSAGEM_ATENDIMENTO} numero={CENTRAL_WHATSAPP} tamanho="md">Atendimento</BotaoWhatsApp>}
        </div>
      </section>
      {comPreparo && <Preparo />}
    </div>
  );
}
