import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, Check, LoaderCircle, MapPin, Phone, Ruler, Scale, ShieldCheck, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import Campo, { AreaDeTexto, CampoSelecao } from '../ui/Campo';
import IconTile from '../ui/IconTile';
import { ETAPAS } from './etapasPerfil';
import GrupoOpcoes from '../ui/Opcoes';
import { transicaoPagina } from '../ui/animacoes';
import { buscarCep } from '../../services/cepService';
import { primeiroNome } from '../../utils/format';
import {
  LIMITES_TEXTO,
  OPCOES,
  PERFIL_VAZIO,
  UFS,
  calcularCompletude,
  calcularImc,
  formatarCep,
  formatarTelefone,
  numeroDecimal,
  validarPerfil,
} from '../../utils/perfilSaude';

const CAMPOS_DO_BENEFICIARIO = ['nomePreferido', 'telefone'];

/** Números vêm do serviço como número; no campo, tudo é texto. */
function paraFormulario({ nomePreferido, telefone, perfil }) {
  const p = { ...PERFIL_VAZIO, ...(perfil ?? {}) };
  return {
    nomePreferido: nomePreferido ?? '',
    telefone: telefone ?? '',
    perfil: {
      ...p,
      alturaCm: p.alturaCm === '' ? '' : String(p.alturaCm),
      pesoKg: p.pesoKg === '' ? '' : String(p.pesoKg).replace('.', ','),
      cep: formatarCep(p.cep ?? ''),
    },
  };
}

/**
 * Questionário do perfil em etapas. Serve ao primeiro acesso e à edição no perfil:
 * quem usa decide o que acontece ao concluir e ao adiar.
 *
 * @param aoConcluir async (form) => void — erro lançado aparece no formulário
 * @param aoAdiar async (form) => void — opcional; mostra "Responder depois"
 * @param salvarEmQualquerEtapa mostra "Salvar" antes da última etapa (edição)
 */
