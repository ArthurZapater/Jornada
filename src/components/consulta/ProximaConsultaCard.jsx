import { ChevronRight, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import DataBloco from './DataBloco';
import { formatarHora } from '../../utils/format';

export default function ProximaConsultaCard({ consulta, to = '/consultas' }) {
  return (
    <Link
      to={to}
      className="flex min-w-0 items-center gap-4 rounded-3xl bg-superficie/70 p-3.5 ring-1 ring-borda transition hover:bg-superficie/90 sm:p-4"
    >
      <DataBloco data={consulta.dataHora} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{consulta.especialidade.nome}</span>
        <span className="block truncate text-sm text-salvia-600">{consulta.medico.nome}</span>
        <span className="mt-1.5 flex items-center gap-1.5 text-sm">
          <Clock size={14} className="text-salvia-600" aria-hidden="true" />
          {formatarHora(consulta.dataHora)}
        </span>
        {/* truncate no texto, e não no flex: nome real de unidade pode ser longo */}
        <span className="flex min-w-0 items-center gap-1.5 text-sm">
          <MapPin size={14} className="shrink-0 text-salvia-600" aria-hidden="true" />
          <span className="truncate">{consulta.unidade.nome}</span>
        </span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-salvia-600" aria-hidden="true" />
    </Link>
  );
}
