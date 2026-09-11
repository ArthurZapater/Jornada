import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import IconTile from './IconTile';

/** Lista "ícone + título + descrição + seta" das telas de detalhe de serviço. */
export default function TopicList({ itens, tom = 'verde', className = '' }) {
  return (
    <ul className={`glass-strong divide-y divide-salvia-100 overflow-hidden rounded-3xl ${className}`}>
      {itens.map((item) => {
        const conteudo = (
          <>
            <IconTile icone={item.icone} tom={item.tom ?? tom} tamanho="sm" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium leading-snug">{item.titulo}</span>
              {item.descricao && <span className="mt-0.5 block text-sm text-salvia-600">{item.descricao}</span>}
            </span>
            {(item.to || item.onClick) && <ChevronRight size={18} className="shrink-0 text-salvia-600" aria-hidden="true" />}
          </>
        );
        const classe = 'flex w-full items-center gap-4 px-4 py-4 text-left transition';
        return (
          <li key={item.titulo}>
            {item.to ? (
              <Link to={item.to} className={`${classe} hover:bg-superficie/70`}>
                {conteudo}
              </Link>
            ) : item.onClick ? (
              <button type="button" onClick={item.onClick} className={`${classe} hover:bg-superficie/70`}>
                {conteudo}
              </button>
            ) : (
              <div className={classe}>{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
