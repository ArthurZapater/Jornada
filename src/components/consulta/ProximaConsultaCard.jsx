import { ChevronRight, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import DataBloco from './DataBloco';
import { formatarHora } from '../../utils/format';

export default function ProximaConsultaCard({ consulta, to = '/consultas' }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-3xl bg-white/70 p-3.5 ring-1 ring-white transition hover:bg-white/90 sm:p-4"
    >
      <DataBloco data={consulta.dataHora} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{consulta.especialidade.nome}</span>
        <span className="block truncate text-sm text-salvia-600">{consulta.medico.nome}</span>
        <span className="mt-1.5 flex items-center gap-1.5 text-sm">
          <Clock size={14} className="text-salvia-600" aria-hidden="true" />
          {formatarHora(consulta.dataHora)}
        </span>
        <span className="flex items-center gap-1.5 truncate text-sm">
          <MapPin size={14} className="shrink-0 text-salvia-600" aria-hidden="true" />
          {consulta.unidade.nome}
        </span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-salvia-600" aria-hidden="true" />
    </Link>
  );
}
