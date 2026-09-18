import { FileCheck, FlaskConical, Forward, LockKeyhole, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import IconTile from '../ui/IconTile';
import { formatarData, formatarHora } from '../../utils/format';

// Telas do compartilhamento de resultados (regra em compartilhamentoService.js).

const ICONES = { CONSULTA: Stethoscope, EXAME: FlaskConical, ENCAMINHAMENTO: Forward };

function quandoDe(destino) {
  if (destino.quando) return `${formatarData(destino.quando)} às ${formatarHora(destino.quando)}`;
  if (destino.validade) return `Encaminhamento válido até ${formatarData(destino.validade)}`;
  return null;
}

/** Lista de quem tem acesso: médico da próxima consulta, equipe do próximo exame, especialista. */
export function ListaDeDestinos({ destinos }) {
  return (
    <ul className="space-y-2">
      {destinos.map((d) => (
        <li key={d.chave}>
          <Link to={d.link} className="flex items-center gap-3 rounded-2xl bg-superficie/60 p-3 ring-1 ring-borda transition hover:bg-superficie/90">
            <IconTile icone={ICONES[d.tipo]} tamanho="sm" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold">{d.profissional}</span>
              <span className="block text-salvia-600">{d.detalhe}</span>
              {quandoDe(d) && <span className="block text-salvia-600">{quandoDe(d)}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Na tela do laudo: com quem este resultado está (ou vai estar, assim que sair). */
export function QuemVeEsteResultado({ acesso }) {
  if (!acesso) return null;
  const { ativo, incluido, pendente, destinos, janelaDias } = acesso;

  let texto;
  if (!ativo) texto = 'O compartilhamento está desligado: só você vê seus resultados. Dá para ligar de novo em Configurações.';
  else if (!incluido && !pendente) texto = `Resultados com mais de ${Math.round(janelaDias / 30)} meses não são compartilhados automaticamente.`;
  else if (!destinos.length) texto = 'Quando você marcar consulta ou exame, ou tiver um encaminhamento, quem for te atender verá este resultado.';
  else if (pendente) texto = 'Assim que o resultado sair, ele fica disponível automaticamente para:';
  else texto = 'Liberado automaticamente para quem vai te atender a seguir. O acesso acaba quando o atendimento passa.';

  return (
    <section className="glass-strong rounded-3xl p-5" aria-labelledby="quem-ve">
      <div className="flex items-center gap-3">
        <IconTile icone={FileCheck} tamanho="sm" />
        <div className="min-w-0">
          <h3 id="quem-ve" className="font-semibold">{pendente ? 'Quem vai receber este resultado' : 'Quem já pode ver este resultado'}</h3>
          <p className="text-sm text-salvia-600">{texto}</p>
        </div>
      </div>
      {ativo && destinos.length > 0 && (
        <div className="mt-4">
          <ListaDeDestinos destinos={destinos} />
        </div>
      )}
      <p className="mt-3 flex items-start gap-2 text-xs text-salvia-600">
        <LockKeyhole size={14} className="mt-px shrink-0" aria-hidden="true" />
        <span>
          Resultado de exame é dado sensível (LGPD, art. 11). Você controla isso em{' '}
          <Link to="/configuracoes" className="font-semibold text-acento underline underline-offset-2">Configurações</Link>.
        </span>
      </p>
    </section>
  );
}

/**
 * Linha curta nos cartões de consulta, exame e encaminhamento: "este profissional já
 * vê seus N resultados". Não aparece se o cartão não for o próximo atendimento.
 */
export function NotaResultados({ compartilhamento, tipo, referenciaId, className = '' }) {
  const destino = compartilhamento?.destinos.find((d) => d.tipo === tipo && d.referenciaId === referenciaId);
  if (!destino) return null;
  const total = compartilhamento.resultados.length;
  const nomes = compartilhamento.resultados.map((r) => r.nome).join(', ');
  return (
    <p className={`flex items-start gap-2 rounded-2xl bg-salvia-100/80 px-3 py-2 text-sm ${className}`}>
      <FileCheck size={16} className="mt-0.5 shrink-0 text-acento" aria-hidden="true" />
      <span>
        <strong className="font-semibold">{destino.profissional}</strong> já tem acesso{' '}
        {total === 1 ? 'ao seu resultado recente' : `aos seus ${total} resultados recentes`}
        <span className="text-salvia-600"> ({nomes})</span>.{' '}
        <Link to="/resultados" className="font-semibold text-acento underline underline-offset-2">Ver resultados</Link>
      </span>
    </p>
  );
}
