import { useEffect, useState } from 'react';
import { CalendarDays, Clock, MapPin, Stethoscope, UserRound } from 'lucide-react';
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

export default function AgendarConsulta() {
  const [params] = useSearchParams();
  const { carregar: atualizarNotificacoes } = useNotificacoes();
  const calendario = useMesNavegavel();

  const [especialidade, setEspecialidade] = useState(null);
  const [medico, setMedico] = useState(null);
  const [unidade, setUnidade] = useState(null);
  const [data, setData] = useState(null);
  const [horario, setHorario] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmada, setConfirmada] = useState(null);

  const especialidades = useAsync(listarEspecialidades, []);
  const medicos = useAsync(() => (especialidade ? listarMedicos(especialidade.id) : []), [especialidade?.id]);
  const unidades = useAsync(() => (medico ? listarUnidades({ medicoId: medico.id }) : []), [medico?.id]);
  const dias = useAsync(
    () =>
      medico && unidade
        ? listarDiasDisponiveis({ tipo: 'consulta', recursoId: medico.id, unidadeId: unidade.id, ano: calendario.ano, mes: calendario.mes })
        : [],
    [medico?.id, unidade?.id, calendario.ano, calendario.mes],
  );
  const horarios = useAsync(
    () => (data ? listarHorarios({ tipo: 'consulta', recursoId: medico.id, unidadeId: unidade.id, data }) : []),
    [medico?.id, unidade?.id, data],
  );

  // Pré-seleção vinda da busca global, da Rede credenciada ou de um encaminhamento.
  useEffect(() => {
    let ativo = true;
    const medicoId = params.get('medico');
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
    escolherMedico(null);
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

  const etapaAtual = !especialidade ? 0 : !medico ? 1 : !unidade ? 2 : !data ? 3 : !horario ? 4 : 5;
  const estado = (i) => (i < etapaAtual ? 'concluida' : i === etapaAtual ? 'ativa' : 'pendente');

  async function confirmar() {
    setEnviando(true);
    setErro('');
    try {
      const consulta = await agendarConsulta({ medicoId: medico.id, unidadeId: unidade.id, data, horario });
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
        titulo="Consulta agendada!"
        descricao="Enviamos a confirmação para suas notificações."
        detalhes={[
          { rotulo: 'Especialidade', valor: confirmada.especialidade.nome },
          { rotulo: 'Profissional', valor: confirmada.medico.nome },
          { rotulo: 'Data', valor: formatarData(confirmada.dataHora) },
          { rotulo: 'Horário', valor: formatarHora(confirmada.dataHora) },
          { rotulo: 'Local', valor: confirmada.unidade.nome },
        ]}
      >
        <Button as={Link} to="/consultas" bloco tamanho="lg">Ver minhas consultas</Button>
        <Button as={Link} to="/" variante="secundario" bloco>Voltar ao início</Button>
      </SucessoAgendamento>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Agendar consulta" subtitulo="Escolha especialidade, profissional, local, data e horário." voltarPara="/consultas" />
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

          <Etapa numero={2} titulo="Médico" estado={estado(1)} resumo={medico?.nome} onAlterar={() => escolherMedico(null)}>
            <ConteudoAssincrono estado={medicos} vazio="Nenhum profissional disponível para esta especialidade.">
              {(lista) => (
                <div className="grid gap-2">
                  {lista.map((m) => (
                    <OpcaoCard key={m.id} avatar={m.nome} titulo={m.nome} descricao={`${m.crm} · ${m.unidades.map((u) => u.nome).join(', ')}`} onClick={() => escolherMedico(m)} />
                  ))}
                </div>
              )}
            </ConteudoAssincrono>
          </Etapa>

          <Etapa numero={3} titulo="Unidade" estado={estado(2)} resumo={unidade?.nome} onAlterar={() => escolherUnidade(null)}>
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

          <Etapa numero={4} titulo="Data" estado={estado(3)} resumo={data && formatarDataLonga(data)} onAlterar={() => escolherData(null)}>
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

          <Etapa numero={5} titulo="Horário" estado={estado(4)} resumo={horario} onAlterar={() => setHorario(null)}>
            <ConteudoAssincrono estado={horarios} vazio="Nenhum horário livre nesta data. Escolha outro dia.">
              {(lista) => <HorarioChips horarios={lista} selecionado={horario} onSelecionar={setHorario} />}
            </ConteudoAssincrono>
          </Etapa>
        </div>

        <ResumoAgendamento
          linhas={[
            { icone: Stethoscope, rotulo: 'Especialidade', valor: especialidade?.nome },
            { icone: UserRound, rotulo: 'Médico', valor: medico?.nome },
            { icone: MapPin, rotulo: 'Unidade', valor: unidade?.nome },
            { icone: CalendarDays, rotulo: 'Data', valor: data && formatarData(data) },
            { icone: Clock, rotulo: 'Horário', valor: horario },
          ]}
          completo={etapaAtual === 5}
          enviando={enviando}
          erro={erro}
          onConfirmar={confirmar}
          textoBotao="Confirmar agendamento"
          observacao="Você pode cancelar até 24h antes, sem custo."
        />
      </div>
    </div>
  );
}
