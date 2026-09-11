import { Ban, CalendarClock, Check, CircleCheck, Clock, Hourglass } from 'lucide-react';

const STATUS = {
  DISPONIVEL: { rotulo: 'Disponível', classe: 'bg-salvia-100 text-petroleo-800', icone: CircleCheck },
  AGUARDANDO: { rotulo: 'Aguardando', classe: 'bg-ambar-50 text-ambar-700', icone: Hourglass },
  ATIVO: { rotulo: 'Ativo', classe: 'bg-salvia-100 text-petroleo-800', icone: CircleCheck },
  EM_PROCESSO: { rotulo: 'Em processo', classe: 'bg-nevoa-100 text-petroleo-700', icone: Clock },
  CONCLUIDO: { rotulo: 'Concluído', classe: 'bg-slate-100 text-slate-600', icone: Check },
  AGENDADA: { rotulo: 'Agendada', classe: 'bg-nevoa-100 text-petroleo-700', icone: CalendarClock },
  CONFIRMADA: { rotulo: 'Confirmada', classe: 'bg-salvia-100 text-petroleo-800', icone: CircleCheck },
  CONCLUIDA: { rotulo: 'Concluída', classe: 'bg-slate-100 text-slate-600', icone: Check },
  CANCELADA: { rotulo: 'Cancelada', classe: 'bg-alerta-50 text-alerta-600', icone: Ban },
};

export default function StatusBadge({ status, rotulo }) {
  const s = STATUS[status] ?? { rotulo: status, classe: 'bg-slate-100 text-slate-600', icone: Check };
  const Icone = s.icone;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.classe}`}>
      <Icone size={13} strokeWidth={2.4} aria-hidden="true" />
      {rotulo ?? s.rotulo}
    </span>
  );
}
