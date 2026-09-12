import { useState } from 'react';
import { ArrowRight, Check, Clock, ShieldCheck, Sparkles, Undo2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/brand/Logo';
import QuestionarioPerfil from '../components/perfil/QuestionarioPerfil';
import Button from '../components/ui/Button';
import { Carregando, MensagemErro } from '../components/ui/Feedback';
import IconTile from '../components/ui/IconTile';
import LeafArt from '../components/ui/LeafArt';
import { MOLA } from '../components/ui/animacoes';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { adiarQuestionario, obterPerfilSaude, salvarPerfilSaude } from '../services/perfilSaudeService';
import { primeiroNome } from '../utils/format';
import { comoChamar, rotulosDe } from '../utils/perfilSaude';
import { ROTULOS_SEGMENTO } from '../utils/segmento';

/**
 * Questionário do primeiro acesso. O guarda de rota manda para cá enquanto o
 * status for PENDENTE — depois de concluir ou adiar, o app não pergunta de novo.
 */
export default function CompletarPerfil() {
  const { usuario, sincronizarUsuario } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dados = useAsync(obterPerfilSaude, []);
  const [fase, setFase] = useState('convite');
  const [resultado, setResultado] = useState(null);
  const [adiando, setAdiando] = useState(false);
  const destino = location.state?.de?.pathname ?? '/';

  // Já respondido: a edição mora no perfil.
  if (usuario.questionario === 'CONCLUIDO' && fase !== 'pronto') return <Navigate to="/perfil/saude" replace />;

  function seguir() {
    sincronizarUsuario();
    navigate(destino, { replace: true });
  }

  async function adiarSemResponder() {
    setAdiando(true);
    await adiarQuestionario();
    seguir();
  }

  async function adiarComRespostas(form) {
    await salvarPerfilSaude(form, { status: 'ADIADO' });
    seguir();
  }

  async function concluir(form) {
    setResultado(await salvarPerfilSaude(form, { status: 'CONCLUIDO' }));
    setFase('pronto');
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="min-h-dvh px-4 pb-10 pt-5 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <Logo tamanho="sm" />
        </header>

        {dados.carregando && !dados.dados ? (
          <Carregando />
        ) : dados.erro ? (
          <MensagemErro mensagem={dados.erro.message} onTentarNovamente={dados.recarregar} />
        ) : fase === 'convite' ? (
          <Convite nome={primeiroNome(usuario.nome)} aoComecar={() => setFase('perguntas')} aoAdiar={adiarSemResponder} adiando={adiando} />
        ) : fase === 'perguntas' ? (
          <QuestionarioPerfil inicial={dados.dados} nome={usuario.nome} aoConcluir={concluir} aoAdiar={adiarComRespostas} />
        ) : (
          <Pronto resultado={resultado} aoContinuar={seguir} />
        )}
      </div>
    </div>
  );
}

function Convite({ nome, aoComecar, aoAdiar, adiando }) {
  const garantias = [
    { icone: Clock, texto: '5 etapas curtas, uns 3 minutos' },
    { icone: Undo2, texto: 'Tudo opcional — dá para parar e continuar no perfil' },
    { icone: ShieldCheck, texto: 'Dados de saúde protegidos pela LGPD; você apaga quando quiser' },
  ];
  return (
    <section className="glass-strong relative overflow-hidden rounded-[2rem] px-6 py-9 text-center sm:px-10" aria-labelledby="convite-titulo">
      <LeafArt className="-right-16 -top-10 h-56 w-96" />
      <IconTile icone={Sparkles} tom="solido" tamanho="lg" className="relative mx-auto" />
      <h1 id="convite-titulo" className="relative mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
        Oi, {nome}! Vamos deixar a Jornada com a sua cara?
      </h1>
      <p className="relative mx-auto mt-3 max-w-md text-salvia-600">
        Com algumas respostas, o app ajusta seus lembretes, o plano de cuidado e o que o assistente sabe sobre você.
      </p>
      <ul className="relative mx-auto mt-7 grid max-w-sm gap-3 text-left text-sm">
        {garantias.map(({ icone: Icone, texto }) => (
          <li key={texto} className="flex items-center gap-3">
            <Icone size={18} className="shrink-0 text-acento" aria-hidden="true" />
            {texto}
          </li>
        ))}
      </ul>
      <div className="relative mt-8 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
        <Button variante="fantasma" onClick={aoAdiar} carregando={adiando}>
          Responder depois
        </Button>
        <Button tamanho="lg" iconeFim={ArrowRight} onClick={aoComecar}>
          Começar
        </Button>
      </div>
    </section>
  );
}

function Pronto({ resultado, aoContinuar }) {
  const { perfil } = resultado;
  const mudancas = [
    resultado.nomePreferido && `O app e o assistente vão te chamar de ${resultado.nomePreferido}.`,
    `Seu perfil de cuidado agora é "${ROTULOS_SEGMENTO[resultado.segmento]}" — é ele que escolhe os lembretes do início.`,
    (perfil.tabagismo || perfil.atividadeFisica || perfil.historicoFamiliar.length > 0) &&
      'O plano de cuidado passa a considerar seus hábitos e o histórico da família.',
    (perfil.tipoSanguineo || perfil.alergias.length > 0 || perfil.contatoNome) &&
      'O assistente responde sobre seu tipo sanguíneo, alergias e contato de emergência.',
    perfil.objetivos.length > 0 && `Seus objetivos: ${rotulosDe('objetivos', perfil.objetivos).join(', ').toLowerCase()}.`,
  ].filter(Boolean);

  return (
    <section className="glass-strong rounded-[2rem] px-6 py-9 text-center sm:px-10" aria-labelledby="pronto-titulo">
      <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={MOLA} className="inline-block">
        <IconTile icone={Check} tom="solido" tamanho="lg" />
      </motion.span>
      <h1 id="pronto-titulo" className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
        Prontinho, {comoChamar(resultado)}!
      </h1>
      <p className="mt-2 text-salvia-600">Seu perfil está {resultado.completude}% completo. O que já mudou:</p>
      <ul className="mx-auto mt-6 grid max-w-md gap-3 text-left text-sm">
        {mudancas.map((texto) => (
          <li key={texto} className="flex gap-3 rounded-2xl bg-superficie/60 px-4 py-3 ring-1 ring-borda">
            <Check size={18} className="mt-0.5 shrink-0 text-acento" aria-hidden="true" />
            {texto}
          </li>
        ))}
      </ul>
      <Button tamanho="lg" iconeFim={ArrowRight} onClick={aoContinuar} className="mt-8">
        Ir para o início
      </Button>
    </section>
  );
}
