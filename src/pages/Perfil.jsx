import { useState } from 'react';
import { Bell, CalendarDays, Check, HeartPulse, IdCard, Info, LogOut, Mail, Maximize2, Phone, Settings, Smile, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Carregando, MensagemErro } from '../components/ui/Feedback';
import PageHeader from '../components/ui/PageHeader';
import { CarteirinhaFrente } from '../components/perfil/Carteirinha';
import BotaoWallet from '../components/perfil/BotaoWallet';
import CarteirinhaTelaCheia from '../components/perfil/CarteirinhaTelaCheia';
import FotoPerfil from '../components/perfil/FotoPerfil';
import ResumoPerfilSaude from '../components/perfil/ResumoPerfilSaude';
import TopicList from '../components/ui/TopicList';
import { AO_TOCAR } from '../components/ui/animacoes';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { obterPerfil } from '../services/beneficiarioService';
import { formatarData, idade, mascararCpf } from '../utils/format';
import { ROTULOS_SEGMENTO } from '../utils/segmento';

export default function Perfil() {
  const perfil = useAsync(obterPerfil, []);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Meu perfil" subtitulo="Seus dados, seu plano e sua carteirinha." />
      {perfil.carregando && !perfil.dados ? (
        <Carregando />
      ) : perfil.erro ? (
        <MensagemErro mensagem={perfil.erro.message} onTentarNovamente={perfil.recarregar} />
      ) : (
        <Conteudo perfil={perfil.dados} />
      )}
    </div>
  );
}

function Conteudo({ perfil }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [carteirinhaAberta, setCarteirinhaAberta] = useState(false);

  function sair() {
    logout();
    navigate('/login', { replace: true });
  }

  const estatisticas = [
    { rotulo: 'Consultas', valor: perfil.estatisticas.consultas },
    { rotulo: 'Exames', valor: perfil.estatisticas.exames },
    { rotulo: 'Encaminhamentos', valor: perfil.estatisticas.encaminhamentos },
  ];

  const dados = [
    { icone: UserRound, rotulo: 'Nome', valor: perfil.nome },
    { icone: Smile, rotulo: 'Chamar de', valor: perfil.nomePreferido || 'Não informado' },
    { icone: IdCard, rotulo: 'CPF', valor: mascararCpf(perfil.cpf) },
    { icone: CalendarDays, rotulo: 'Nascimento', valor: `${formatarData(perfil.dataNascimento)} (${idade(perfil.dataNascimento)} anos)` },
    { icone: Mail, rotulo: 'E-mail', valor: perfil.email },
    { icone: Phone, rotulo: 'Celular', valor: perfil.telefone ?? 'Não informado' },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:items-start">
      <div className="grid content-start gap-4 md:grid-cols-2 xl:grid-cols-1">
        <section className="glass-strong flex flex-col items-center rounded-[1.75rem] p-6 text-center">
          <FotoPerfil nome={perfil.nome} fotoInicial={perfil.fotoUrl}>
            <h2 className="mt-3 text-xl font-semibold">{perfil.nome}</h2>
            <p className="text-sm text-salvia-600">
              {perfil.titularidade} · {perfil.plano}
            </p>
            <p className="mt-3 rounded-full bg-salvia-100 px-3 py-1 text-xs font-semibold text-acento">
              Perfil de cuidado: {ROTULOS_SEGMENTO[perfil.segmento]}
            </p>
          </FotoPerfil>
          <dl className="mt-5 grid w-full grid-cols-3 gap-2">
            {estatisticas.map(({ rotulo, valor }) => (
              <div key={rotulo} className="rounded-2xl bg-superficie/70 px-2 py-3 ring-1 ring-borda">
                <dd className="text-2xl font-semibold text-acento">{valor}</dd>
                <dt className="text-[0.6875rem] font-medium text-salvia-600">{rotulo}</dt>
              </div>
            ))}
          </dl>
        </section>

        <div>
          <motion.button
            type="button"
            whileTap={AO_TOCAR}
            onClick={() => setCarteirinhaAberta(true)}
            aria-label="Ampliar carteirinha virtual"
            className="@container relative aspect-[1.586] w-full rounded-[5cqw] text-left"
          >
            <CarteirinhaFrente perfil={perfil} />
          </motion.button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-salvia-600">
            <Maximize2 size={14} aria-hidden="true" /> Toque para ampliar e mostrar no atendimento
          </p>
          <BotaoWallet perfil={perfil} className="mt-3 w-full" />
        </div>
      </div>

      <div className="space-y-6">
        {state?.perfilSalvo && (
          <p role="status" className="flex items-center gap-2 rounded-2xl bg-salvia-100 px-4 py-3 text-sm font-medium text-acento">
            <Check size={18} aria-hidden="true" /> Perfil de saúde salvo. O app já está usando as respostas novas.
          </p>
        )}

        <ResumoPerfilSaude />

        <section aria-labelledby="dados-pessoais">
          <h2 id="dados-pessoais" className="mb-3 px-1 font-semibold">Dados pessoais</h2>
          <dl className="glass-strong divide-y divide-salvia-100 overflow-hidden rounded-3xl">
            {dados.map(({ icone: Icone, rotulo, valor }) => (
              <div key={rotulo} className="flex items-center gap-4 px-4 py-3.5">
                <Icone size={18} className="shrink-0 text-salvia-600" aria-hidden="true" />
                <dt className="w-28 shrink-0 text-sm text-salvia-600">{rotulo}</dt>
                <dd className="min-w-0 truncate font-medium">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 px-1 text-xs text-salvia-600">Por segurança (LGPD), exibimos apenas parte do seu CPF.</p>
        </section>

        <section aria-labelledby="configuracoes">
          <h2 id="configuracoes" className="mb-3 px-1 font-semibold">Conta</h2>
          <TopicList
            itens={[
              { icone: HeartPulse, titulo: 'Perfil de saúde', descricao: 'Condições, alergias, hábitos e contato de emergência.', to: '/perfil/saude' },
              { icone: Bell, titulo: 'Notificações', descricao: 'Consultas, resultados e lembretes.', to: '/notificacoes' },
              { icone: Settings, titulo: 'Configurações', descricao: 'Tema, texto, voz, avisos, privacidade e segurança.', to: '/configuracoes' },
              { icone: Info, titulo: 'Sobre a Jornada', descricao: 'Versão, equipe, licenças e fontes de dados.', to: '/sobre' },
            ]}
          />
        </section>

        <Button variante="perigo" icone={LogOut} onClick={sair} bloco>
          Sair da conta
        </Button>
      </div>

      <CarteirinhaTelaCheia perfil={perfil} aberta={carteirinhaAberta} aoFechar={() => setCarteirinhaAberta(false)} />
    </div>
  );
}
