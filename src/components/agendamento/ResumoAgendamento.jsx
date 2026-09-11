import { ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import IconTile from '../ui/IconTile';

export default function ResumoAgendamento({ linhas, completo, enviando, erro, onConfirmar, textoBotao, observacao }) {
  return (
    <aside className="glass-strong rounded-3xl p-5 lg:sticky lg:top-6" aria-labelledby="resumo-titulo">
      <h2 id="resumo-titulo" className="font-semibold">Resumo do agendamento</h2>
      <dl className="mt-4 space-y-3">
        {linhas.map((linha) => (
          <div key={linha.rotulo} className="flex items-start gap-3">
            <IconTile icone={linha.icone} tamanho="sm" />
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wider text-salvia-600">{linha.rotulo}</dt>
              <dd className={linha.valor ? 'font-medium' : 'text-salvia-600'}>{linha.valor ?? '—'}</dd>
            </div>
          </div>
        ))}
      </dl>
      {erro && (
        <p role="alert" className="mt-4 rounded-2xl bg-alerta-50 px-4 py-3 text-sm text-alerta-600">
          {erro}
        </p>
      )}
      <Button className="mt-5" bloco tamanho="lg" disabled={!completo} carregando={enviando} onClick={onConfirmar} iconeFim={ArrowRight}>
        {textoBotao}
      </Button>
      {observacao && <p className="mt-3 text-center text-xs text-salvia-600">{observacao}</p>}
    </aside>
  );
}
