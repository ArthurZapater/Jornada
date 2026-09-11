import { useState } from 'react';
import { Bell, CalendarDays, IdCard, LogOut, Mail, Phone, RotateCcw, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/brand/Logo';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { Carregando, MensagemErro } from '../components/ui/Feedback';
import LeafArt from '../components/ui/LeafArt';
import PageHeader from '../components/ui/PageHeader';
import TopicList from '../components/ui/TopicList';
import { useAuth } from '../contexts/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { obterPerfil } from '../services/beneficiarioService';
import { restaurarDadosDemo } from '../services/mockDb';
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
  const [restaurando, setRestaurando] = useState(false);

  function sair() {
    logout();
    navigate('/login', { replace: true });
  }

  async function restaurar() {
    setRestaurando(true);
    await restaurarDadosDemo();
    sair();
  }

  const estatisticas = [
    { rotulo: 'Consultas', valor: perfil.estatisticas.consultas },
    { rotulo: 'Exames', valor: perfil.estatisticas.exames },
    { rotulo: 'Encaminhamentos', valor: perfil.estatisticas.encaminhamentos },
  ];

  const dados = [
    { icone: UserRound, rotulo: 'Nome', valor: perfil.nome },
    { icone: IdCard, rotulo: 'CPF', valor: mascararCpf(perfil.cpf) },
    { icone: CalendarDays, rotulo: 'Nascimento', valor: `${formatarData(perfil.dataNascimento)} (${idade(perfil.dataNascimento)} anos)` },
    { icone: Mail, rotulo: 'E-mail', valor: perfil.email },
    { icone: Phone, rotulo: 'Celular', valor: perfil.telefone ?? 'Não informado' },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:items-start">
      <div className="grid content-start gap-4 md:grid-cols-2 xl:grid-cols-1">
        <section className="glass-strong flex flex-col items-center rounded-[1.75rem] p-6 text-center">
          <Avatar nome={perfil.nome} tamanho="lg" />
          <h2 className="mt-3 text-xl font-semibold">{perfil.nome}</h2>
          <p className="text-sm text-salvia-600">
            {perfil.titularidade} · {perfil.plano}
          </p>
          <p className="mt-3 rounded-full bg-salvia-100 px-3 py-1 text-xs font-semibold text-petroleo-800">
            Perfil de cuidado: {ROTULOS_SEGMENTO[perfil.segmento]}
          </p>
          <dl className="mt-5 grid w-full grid-cols-3 gap-2">
            {estatisticas.map(({ rotulo, valor }) => (
              <div key={rotulo} className="rounded-2xl bg-white/70 px-2 py-3 ring-1 ring-white">
                <dd className="text-2xl font-semibold text-petroleo-800">{valor}</dd>
                <dt className="text-[11px] font-medium text-salvia-600">{rotulo}</dt>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-label="Carteirinha virtual"
          className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-petroleo-600 via-petroleo-800 to-petroleo-950 p-6 text-white shadow-[0_24px_40px_-24px_rgb(14_42_37/0.9)]"
        >
          <LeafArt tom="escuro" className="-right-10 -top-6 h-52 w-80" />
          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg font-semibold">
              <LogoMark variante="claro" className="h-7 w-7" /> Jornada
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-white/80">{perfil.plano}</span>
          </div>
          <p className="relative mt-9 font-mono text-lg tracking-[0.16em] sm:text-xl">{perfil.carteirinha}</p>
          <div className="relative mt-5 flex justify-between gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/75">Beneficiário</p>
              <p className="font-medium">{perfil.nome}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-white/75">Titularidade</p>
              <p className="font-medium">{perfil.titularidade}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
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
              { icone: Bell, titulo: 'Notificações', descricao: 'Consultas, resultados e lembretes.', to: '/notificacoes' },
              { icone: ShieldCheck, titulo: 'Privacidade e segurança', descricao: 'Seus dados de saúde são tratados conforme a LGPD, com consentimento registrado no cadastro.' },
            ]}
          />
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variante="secundario" icone={RotateCcw} onClick={restaurar} carregando={restaurando}>
            Restaurar dados de demonstração
          </Button>
          <Button variante="perigo" icone={LogOut} onClick={sair}>
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
}
