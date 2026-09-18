import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, Clock, FlaskConical, MapPin } from 'lucide-react';
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
  agendarExame,
  listarDiasDisponiveis,
  listarHorarios,
  listarTiposExame,
  listarUnidades,
  obterTipoExame,
} from '../services/agendamentoService';
import { formatarData, formatarDataLonga, formatarDistancia, formatarHora } from '../utils/format';

export default function AgendarExame() {
  const [params] = useSearchParams();
  const { carregar: atualizarNotificacoes } = useNotificacoes();
  const calendario = useMesNavegavel();

  const [tipo, setTipo] = useState(null);
  const [unidade, setUnidade] = useState(null);
  const [data, setData] = useState(null);
  const [horario, setHorario] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmado, setConfirmado] = useState(null);

  const tipos = useAsync(listarTiposExame, []);
  const unidades = useAsync(() => (tipo ? listarUnidades({ tipoExameId: tipo.id }) : []), [tipo?.id]);
  const dias = useAsync(
    () =>
      tipo && unidade
        ? listarDiasDisponiveis({ tipo: 'exame', recursoId: tipo.id, unidadeId: unidade.id, ano: calendario.ano, mes: calendario.mes })
        : [],
    [tipo?.id, unidade?.id, calendario.ano, calendario.mes],
  );
  const horarios = useAsync(
    () => (data ? listarHorarios({ tipo: 'exame', recursoId: tipo.id, unidadeId: unidade.id, data }) : []),
    [tipo?.id, unidade?.id, data],
  );

  useEffect(() => {
    let ativo = true;
    const tipoId = params.get('tipo');
    if (tipoId) obterTipoExame(tipoId).then((t) => ativo && setTipo(t)).catch(() => {});
    return () => {
      ativo = false;
    };
  }, [params]);

  function escolherTipo(t) {
    setTipo(t);
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

  const etapaAtual = !tipo ? 0 : !unidade ? 1 : !data ? 2 : !horario ? 3 : 4;
  const estado = (i) => (i < etapaAtual ? 'concluida' : i === etapaAtual ? 'ativa' : 'pendente');

  async function confirmar() {
    setEnviando(true);
    setErro('');
    try {
      const exame = await agendarExame({ tipoExameId: tipo.id, unidadeId: unidade.id, data, horario });
      setConfirmado(exame);
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

  if (confirmado) {
    return (
      <SucessoAgendamento
        titulo="Exame agendado!"
        descricao={`Preparo: ${confirmado.tipoExame.preparo}`}
        detalhes={[
          { rotulo: 'Exame', valor: confirmado.tipoExame.nome },
          { rotulo: 'Data', valor: formatarData(confirmado.dataAgendada) },
          { rotulo: 'Horário', valor: formatarHora(confirmado.dataAgendada) },
          { rotulo: 'Local', valor: confirmado.unidade.nome },
        ]}
      >
        <Button as={Link} to="/exames" bloco tamanho="lg">Ver meus exames</Button>
        <Button as={Link} to="/" variante="secundario" bloco>Voltar ao início</Button>
      </SucessoAgendamento>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Agendar exame" subtitulo="Escolha o exame, o local, a data e o horário." voltarPara="/exames" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="space-y-3">
          <Etapa numero={1} titulo="Tipo de exame" estado={estado(0)} resumo={tipo?.nome} onAlterar={() => escolherTipo(null)}>
            <ConteudoAssincrono estado={tipos} vazio="Nenhum exame disponível.">
              {(lista) => (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {lista.map((t) => (
                    <OpcaoCard key={t.id} icone={FlaskConical} tom="lilas" titulo={t.nome} descricao={t.categoria} onClick={() => escolherTipo(t)} />
                  ))}
                </div>
              )}
            </ConteudoAssincrono>
          </Etapa>

          <Etapa numero={2} titulo="Unidade" estado={estado(1)} resumo={unidade?.nome} onAlterar={() => escolherUnidade(null)}>
            <ConteudoAssincrono estado={unidades} vazio="Nenhuma unidade realiza este exame.">
              {(lista) => (
                <div className="grid gap-2">
                  {lista.map((u) => (
                    <OpcaoCard key={u.id} icone={MapPin} titulo={u.nome} descricao={u.endereco} extra={formatarDistancia(u.distanciaKm)} onClick={() => escolherUnidade(u)} />
                  ))}
                </div>
              )}
            </ConteudoAssincrono>
          </Etapa>

          <Etapa numero={3} titulo="Data" estado={estado(2)} resumo={data && formatarDataLonga(data)} onAlterar={() => escolherData(null)}>
            <Calendario {...calendario.props} diasDisponiveis={dias.dados ?? []} carregando={dias.carregando} selecionado={data} onSelecionar={escolherData} />
            {!dias.carregando && dias.dados?.length === 0 && (
              <p className="mt-3 text-sm text-salvia-600">Sem datas livres neste mês. Veja o próximo.</p>
            )}
          </Etapa>

          <Etapa numero={4} titulo="Horário" estado={estado(3)} resumo={horario} onAlterar={() => setHorario(null)}>
            <ConteudoAssincrono estado={horarios} vazio="Nenhum horário livre nesta data. Escolha outro dia.">
              {(lista) => <HorarioChips horarios={lista} selecionado={horario} onSelecionar={setHorario} />}
            </ConteudoAssincrono>
          </Etapa>
        </div>

        <ResumoAgendamento
          linhas={[
            { icone: FlaskConical, rotulo: 'Exame', valor: tipo?.nome },
            { icone: ClipboardList, rotulo: 'Preparo', valor: tipo?.preparo },
            { icone: MapPin, rotulo: 'Unidade', valor: unidade?.nome },
            { icone: CalendarDays, rotulo: 'Data', valor: data && formatarData(data) },
            { icone: Clock, rotulo: 'Horário', valor: horario },
          ]}
          completo={etapaAtual === 4}
          enviando={enviando}
          erro={erro}
          onConfirmar={confirmar}
          textoBotao="Confirmar agendamento"
          observacao="Leve documento com foto e a carteirinha do plano."
        />
      </div>
    </div>
  );
}
