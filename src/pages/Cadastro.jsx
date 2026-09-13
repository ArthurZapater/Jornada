import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, IdCard, Lock, Mail, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import Campo from '../components/ui/Campo';
import { useAuth } from '../contexts/AuthContext';
import { formatarCpf, idade } from '../utils/format';
import { cpfValido, emailValido, senhaForte } from '../utils/validacao';

const INICIAL = {
  nome: '',
  cpf: '',
  dataNascimento: '',
  email: '',
  // Celular fica fora do cadastro (menos atrito para criar a conta); é opcional no
  // questionário do primeiro acesso e no perfil de saúde.
  senha: '',
  confirmacao: '',
  condicaoCronica: false,
  consentimentoLgpd: false,
};

function validar(f) {
  const erros = {};
  if (f.nome.trim().split(/\s+/).length < 2) erros.nome = 'Informe nome e sobrenome.';
  if (!cpfValido(f.cpf)) erros.cpf = 'CPF inválido.';
  if (!f.dataNascimento) erros.dataNascimento = 'Informe sua data de nascimento.';
  else if (new Date(`${f.dataNascimento}T00:00`) > new Date()) erros.dataNascimento = 'A data não pode estar no futuro.';
  else if (idade(f.dataNascimento) < 18) erros.dataNascimento = 'O titular precisa ter 18 anos ou mais.';
  if (!emailValido(f.email)) erros.email = 'E-mail inválido.';
  if (!senhaForte(f.senha)) erros.senha = 'Use ao menos 8 caracteres, com letras e números.';
  if (f.confirmacao !== f.senha) erros.confirmacao = 'As senhas não conferem.';
  if (!f.consentimentoLgpd) erros.consentimentoLgpd = 'É necessário aceitar para continuar.';
  return erros;
}

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INICIAL);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo, mascara) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [campo]: mascara ? mascara(valor) : valor }));
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  async function enviar(e) {
    e.preventDefault();
    const encontrados = validar(form);
    setErros(encontrados);
    if (Object.keys(encontrados).length) {
      document.getElementById(Object.keys(encontrados)[0])?.focus();
      return;
    }
    setErroGeral('');
    setEnviando(true);
    try {
      await cadastrar(form);
      navigate('/', { replace: true });
    } catch (err) {
      setErroGeral(err.message);
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <Link to="/login" className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium text-acento hover:bg-superficie/60">
        <ArrowLeft size={16} aria-hidden="true" /> Voltar ao login
      </Link>
      <div className="glass-strong rounded-[2rem] p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="mt-1 text-salvia-600">Leva menos de um minuto.</p>

        <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
          <Campo id="nome" rotulo="Nome completo" icone={UserRound} autoComplete="name" value={form.nome} onChange={alterar('nome')} erro={erros.nome} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="cpf" rotulo="CPF" icone={IdCard} inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={alterar('cpf', formatarCpf)} erro={erros.cpf} />
            <Campo id="dataNascimento" rotulo="Data de nascimento" icone={CalendarDays} type="date" value={form.dataNascimento} onChange={alterar('dataNascimento')} erro={erros.dataNascimento} />
          </div>
          <Campo id="email" rotulo="E-mail" icone={Mail} type="email" autoComplete="email" value={form.email} onChange={alterar('email')} erro={erros.email} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="senha" rotulo="Senha" icone={Lock} type="password" autoComplete="new-password" value={form.senha} onChange={alterar('senha')} erro={erros.senha} dica="8+ caracteres, letras e números" />
            <Campo id="confirmacao" rotulo="Confirmar senha" icone={Lock} type="password" autoComplete="new-password" value={form.confirmacao} onChange={alterar('confirmacao')} erro={erros.confirmacao} />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-superficie/55 p-4 text-sm ring-1 ring-borda/70">
            <input type="checkbox" checked={form.condicaoCronica} onChange={alterar('condicaoCronica')} className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo-800" />
            <span>
              <span className="font-medium">Tenho uma condição crônica</span>
              <span className="block text-salvia-600">Ex.: hipertensão ou diabetes. Usamos isso para personalizar seu acompanhamento.</span>
            </span>
          </label>

          <div>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-superficie/55 p-4 text-sm ring-1 ring-borda/70">
              <input
                id="consentimentoLgpd"
                type="checkbox"
                checked={form.consentimentoLgpd}
                onChange={alterar('consentimentoLgpd')}
                aria-invalid={Boolean(erros.consentimentoLgpd)}
                aria-describedby={erros.consentimentoLgpd ? 'consentimentoLgpd-erro' : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 accent-petroleo-800"
              />
              <span>
                Autorizo o tratamento dos meus dados pessoais e de saúde para fins de cuidado e acompanhamento, conforme a{' '}
                <strong>LGPD (Lei nº 13.709/2018)</strong>.
              </span>
            </label>
            {erros.consentimentoLgpd && (
              <p id="consentimentoLgpd-erro" className="mt-1.5 text-sm text-alerta-600">{erros.consentimentoLgpd}</p>
            )}
          </div>

          {erroGeral && (
            <p role="alert" className="rounded-2xl bg-alerta-50 px-4 py-3 text-sm text-alerta-600">{erroGeral}</p>
          )}
          <Button type="submit" bloco tamanho="lg" carregando={enviando} iconeFim={ArrowRight}>
            Criar conta
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
