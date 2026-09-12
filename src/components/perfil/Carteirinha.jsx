import { LogoMark } from '../brand/Logo';
import LeafArt from '../ui/LeafArt';
import CodigoBarras from './CodigoBarras';
import { formatarData } from '../../utils/format';
import { PLANO } from '../../utils/plano';

// As duas faces usam unidades de container (cqw), então o mesmo componente serve
// para a prévia no perfil e para a tela cheia — muda só a largura do container.
// Proporção 1.586 é a do cartão físico (ID-1, 85,6 x 54 mm).
const FACE = 'absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[5cqw] p-[6cqw] text-white shadow-[0_24px_40px_-24px_rgb(14_42_37/0.9)]';
const FRENTE = `${FACE} bg-linear-to-br from-petroleo-600 via-petroleo-800 to-petroleo-950`;
const VERSO = `${FACE} bg-linear-to-br from-petroleo-800 via-petroleo-900 to-petroleo-950`;

const ROTULO = 'text-[2.6cqw] uppercase tracking-wider text-white/70';
const VALOR = 'text-[3.3cqw] font-medium';

function Campo({ rotulo, valor, alinhamento = '' }) {
  return (
    <div className={alinhamento}>
      <p className={ROTULO}>{rotulo}</p>
      <p className={VALOR}>{valor}</p>
    </div>
  );
}

export function CarteirinhaFrente({ perfil }) {
  return (
    <div className={FRENTE}>
      <LeafArt tom="escuro" className="-right-[10%] -top-[22%] h-[130%] w-[75%]" />
      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-[2cqw] text-[4.6cqw] font-semibold">
          <LogoMark variante="claro" className="h-[7cqw] w-[7cqw]" /> Jornada
        </span>
        <span className="text-[2.8cqw] font-semibold uppercase tracking-[0.2em] text-white/80">{perfil.plano}</span>
      </div>

      <p className="relative font-mono text-[6.6cqw] tracking-[0.14em]">{perfil.carteirinha}</p>

      <div className="relative flex items-end justify-between gap-[4cqw]">
        <Campo rotulo="Beneficiário" valor={perfil.nome} />
        <Campo rotulo="Nascimento" valor={formatarData(perfil.dataNascimento)} />
        <Campo rotulo="Titularidade" valor={perfil.titularidade} alinhamento="text-right" />
      </div>
    </div>
  );
}

export function CarteirinhaVerso({ perfil }) {
  return (
    <div className={VERSO}>
      <div className="flex items-start justify-between gap-[4cqw]">
        <Campo rotulo="Plano" valor={perfil.plano} />
        <Campo rotulo="Registro ANS" valor={PLANO.registroAns} alinhamento="text-right" />
      </div>

      <div className="grid grid-cols-3 gap-[3cqw]">
        <Campo rotulo="Acomodação" valor={PLANO.acomodacao} />
        <Campo rotulo="Abrangência" valor={PLANO.abrangencia} />
        <Campo rotulo="Cartão SUS" valor={perfil.cartaoSus ?? 'Não informado'} />
      </div>

      <Campo rotulo="Segmentação assistencial" valor={PLANO.segmentacao} />

      <CodigoBarras valor={perfil.carteirinha} className="h-[11cqw] w-full rounded-[1.5cqw] px-[2cqw] py-[1.2cqw]" />

      <p className="text-[2.4cqw] leading-relaxed text-white/65">
        Urgência {PLANO.urgencia} · Central {PLANO.central}. Uso pessoal e intransferível — apresente
        com documento com foto. Cartão de demonstração acadêmica, com dados fictícios.
      </p>
    </div>
  );
}
