import { useNavigate, useSearchParams } from 'react-router-dom';
import { ETAPAS } from '../components/perfil/etapasPerfil';
import QuestionarioPerfil from '../components/perfil/QuestionarioPerfil';
import { ConteudoAssincrono } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { obterPerfilSaude, salvarPerfilSaude } from '../services/perfilSaudeService';

/** Edição do perfil de saúde, com o mesmo questionário do primeiro acesso. */
export default function PerfilSaude() {
  const { usuario, sincronizarUsuario } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dados = useAsync(obterPerfilSaude, []);
  const etapaInicial = Math.max(0, ETAPAS.findIndex((e) => e.id === params.get('etapa')));

  async function salvar(form) {
    await salvarPerfilSaude(form, { status: 'CONCLUIDO' });
    sincronizarUsuario();
    navigate('/perfil', { state: { perfilSalvo: true } });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Perfil de saúde" subtitulo="Quanto mais o app souber, mais o cuidado é seu." voltarPara="/perfil" />
      <ConteudoAssincrono estado={dados}>
        {(inicial) => (
          <QuestionarioPerfil
            inicial={inicial}
            nome={usuario.nome}
            etapaInicial={etapaInicial}
            rotuloFinal="Salvar perfil"
            aoConcluir={salvar}
            salvarEmQualquerEtapa
          />
        )}
      </ConteudoAssincrono>
    </div>
  );
}
