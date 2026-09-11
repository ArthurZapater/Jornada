import { CircleAlert, LoaderCircle } from 'lucide-react';
import Button from './Button';

export function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-salvia-600" role="status">
      <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
      {texto}
    </div>
  );
}

export function MensagemErro({ mensagem = 'Não foi possível carregar os dados.', onTentarNovamente }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-alerta-50 px-4 py-6 text-center" role="alert">
      <CircleAlert size={24} className="text-alerta-600" aria-hidden="true" />
      <p className="text-sm text-alerta-600">{mensagem}</p>
      {onTentarNovamente && (
        <Button variante="secundario" tamanho="sm" onClick={onTentarNovamente}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function Vazio({ icone: Icone, titulo, descricao, acao }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-superficie/45 px-6 py-10 text-center ring-1 ring-borda/70">
      {Icone && <Icone size={28} className="text-salvia-600" aria-hidden="true" />}
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-salvia-600">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}

/** Renderiza carregando / erro / vazio / conteúdo a partir do estado do useAsync. */
export function ConteudoAssincrono({ estado, vazio, children }) {
  if (estado.carregando && !estado.dados) return <Carregando />;
  if (estado.erro) return <MensagemErro mensagem={estado.erro.message} onTentarNovamente={estado.recarregar} />;
  if (Array.isArray(estado.dados) && estado.dados.length === 0) {
    return typeof vazio === 'string' ? <p className="py-4 text-sm text-salvia-600">{vazio}</p> : vazio;
  }
  return estado.dados ? children(estado.dados) : null;
}
