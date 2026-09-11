import { House, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Vazio } from '../components/ui/Feedback';

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-lg pt-10">
      <Vazio
        icone={SearchX}
        titulo="Página não encontrada"
        descricao="O endereço pode ter mudado ou não existe mais."
        acao={<Button as={Link} to="/" icone={House}>Voltar ao início</Button>}
      />
    </div>
  );
}
