import { ShieldCheck } from 'lucide-react';

export default function SecurityNote({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-white/50 px-4 py-3 ring-1 ring-white/70 ${className}`}>
      <ShieldCheck size={22} className="shrink-0 text-petroleo-700" aria-hidden="true" />
      <p className="text-sm leading-snug">
        <span className="block font-medium">Seus dados estão protegidos</span>
        <span className="text-salvia-600">Segurança e privacidade em primeiro lugar, conforme a LGPD.</span>
      </p>
    </div>
  );
}
