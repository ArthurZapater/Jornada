import { useState } from 'react';
import { ChevronRight, FileText, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConteudoAssincrono, Vazio } from '../components/ui/Feedback';
import { CampoBusca, FiltroChips } from '../components/ui/Filtros';
import IconTile from '../components/ui/IconTile';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { listarExames } from '../services/exameService';
import { agoraLocalISO, formatarData } from '../utils/format';

const FILTROS = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'DISPONIVEL', rotulo: 'Disponíveis' },
  { valor: 'AGUARDANDO', rotulo: 'Aguardando' },
];

function descricaoData(exame) {
  if (exame.dataRealizacao) return `Realizado em ${formatarData(exame.dataRealizacao)}`;
  if (exame.dataAgendada && exame.dataAgendada >= agoraLocalISO()) return `Agendado para ${formatarData(exame.dataAgendada)}`;
  return `Solicitado em ${formatarData(exame.dataSolicitacao)}`;
}

export default function Resultados() {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('TODOS');
  const exames = useAsync(() => listarExames({ busca, status }), [busca, status]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Resultados de exames" subtitulo="Seus laudos disponíveis e exames em andamento." voltarPara="/exames" />
      <div className="space-y-3">
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar exame..." rotulo="Buscar exame" />
        <FiltroChips opcoes={FILTROS} valor={status} onChange={setStatus} rotulo="Filtrar por status" />
      </div>

      <section aria-labelledby="recentes" className="mt-6">
        <h2 id="recentes" className="mb-3 text-xs font-semibold uppercase tracking-wider text-salvia-600">Recentes</h2>
        <ConteudoAssincrono
          estado={exames}
          vazio={<Vazio icone={SearchX} titulo="Nenhum exame encontrado" descricao="Tente outro termo ou remova o filtro." />}
        >
          {(lista) => (
            <ul className={`space-y-3 transition-opacity ${exames.carregando ? 'opacity-60' : ''}`}>
              {lista.map((exame) => (
                <li key={exame.id}>
                  <Link to={`/resultados/${exame.id}`} className="glass-strong flex items-center gap-4 rounded-3xl p-4 transition hover:bg-superficie/90">
                    <IconTile icone={FileText} tom={exame.status === 'DISPONIVEL' ? 'verde' : 'ambar'} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{exame.tipoExame.nome}</span>
                      <span className="block text-sm text-salvia-600">
                        {descricaoData(exame)} · {exame.unidade.nome}
                      </span>
                    </span>
                    <StatusBadge status={exame.status} />
                    <ChevronRight size={18} className="hidden shrink-0 text-salvia-600 sm:block" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ConteudoAssincrono>
      </section>
    </div>
  );
}
