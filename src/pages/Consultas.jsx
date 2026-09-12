import { useState } from 'react';
import { ArrowRight, CalendarDays, CalendarPlus, Clock, MapPin, ShieldCheck, Stethoscope, Timer, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import DataBloco from '../components/consulta/DataBloco';
import BotaoWhatsApp from '../components/ui/BotaoWhatsApp';
import Button from '../components/ui/Button';
import { ConteudoAssincrono, Vazio } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import SecurityNote from '../components/ui/SecurityNote';
import ServiceHero from '../components/ui/ServiceHero';
import StatusBadge from '../components/ui/StatusBadge';
import TopicList from '../components/ui/TopicList';
import { useAsync } from '../hooks/useAsync';
import { cancelarConsulta, listarConsultas } from '../services/agendamentoService';
import { agoraLocalISO, formatarDataLonga, formatarHora } from '../utils/format';
import { mensagemConsulta } from '../utils/whatsapp';

const TOPICOS = [
  { icone: CalendarDays, titulo: 'Agendamento presencial ou por telemedicina', to: '/consultas/agendar' },
  { icone: Users, titulo: 'Diversas especialidades', to: '/rede?filtro=MEDICOS' },
  { icone: ShieldCheck, titulo: 'Profissionais qualificados', to: '/rede?filtro=MEDICOS' },
  { icone: Timer, titulo: 'Atendimento rápido e sem complicação', to: '/consultas/agendar' },
];

const ehFutura = (c) => ['AGENDADA', 'CONFIRMADA'].includes(c.status) && c.dataHora >= agoraLocalISO();

export default function Consultas() {
  const consultas = useAsync(listarConsultas, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Consulta médica" subtitulo="Agende, acompanhe e gerencie suas consultas." compartilhar />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <ServiceHero icone={Stethoscope} titulo="Consulta médica" descricao="Cuide da sua saúde com quem você confia." />
          <TopicList itens={TOPICOS} />
          <Button as={Link} to="/consultas/agendar" bloco tamanho="lg" iconeFim={ArrowRight}>
            Agendar consulta
          </Button>
          <SecurityNote />
        </div>

        <section aria-labelledby="minhas-consultas" className="lg:glass lg:rounded-[2rem] lg:p-6">
          <h2 id="minhas-consultas" className="mb-4 text-xl font-semibold">Minhas consultas</h2>
          <ConteudoAssincrono
            estado={consultas}
            vazio={<Vazio icone={CalendarPlus} titulo="Você ainda não tem consultas" descricao="Agende a primeira em poucos passos." />}
          >
            {(lista) => {
              const proximas = lista.filter(ehFutura);
              const historico = lista.filter((c) => !ehFutura(c)).reverse();
              return (
                <div className="space-y-6">
                  <Grupo titulo="Próximas" vazio="Nenhuma consulta futura.">
                    {proximas.map((c) => (
                      <CartaoConsulta key={c.id} consulta={c} futura onCancelada={consultas.recarregar} />
                    ))}
                  </Grupo>
                  <Grupo titulo="Histórico" vazio="Sem consultas anteriores.">
                    {historico.map((c) => (
                      <CartaoConsulta key={c.id} consulta={c} />
                    ))}
                  </Grupo>
                </div>
              );
            }}
          </ConteudoAssincrono>
        </section>
      </div>
    </div>
  );
}

function Grupo({ titulo, vazio, children }) {
  const itens = [children].flat().filter(Boolean);
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-salvia-600">{titulo}</h3>
      {itens.length ? <ul className="space-y-3">{itens}</ul> : <p className="text-sm text-salvia-600">{vazio}</p>}
    </div>
  );
}

function CartaoConsulta({ consulta, futura = false, onCancelada }) {
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState('');

  async function cancelar() {
    setCancelando(true);
    setErro('');
    try {
      await cancelarConsulta(consulta.id);
      onCancelada?.();
    } catch (e) {
      setErro(e.message);
      setCancelando(false);
    }
  }

  return (
    <li className={`rounded-3xl p-4 ring-1 ring-borda ${futura ? 'bg-superficie/75' : 'bg-superficie/45'}`}>
      <div className="flex gap-4">
        <DataBloco data={consulta.dataHora} apagado={!futura} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{consulta.especialidade.nome}</p>
            <StatusBadge status={consulta.status} />
          </div>
          <p className="text-sm text-salvia-600">{consulta.medico.nome}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm first-letter:uppercase">
            <Clock size={14} className="shrink-0 text-salvia-600" aria-hidden="true" />
            <span className="first-letter:uppercase">{formatarDataLonga(consulta.dataHora)}</span> · {formatarHora(consulta.dataHora)}
          </p>
          <p className="flex items-center gap-1.5 text-sm">
            <MapPin size={14} className="shrink-0 text-salvia-600" aria-hidden="true" />
            {consulta.unidade.nome}
          </p>
        </div>
      </div>
      {futura && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {erro && <p role="alert" className="mr-auto text-sm text-alerta-600">{erro}</p>}
          {confirmando ? (
            <>
              <span className="text-sm">Cancelar esta consulta?</span>
              <Button variante="fantasma" tamanho="sm" onClick={() => setConfirmando(false)} disabled={cancelando}>
                Manter
              </Button>
              <Button variante="perigo" tamanho="sm" onClick={cancelar} carregando={cancelando}>
                Sim, cancelar
              </Button>
            </>
          ) : (
            <>
              <BotaoWhatsApp mensagem={mensagemConsulta(consulta)}>Enviar no WhatsApp</BotaoWhatsApp>
              <Button variante="fantasma" tamanho="sm" onClick={() => setConfirmando(true)}>
                Cancelar consulta
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
