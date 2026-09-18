import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import LeafArt from '../ui/LeafArt';

export default function SucessoAgendamento({ titulo, descricao, detalhes, children }) {
  const tituloRef = useRef(null);
  useEffect(() => tituloRef.current?.focus(), []);

  return (
    <div className="mx-auto max-w-lg py-4">
      <section className="glass-strong relative overflow-hidden rounded-[2rem] p-6 text-center sm:p-8">
        <LeafArt className="-right-10 -top-8 h-48 w-72" />
        <div className="relative">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-petroleo-800 text-white shadow-lg">
            <Check size={30} strokeWidth={2.6} aria-hidden="true" />
          </span>
          <h1 ref={tituloRef} tabIndex={-1} className="mt-5 text-2xl font-semibold tracking-tight outline-none">
            {titulo}
          </h1>
          <p className="mt-2 text-salvia-600">{descricao}</p>
          <dl className="mt-6 space-y-3 rounded-3xl bg-superficie/75 p-5 text-left ring-1 ring-borda">
            {detalhes.map(({ rotulo, valor }) => (
              <div key={rotulo} className="flex justify-between gap-4 text-sm">
                <dt className="text-salvia-600">{rotulo}</dt>
                <dd className="text-right font-medium">{valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 grid gap-3">{children}</div>
        </div>
      </section>
    </div>
  );
}