export default function QuestionarioPerfil({
  inicial,
  nome = '',
  etapaInicial = 0,
  rotuloFinal = 'Concluir',
  aoConcluir,
  aoAdiar,
  salvarEmQualquerEtapa = false,
}) {
  const [form, setForm] = useState(() => paraFormulario(inicial));
  const [etapa, setEtapa] = useState(etapaInicial);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [ocupado, setOcupado] = useState(null);
  const raiz = useRef(null);
  const focarTitulo = useRef(false);
  // Campo com erro numa etapa que ainda vai aparecer: focado quando ela terminar de entrar.
  const focarCampo = useRef(null);
  // Busca de cidade/UF pelo CEP: 'buscando' | 'achou' | 'nao-achou' | null
  const [cepBusca, setCepBusca] = useState(null);
  const pedidoCep = useRef(null);
  useEffect(() => () => pedidoCep.current?.abort(), []);

  const p = form.perfil;
  const atual = ETAPAS[etapa];
  const ultima = etapa === ETAPAS.length - 1;
  const completude = calcularCompletude(p, { nomePreferido: form.nomePreferido });

  function definir(campo, valor) {
    setForm((f) =>
      CAMPOS_DO_BENEFICIARIO.includes(campo) ? { ...f, [campo]: valor } : { ...f, perfil: { ...f.perfil, [campo]: valor } },
    );
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  }

  const aoDigitar = (campo, mascara) => (evento) => definir(campo, mascara ? mascara(evento.target.value) : evento.target.value);

  /** Ao completar os 8 dígitos, preenche cidade e UF pelo ViaCEP (a pessoa ainda pode corrigir). */
  function aoDigitarCep(evento) {
    const cep = formatarCep(evento.target.value);
    definir('cep', cep);
    pedidoCep.current?.abort();
    if (cep.replace(/\D/g, '').length !== 8) {
      setCepBusca(null);
      return;
    }
    const controle = new AbortController();
    pedidoCep.current = controle;
    setCepBusca('buscando');
    buscarCep(cep, controle.signal).then((endereco) => {
      if (controle.signal.aborted) return;
      if (!endereco) return setCepBusca('nao-achou');
      definir('cidade', endereco.cidade);
      definir('uf', endereco.uf);
      setCepBusca('achou');
    });
  }
  const escolha = (campo) => ({ valor: p[campo], onChange: (valor) => definir(campo, valor), opcoes: OPCOES[campo] });

  const errosDaEtapa = (indice) =>
    Object.fromEntries(Object.entries(validarPerfil(form)).filter(([campo]) => ETAPAS[indice].campos.includes(campo)));

  /** Mostra os erros da etapa atual e foca o primeiro campo com problema. */
  function conferirEtapa() {
    const daEtapa = errosDaEtapa(etapa);
    setErros(daEtapa);
    const primeiro = Object.keys(daEtapa)[0];
    if (primeiro) document.getElementById(`perfil-${primeiro}`)?.focus();
    return !primeiro;
  }

  function irPara(indice) {
    if (indice === etapa) return;
    if (indice > etapa && !conferirEtapa()) return;
    setErros({});
    focarTitulo.current = true;
    setEtapa(indice);
    raiz.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  async function executar(tipo, acao) {
    setErroGeral('');
    setOcupado(tipo);
    try {
      await acao(form);
    } catch (erro) {
      setErroGeral(erro.message);
    } finally {
      setOcupado(null);
    }
  }

  function concluir() {
    const campo = Object.keys(validarPerfil(form))[0];
    if (campo) {
      const indice = ETAPAS.findIndex((e) => e.campos.includes(campo));
      if (indice === etapa) {
        conferirEtapa();
      } else {
        setErros(errosDaEtapa(indice));
        focarCampo.current = `perfil-${campo}`;
        setEtapa(indice);
      }
      return;
    }
    executar('concluir', aoConcluir);
  }

  const errosDeFormato = validarPerfil(form);
  const imc = errosDeFormato.alturaCm || errosDeFormato.pesoKg ? null : calcularImc(p.alturaCm, numeroDecimal(p.pesoKg));

  const conteudo = {
    sobre: (
      <>
        <Campo
          id="perfil-nomePreferido"
          rotulo="Como você prefere ser chamado(a)?"
          icone={UserRound}
          placeholder={primeiroNome(nome)}
          maxLength={LIMITES_TEXTO.nomePreferido}
          value={form.nomePreferido}
          onChange={aoDigitar('nomePreferido')}
          dica="É assim que o app e o assistente vão falar com você."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="perfil-telefone" rotulo="Celular (opcional)" icone={Phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 90000-0000" value={form.telefone} onChange={aoDigitar('telefone', formatarTelefone)} erro={erros.telefone} />
          <Campo id="perfil-profissao" rotulo="Profissão" icone={Briefcase} maxLength={LIMITES_TEXTO.profissao} value={p.profissao} onChange={aoDigitar('profissao')} />
        </div>
        <GrupoOpcoes legenda="Gênero" {...escolha('genero')} />
        <GrupoOpcoes legenda="Estado civil" {...escolha('estadoCivil')} />
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-4 sm:grid-cols-[9rem_minmax(0,1fr)_6.5rem]">
          <Campo
            id="perfil-cep"
            rotulo="CEP"
            icone={MapPin}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={p.cep}
            onChange={aoDigitarCep}
            erro={erros.cep}
            className="col-span-2 sm:col-span-1"
            aria-busy={cepBusca === 'buscando'}
            acessorio={cepBusca === 'buscando' && <LoaderCircle size={18} className="shrink-0 animate-spin text-salvia-600" aria-hidden="true" />}
          />
          <Campo id="perfil-cidade" rotulo="Cidade" maxLength={LIMITES_TEXTO.cidade} autoComplete="address-level2" value={p.cidade} onChange={aoDigitar('cidade')} />
          <CampoSelecao id="perfil-uf" rotulo="UF" vazio="—" opcoes={UFS.map((uf) => ({ valor: uf, rotulo: uf }))} value={p.uf ?? ''} onChange={(e) => definir('uf', e.target.value || null)} />
          <p className="col-span-full -mt-2 text-xs text-salvia-600" aria-live="polite">
            {cepBusca === 'buscando'
              ? 'Buscando cidade e UF pelo CEP...'
              : cepBusca === 'achou'
                ? 'Cidade e UF preenchidas pelo CEP. Confira e corrija se precisar.'
                : cepBusca === 'nao-achou'
                  ? 'Não encontramos esse CEP. Preencha cidade e UF.'
                  : 'Digite o CEP que cidade e UF se preenchem sozinhas (consulta ao ViaCEP, só com o CEP).'}
          </p>
        </div>
      </>
    ),
    saude: (
      <>
        <div className="grid grid-cols-2 gap-4">
          <Campo id="perfil-alturaCm" rotulo="Altura (cm)" icone={Ruler} inputMode="numeric" placeholder="165" value={p.alturaCm} onChange={aoDigitar('alturaCm', (v) => v.replace(/\D/g, '').slice(0, 3))} erro={erros.alturaCm} />
          <Campo id="perfil-pesoKg" rotulo="Peso (kg)" icone={Scale} inputMode="decimal" placeholder="62,5" value={p.pesoKg} onChange={aoDigitar('pesoKg', (v) => v.replace(/[^\d,.]/g, '').slice(0, 5))} erro={erros.pesoKg} />
        </div>
        {imc && (
          <p className="rounded-2xl bg-superficie/60 px-4 py-3 text-sm ring-1 ring-borda" aria-live="polite">
            IMC <strong>{imc.valor.toLocaleString('pt-BR')}</strong> — {imc.faixa.toLowerCase()} da OMS.{' '}
            <span className="text-salvia-600">É só uma conta: quem interpreta é o seu médico.</span>
          </p>
        )}
        <GrupoOpcoes legenda="Tipo sanguíneo" {...escolha('tipoSanguineo')} />
        <GrupoOpcoes legenda="Tem alguma condição de saúde diagnosticada?" dica="Marque todas que se aplicam." multiplo exclusiva="NENHUMA" {...escolha('condicoes')} />
        {p.condicoes.includes('OUTRA') && (
          <Campo id="perfil-condicoesOutra" rotulo="Qual condição?" maxLength={LIMITES_TEXTO.condicoesOutra} value={p.condicoesOutra} onChange={aoDigitar('condicoesOutra')} />
        )}
      </>
    ),
    historico: (
      <>
        <GrupoOpcoes legenda="Tem alergia?" multiplo exclusiva="NENHUMA" {...escolha('alergias')} />
        {p.alergias.some((a) => a !== 'NENHUMA') && (
          <Campo
            id="perfil-alergiasDetalhe"
            rotulo={p.alergias.includes('OUTRA') ? 'Qual é a outra alergia? Conte a quê, exatamente' : 'A quê, exatamente?'}
            placeholder="Ex.: dipirona, camarão" maxLength={LIMITES_TEXTO.alergiasDetalhe} value={p.alergiasDetalhe} onChange={aoDigitar('alergiasDetalhe')} />
        )}
        <AreaDeTexto id="perfil-medicamentos" rotulo="Remédios de uso contínuo" placeholder="Nome e dose, um por linha" maxLength={LIMITES_TEXTO.medicamentos} value={p.medicamentos} onChange={aoDigitar('medicamentos')} dica="Evita que um médico receite algo que não combina com o que você já toma." />
        <AreaDeTexto id="perfil-cirurgias" rotulo="Cirurgias ou internações" placeholder="Ex.: retirada do apêndice, 2015" maxLength={LIMITES_TEXTO.cirurgias} value={p.cirurgias} onChange={aoDigitar('cirurgias')} />
        <GrupoOpcoes legenda="Casos na família (pais e irmãos)" dica="Algumas doenças pedem check-up mais cedo quando há histórico." multiplo {...escolha('historicoFamiliar')} />
        {p.historicoFamiliar.includes('OUTRA') && (
          <Campo id="perfil-historicoFamiliarOutra" rotulo="Qual doença na família?" placeholder="Ex.: glaucoma" maxLength={LIMITES_TEXTO.historicoFamiliarOutra} value={p.historicoFamiliarOutra} onChange={aoDigitar('historicoFamiliarOutra')} />
        )}
        <GrupoOpcoes legenda="Precisa de alguma adaptação no atendimento?" dica="Fica no seu perfil para a equipe se preparar para te receber." multiplo {...escolha('acessibilidade')} />
        {p.acessibilidade.includes('OUTRA') && (
          <Campo id="perfil-acessibilidadeOutra" rotulo="Qual adaptação você precisa?" placeholder="Ex.: acompanhante na consulta" maxLength={LIMITES_TEXTO.acessibilidadeOutra} value={p.acessibilidadeOutra} onChange={aoDigitar('acessibilidadeOutra')} />
        )}
        {p.acessibilidade.includes('VISUAL') && (
          <p className="rounded-2xl bg-salvia-100 px-4 py-3 text-sm">
            Dica: em <Link to="/configuracoes" className="font-semibold text-acento underline underline-offset-2">Configurações</Link> dá para aumentar o texto do app.
          </p>
        )}
        {p.acessibilidade.some((a) => a === 'AUDITIVA' || a === 'SURDEZ_MUDEZ') && (
          <p className="rounded-2xl bg-salvia-100 px-4 py-3 text-sm">
            Dica: em <Link to="/configuracoes" className="font-semibold text-acento underline underline-offset-2">Configurações</Link> dá para ligar o modo Libras, com um intérprete virtual que traduz os textos do app.
          </p>
        )}
      </>
    ),
    habitos: (
      <>
        <GrupoOpcoes legenda="Você fuma?" {...escolha('tabagismo')} />
        <GrupoOpcoes legenda="Bebida alcoólica" {...escolha('alcool')} />
        <GrupoOpcoes legenda="Com que frequência você se exercita?" {...escolha('atividadeFisica')} />
        <GrupoOpcoes legenda="Quantas horas você dorme por noite?" {...escolha('sono')} />
        <GrupoOpcoes legenda="Como anda o estresse?" {...escolha('estresse')} />
      </>
    ),
    cuidado: (
      <>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Contato de emergência</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo id="perfil-contatoNome" rotulo="Nome" icone={UserRound} maxLength={LIMITES_TEXTO.contatoNome} value={p.contatoNome} onChange={aoDigitar('contatoNome')} erro={erros.contatoNome} />
            <Campo id="perfil-contatoParentesco" rotulo="Parentesco" placeholder="Ex.: irmã" maxLength={LIMITES_TEXTO.contatoParentesco} value={p.contatoParentesco} onChange={aoDigitar('contatoParentesco')} />
            <Campo id="perfil-contatoTelefone" rotulo="Telefone" icone={Phone} type="tel" inputMode="tel" placeholder="(11) 90000-0000" value={p.contatoTelefone} onChange={aoDigitar('contatoTelefone', formatarTelefone)} erro={erros.contatoTelefone} className="sm:col-span-2" />
          </div>
        </fieldset>
        <GrupoOpcoes legenda="Melhor período para consultas" {...escolha('periodoPreferido')} />
        <GrupoOpcoes legenda="Como prefere receber avisos?" dica="Pode marcar mais de um." multiplo {...escolha('canaisAviso')} />
        <GrupoOpcoes legenda="O que você quer cuidar este ano?" dica="Escolha quantos quiser." multiplo {...escolha('objetivos')} />
      </>
    ),
  };

  return (
    <div ref={raiz} className="scroll-mt-6">
      <nav aria-label="Etapas do perfil" className="mb-4">
        <ol className="flex gap-1.5">
          {ETAPAS.map((e, i) => (
            <li key={e.id} className="flex-1">
              <button
                type="button"
                onClick={() => irPara(i)}
                aria-current={i === etapa ? 'step' : undefined}
                aria-label={`Etapa ${i + 1}: ${e.titulo}`}
                className="block w-full py-2"
              >
                <span className={`block h-1.5 rounded-full transition-colors ${i <= etapa ? 'bg-petroleo-800' : 'bg-salvia-200'}`} />
              </button>
            </li>
          ))}
        </ol>
        <p className="flex justify-between text-xs text-salvia-600">
          <span>
            Etapa {etapa + 1} de {ETAPAS.length}
          </span>
          <span>Perfil {completude}% completo</span>
        </p>
      </nav>

      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          if (ultima) concluir();
          else irPara(etapa + 1);
        }}
        noValidate
        className="glass-strong rounded-[2rem] p-5 sm:p-7"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={atual.id}
            {...transicaoPagina}
            onAnimationComplete={() => {
              if (!focarCampo.current) return;
              document.getElementById(focarCampo.current)?.focus();
              focarCampo.current = null;
            }}
          >
            <header className="mb-6 flex items-start gap-3">
              <IconTile icone={atual.icone} />
              <div>
                <h2
                  ref={(el) => {
                    if (el && focarTitulo.current) {
                      focarTitulo.current = false;
                      el.focus({ preventScroll: true });
                    }
                  }}
                  tabIndex={-1}
                  className="text-xl font-semibold tracking-tight outline-none"
                >
                  {atual.titulo}
                </h2>
                <p className="text-sm text-salvia-600">{atual.descricao}</p>
              </div>
            </header>
            <div className="space-y-6">{conteudo[atual.id]}</div>
          </motion.div>
        </AnimatePresence>

        {erroGeral && (
          <p role="alert" className="mt-6 rounded-2xl bg-alerta-50 px-4 py-3 text-sm text-alerta-600">
            {erroGeral}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {etapa > 0 && (
            <Button variante="fantasma" icone={ArrowLeft} onClick={() => irPara(etapa - 1)}>
              Voltar
            </Button>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {aoAdiar && (
              <Button variante="fantasma" onClick={() => executar('adiar', aoAdiar)} carregando={ocupado === 'adiar'} disabled={Boolean(ocupado)}>
                Responder depois
              </Button>
            )}
            {salvarEmQualquerEtapa && !ultima && (
              <Button variante="secundario" onClick={concluir} carregando={ocupado === 'concluir'} disabled={Boolean(ocupado)}>
                Salvar
              </Button>
            )}
            <Button
              type="submit"
              iconeFim={ultima ? Check : ArrowRight}
              carregando={ultima && ocupado === 'concluir'}
              disabled={Boolean(ocupado)}
            >
              {ultima ? rotuloFinal : 'Continuar'}
            </Button>
          </div>
        </div>
      </form>

      <p className="mt-4 flex items-start gap-2 px-2 text-xs text-salvia-600">
        <ShieldCheck size={16} className="shrink-0" aria-hidden="true" />
        Tudo é opcional. Informação de saúde é dado sensível (LGPD, art. 11): usamos só para personalizar o seu
        cuidado, nada daqui vai em mensagem de WhatsApp, e você apaga o perfil quando quiser em Configurações.
      </p>
    </div>
  );
}
