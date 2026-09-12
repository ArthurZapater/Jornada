import { useEffect, useState } from 'react';
import { CalendarDays, Clock, MapPin, MonitorSmartphone, Stethoscope, UserRound, Video } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Calendario from '../components/agendamento/Calendario';
import Etapa from '../components/agendamento/Etapa';
import HorarioChips from '../components/agendamento/HorarioChips';
import OpcaoCard from '../components/agendamento/OpcaoCard';
import ResumoAgendamento from '../components/agendamento/ResumoAgendamento';
import SucessoAgendamento from '../components/agendamento/SucessoAgendamento';
import Button from '../components/ui/Button';
import { ConteudoAssincrono } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import { useNotificacoes } from '../contexts/NotificacoesContext';
import { useAsync } from '../hooks/useAsync';
import { useMesNavegavel } from '../hooks/useMesNavegavel';
import {
  agendarConsulta,
  listarDiasDisponiveis,
  listarEspecialidades,
  listarHorarios,
  listarMedicos,
  listarUnidades,
  obterMedico,
} from '../services/agendamentoService';
import { formatarData, formatarDataLonga, formatarDistancia, formatarHora } from '../utils/format';
import { ABRE_ANTES_MIN, MODALIDADES } from '../utils/teleconsulta';

export default function AgendarConsulta() {
  const [params] = useSearchParams();
  const { carregar: atualizarNotificacoes } = useNotificacoes();
  const calendario = useMesNavegavel();

  const [especialidade, setEspecialidade] = useState(null);
  const [modalidade, setModalidade] = useState(null);
  const [medico, setMedico] = useState(null);
  const [unidade, setUnidade] = useState(null);
  const [data, setData] = useState(null);
  const [horario, setHorario] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmada, setConfirmada] = useState(null);

  const especialidades = useAsync(listarEspecialidades, []);
  const medicos = useAsync(() => (especialidade ? listarMedicos(especialidade.id) : []), [especialidade?.id]);
  const tele = modalidade === 'TELECONSULTA';
  const unidades = useAsync(() => (medico && !tele ? listarUnidades({ medicoId: medico.id }) : []), [medico?.id, tele]);
  // Teleconsulta não tem unidade: a agenda é a "online" do médico (unidadeId nulo).
  const localDefinido = tele || Boolean(unidade);
  const unidadeId = tele ? null : unidade?.id;
  const dias = useAsync(
    () =>
      medico && localDefinido
        ? listarDiasDisponiveis({ tipo: 'consulta', recursoId: medico.id, unidadeId, ano: calendario.ano, mes: calendario.mes })
        : [],
    [medico?.id, localDefinido, unidadeId, calendario.ano, calendario.mes],
  );
  const horarios = useAsync(
    () => (data ? listarHorarios({ tipo: 'consulta', recursoId: medico.id, unidadeId, data }) : []),
    [medico?.id, unidadeId, data],
  );

  // Pré-seleção vinda da busca global, da Rede credenciada ou de um encaminhamento.
  useEffect(() => {
    let ativo = true;
    const medicoId = params.get('medico');
    if (MODALIDADES[params.get('modalidade')]) setModalidade(params.get('modalidade'));
    const especialidadeId = Number(params.get('especialidade'));
    if (medicoId) {
      obterMedico(medicoId)
        .then((m) => ativo && (setEspecialidade(m.especialidade), setMedico(m)))
        .catch(() => {});
    } else if (especialidadeId) {
      listarEspecialidades().then((lista) => {
        const encontrada = lista.find((e) => e.id === especialidadeId);
        if (ativo && encontrada) setEspecialidade(encontrada);
      });
    }
    return () => {
      ativo = false;
    };
  }, [params]);

  function escolherEspecialidade(e) {
    setEspecialidade(e);
    // Trocou para uma especialidade só presencial: a escolha de vídeo deixa de valer.
    if (e && !e.teleconsulta && modalidade === 'TELECONSULTA') setModalidade(null);
    escolherMedico(null);
  }
  function escolherModalidade(m) {
    setModalidade(m);
    escolherUnidade(null);
  }
  function escolherMedico(m) {
    setMedico(m);
    escolherUnidade(null);
  }
  function escolherUnidade(u) {
    setUnidade(u);
    escolherData(null);
  }
  function escolherData(d) {
    setData(d);
    setHorario(null);
    setErro('');
  }

  // Etapas: 0 especialidade, 1 modalidade, 2 médico, 3 unidade (só presencial), 4 data, 5 horário.
  const etapaAtual = !especialidade ? 0 : !modalidade ? 1 : !medico ? 2 : !localDefinido ? 3 : !data ? 4 : !horario ? 5 : 6;
  const numero = (i) => (tele && i > 3 ? i : i + 1);
  const estado = (i) => (i < etapaAtual ? 'concluida' : i === etapaAtual ? 'ativa' : 'pendente');

  async function confirmar() {
    setEnviando(true);
    setErro('');
    try {
      const consulta = await agendarConsulta({ medicoId: medico.id, modalidade, unidadeId, data, horario });
      setConfirmada(consulta);
      atualizarNotificacoes();
    } catch (e) {
      setErro(e.message);
      if (e.status === 409) {
        setHorario(null);
        horarios.recarregar();
      }
    } finally {
      setEnviando(false);
    }
  }

  if (confirmada) {
    return (
      <SucessoAgendamento
        titulo={confirmada.unidade ? 'Consulta agendada!' : 'Teleconsulta agendada!'}
        descricao={
          confirmada.unidade
            ? 'Enviamos a confirmação para suas notificações.'
            : `A sala de espera abre ${ABRE_ANTES_MIN} minutos antes, em Minhas consultas. Tenha internet estável e fone de ouvido.`
        }
        detalhes={[
          { rotulo: 'Especialidade', valor: confirmada.especialidade.nome },
          { rotulo: 'Profissional', valor: confirmada.medico.nome },
          { rotulo: 'Data', valor: formatarData(confirmada.dataHora) },
          { rotulo: 'Horário', valor: formatarHora(confirmada.dataHora) },
          { rotulo: 'Local', valor: confirmada.unidade ? confirmada.unidade.nome : 'Teleconsulta, por vídeo' },
        ]}
      >
        <Button as={Link} to="/consultas" bloco tamanho="lg">Ver minhas consultas</Button>
        <Button as={Link} to="/" variante="secundario" bloco>Voltar ao início</Button>
      </SucessoAgendamento>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Agendar consulta" subtitulo="Presencial ou por teleconsulta, em poucos passos." voltarPara="/consultas" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="space-y-3">
          <Etapa numero={1} titulo="Especialidade" estado={estado(0)} resumo={especialidade?.nome} onAlterar={() => escolherEspecialidade(null)}>
            <ConteudoAssincrono estado={especialidades} vazio="Nenhuma especialidade disponível.">
              {(lista) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {lista.map((e) => (
                    <OpcaoCard key={e.id} titulo={e.nome} descricao={e.descricao} icone={Stethoscope} onClick={() => escolherEspecialidade(e)} />
                  ))}
                </div>
              )}
            </ConteudoAssincrono>
          </Etapa>

          <Etapa numero={2} titulo="Como prefere ser atendido" estado={estado(1)} resumo={modalidade && MODALIDADES[modalidade].rotulo} onAlterar={() => escolherModalidade(null)}>
            <div className="grid gap-2 sm:grid-cols-2">
              <OpcaoCard icone={MapPin} titulo={MODALIDADES.PRESENCIAL.rotulo} descricao={MODALIDADES.PRESENCIAL.descricao} onClick={() => escolherModalidade('PRESENCIAL')} />
              {especialidade?.teleconsulta ? (
                <OpcaoCard icone={Video} tom="lilas" titulo={MODALIDADES.TELECONSULTA.rotulo} descricao={MODALIDADES.TELECONSULTA.descricao} onClick={() => escolherModalidade('TELECONSULTA')} />
              ) : (
                <div className="flex items-center gap-3 rounded-2xl bg-superficie/40 p-3 ring-1 ring-borda/70" aria-disabled="true">
                  <MonitorSmartphone size={20} className="mx-2.5 shrink-0 text-salvia-600" aria-hidden="true" />
                  <span className="text-sm text-salvia-600">
                    <span className="block font-semibold">Teleconsulta indisponível</span>
                    {especialidade?.nome} depende de exame no consultório.
                  </span>
                </div>
              )}
            </div>
          </Etapa>

          <Etapa numero={3} titulo="Médico" estado={estado(2)} resumo={medico?.nome} onAlterar={() => escolherMedico(null)}>
            <ConteudoAssincrono estado={medicos} vazio="Nenhum profissional disponível para esta especialidade.">
              {(lista) => (
                <div className="grid gap-2">
                  {lista.map((m) => (
                    <OpcaoCard
                      key={m.id}
                      avatar={m.nome}
                      titulo={m.nome}
                      descricao={tele ? `${m.crm} · Atende por vídeo` : `${m.crm} · ${m.unidades.map((u) => u.nome).join(', ')}`}
                      onClick={() => escolherMedico(m)}
                    />
                  ))}
                </div>
              )}
            </ConteudoAssincrono>
          </Etapa>

          {!tele && (
            <Etapa numero={4} titulo="Unidade" estado={estado(3)} resumo={unidade?.nome} onAlterar={() => escolherUnidade(null)}>
              <ConteudoAssincrono estado={unidades} vazio="Nenhuma unidade disponível.">
                {(lista) => (
                  <div className="grid gap-2">
                    {lista.map((u) => (
                      <OpcaoCard key={u.id} icone={MapPin} titulo={u.nome} descricao={u.endereco} extra={formatarDistancia(u.distanciaKm)} onClick={() => escolherUnidade(u)} />
                    ))}
                  </div>
                )}
              </ConteudoAssincrono>
            </Etapa>
          )}

          <Etapa numero={numero(4)} titulo="Data" estado={estado(4)} resumo={data && formatarDataLonga(data)} onAlterar={() => escolherData(null)}>
            <Calendario
              {...calendario.props}
              diasDisponiveis={dias.dados ?? []}
              carregando={dias.carregando}
              selecionado={data}
              onSelecionar={escolherData}
            />
            {!dias.carregando && dias.dados?.length === 0 && (
              <p className="mt-3 text-sm text-salvia-600">Sem datas livres neste mês. Veja o próximo.</p>
            )}
          </Etapa>

          <Etapa numero={numero(5)} titulo="Horário" estado={estado(5)} resumo={horario} onAlterar={() => setHorario(null)}>
            <ConteudoAssincrono estado={horarios} vazio="Nenhum horário livre nesta data. Escolha outro dia.">
              {(lista) => <HorarioChips horarios={lista} selecionado={horario} onSelecionar={setHorario} />}
            </ConteudoAssincrono>
          </Etapa>
        </div>

        <ResumoAgendamento
          linhas={[
            { icone: Stethoscope, rotulo: 'Especialidade', valor: especialidade?.nome },
            { icone: tele ? Video : MapPin, rotulo: tele ? 'Atendimento' : 'Unidade', valor: tele ? 'Teleconsulta, por vídeo' : unidade?.nome },
            { icone: UserRound, rotulo: 'Médico', valor: medico?.nome },
            { icone: CalendarDays, rotulo: 'Data', valor: data && formatarData(data) },
            { icone: Clock, rotulo: 'Horário', valor: horario },
          ]}
          completo={etapaAtual === 6}
          enviando={enviando}
          erro={erro}
          onConfirmar={confirmar}
          textoBotao="Confirmar agendamento"
          observacao={
            tele
              ? `Você entra pela tela Minhas consultas, até ${ABRE_ANTES_MIN} min antes. Pode cancelar até 24h antes, sem custo.`
              : 'Você pode cancelar até 24h antes, sem custo.'
          }
        />
      </div>
    </div>
  );
}
