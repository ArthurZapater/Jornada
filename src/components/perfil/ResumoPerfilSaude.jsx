import { ArrowRight, Contact, Droplet, HeartPulse, Pill, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Carregando } from '../ui/Feedback';
import IconTile from '../ui/IconTile';
import { useAsync } from '../../hooks/useAsync';
import { obterPerfilSaude } from '../../services/perfilSaudeService';
import { calcularImc, rotuloDe, rotulosDe } from '../../utils/perfilSaude';

/** Cartão do perfil: quanto está completo e o que mais importa numa emergência. */
export default function ResumoPerfilSaude() {
  const estado = useAsync(obterPerfilSaude, []);
  if (estado.carregando && !estado.dados) return <Carregando texto="Carregando perfil de saúde..." />;
  if (!estado.dados) return null;

  const { perfil, completude } = estado.dados;
  const alergias = perfil.alergias.includes('NENHUMA')
    ? 'Nenhuma'
    : rotulosDe('alergias', perfil.alergias).join(', ') || null;
  const imc = calcularImc(perfil.alturaCm, perfil.pesoKg);
  const destaques = [
    { icone: Droplet, rotulo: 'Tipo sanguíneo', valor: rotuloDe('tipoSanguineo', perfil.tipoSanguineo) },
    { icone: Pill, rotulo: 'Alergias', valor: alergias },
    { icone: Scale, rotulo: 'IMC', valor: imc && imc.valor.toLocaleString('pt-BR') },
    { icone: Contact, rotulo: 'Emergência', valor: perfil.contatoNome ? `${perfil.contatoNome}${perfil.contatoTelefone ? ` · ${perfil.contatoTelefone}` : ''}` : null },
  ];

  return (
    <section aria-labelledby="perfil-saude" className="glass-strong rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <IconTile icone={HeartPulse} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <h2 id="perfil-saude" className="font-semibold">Perfil de saúde</h2>
          <p className="text-sm text-salvia-600">{completude === 100 ? 'Completo. Obrigado!' : `${completude}% completo`}</p>
        </div>
        <Link
          to="/perfil/saude"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-salvia-100 px-3 py-1.5 text-sm font-semibold text-acento transition hover:bg-salvia-200"
        >
          {completude === 0 ? 'Preencher' : 'Editar'} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-salvia-100"
        role="progressbar"
        aria-valuenow={completude}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Perfil de saúde preenchido"
      >
        <div className="h-full rounded-full bg-petroleo-800 transition-[width]" style={{ width: `${completude}%` }} />
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {destaques.map(({ icone: Icone, rotulo, valor }) => (
          <div key={rotulo} className="flex items-center gap-3 rounded-2xl bg-superficie/60 px-3 py-2.5 ring-1 ring-borda">
            <Icone size={17} className="shrink-0 text-salvia-600" aria-hidden="true" />
            <dt className="shrink-0 text-sm text-salvia-600">{rotulo}</dt>
            <dd className={`min-w-0 flex-1 truncate text-right text-sm font-medium ${valor ? '' : 'text-salvia-600'}`}>{valor ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
