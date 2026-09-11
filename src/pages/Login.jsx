import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Logo from '../components/brand/Logo';
import Button from '../components/ui/Button';
import Campo from '../components/ui/Campo';
import { useAuth } from '../contexts/AuthContext';

const DEMO = { identificador: 'ana.souza@email.com', senha: 'jornada123' };

export default function Login() {
  const { login, encerradaPorInatividade } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identificador: '', senha: '' });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    if (!form.identificador.trim() || !form.senha) {
      setErro('Informe seu e-mail ou CPF e sua senha.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      await login(form);
      navigate(location.state?.de?.pathname ?? '/', { replace: true });
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <Logo className="mb-8 lg:hidden" />
      <div className="glass-strong rounded-[2rem] p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-1 text-salvia-600">Acesse sua jornada de cuidado.</p>
        {encerradaPorInatividade && (
          <p role="status" className="mt-4 rounded-2xl bg-nevoa-100 px-4 py-3 text-sm">
            Sua sessão foi encerrada por inatividade. Entre novamente para continuar.
          </p>
        )}

        <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
          <Campo
            id="identificador"
            rotulo="E-mail ou CPF"
            icone={Mail}
            autoComplete="username"
            value={form.identificador}
            onChange={alterar('identificador')}
            placeholder="seu@email.com"
          />
          <Campo
            id="senha"
            rotulo="Senha"
            icone={Lock}
            type={mostrarSenha ? 'text' : 'password'}
            autoComplete="current-password"
            value={form.senha}
            onChange={alterar('senha')}
            placeholder="Sua senha"
            acessorio={
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-salvia-600 hover:bg-salvia-100"
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            }
          />
          {erro && (
            <p role="alert" className="rounded-2xl bg-alerta-50 px-4 py-3 text-sm text-alerta-600">
              {erro}
            </p>
          )}
          <Button type="submit" bloco tamanho="lg" carregando={enviando} iconeFim={ArrowRight}>
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-salvia-600">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-petroleo-800 underline-offset-4 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/50 p-4 ring-1 ring-white/70">
        <Sparkles size={20} className="shrink-0 text-petroleo-700" aria-hidden="true" />
        <p className="flex-1 text-sm leading-snug">
          <span className="font-medium">Acesso de demonstração</span>
          <br />
          <span className="text-salvia-600">{DEMO.identificador} · {DEMO.senha}</span>
        </p>
        <Button variante="secundario" tamanho="sm" onClick={() => setForm(DEMO)}>
          Preencher
        </Button>
      </div>
    </AuthLayout>
  );
}
