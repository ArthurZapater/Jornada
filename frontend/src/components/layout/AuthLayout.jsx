import { CalendarDays, FileText, MapPin } from 'lucide-react';
import Logo from '../brand/Logo';
import IconTile from '../ui/IconTile';
import LeafArt from '../ui/LeafArt';
import SecurityNote from '../ui/SecurityNote';

const DESTAQUES = [
  { icone: CalendarDays, texto: 'Agende consultas e exames em poucos toques' },
  { icone: FileText, texto: 'Resultados e laudos sempre à mão' },
  { icone: MapPin, texto: 'Rede credenciada perto de você' },
];

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="hidden p-5 lg:block">
        <div className="glass relative flex h-full flex-col justify-between overflow-hidden rounded-[2.25rem] p-12">
          <LeafArt className="-right-24 top-16 h-[30rem] w-[44rem]" />
          <Logo tamanho="lg" className="relative" />
          <div className="relative max-w-md">
            <p className="text-5xl font-semibold leading-[1.1] tracking-tight">Sua saúde em todas as fases da vida.</p>
            <p className="mt-4 text-lg text-salvia-600">Mais cuidado, mais bem-estar, mais você.</p>
            <ul className="mt-8 space-y-3">
              {DESTAQUES.map(({ icone, texto }) => (
                <li key={texto} className="flex items-center gap-3">
                  <IconTile icone={icone} tom="vidro" tamanho="sm" />
                  <span className="font-medium">{texto}</span>
                </li>
              ))}
            </ul>
          </div>
          <SecurityNote className="relative max-w-md" />
        </div>
      </aside>
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
