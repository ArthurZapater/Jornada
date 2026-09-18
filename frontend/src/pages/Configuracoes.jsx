import { useState } from 'react';
import { Bell, ChevronRight, FileCheck, HandHelping, HeartPulse, Info, Monitor, Moon, Palette, RotateCcw, Sun, Trash2, Volume2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ListaDeDestinos } from '../components/exame/ResultadosCompartilhados';
import PainelSeguranca from '../components/seguranca/PainelSeguranca';
import Button from '../components/ui/Button';
import { CampoSelecao } from '../components/ui/Campo';
import IconTile from '../components/ui/IconTile';
import Interruptor from '../components/ui/Interruptor';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { usePreferencias } from '../contexts/PreferenciasContext';
import { useTema } from '../contexts/TemaContext';
import { useAsync } from '../hooks/useAsync';
import { useSinteseDeFala } from '../hooks/useSinteseDeFala';
import { useVozNatural } from '../hooks/useVozNatural';
import { destravarAudio, modoDaSessaoDeAudio } from '../utils/sons';
import { definirCompartilhamento, obterCompartilhamento } from '../services/compartilhamentoService';
import { apagarPerfilSaude } from '../services/perfilSaudeService';
import { comoChamar } from '../utils/perfilSaude';
import { TIPOS_NOTIFICACAO } from '../utils/preferencias';

export default function Configuracoes() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader titulo="Configurações" subtitulo="Deixe o app do jeito que funciona melhor para você." voltarPara="/perfil" />
      <Aparencia />
      <Acessibilidade />
      <Voz />
      <Notificacoes />
      <Privacidade />
      <Demonstracao />
      <Link to="/sobre" className="glass-strong flex items-center gap-4 rounded-3xl p-4 transition hover:bg-superficie/80">
        <IconTile icone={Info} tamanho="sm" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Sobre a Jornada</span>
          <span className="block text-sm text-salvia-600">Versão, equipe, licenças e fontes de dados.</span>
        </span>
        <ChevronRight size={18} className="text-salvia-600" aria-hidden="true" />
      </Link>
    </div>
  );
}

function Secao({ id, icone, titulo, descricao, children }) {
  return (
    <section aria-labelledby={id} className="glass-strong rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <IconTile icone={icone} tamanho="sm" />
        <div>
          <h2 id={id} className="font-semibold">{titulo}</h2>
          {descricao && <p className="text-sm text-salvia-600">{descricao}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Controle segmentado (estilo iOS): uma escolha entre poucas opções. */
function Segmentado({ id, rotulo, opcoes, valor, onChange, className = '' }) {
  return (
    <div className={className}>
      <p id={id} className="text-sm font-medium">
        {rotulo}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="mt-2 grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-salvia-100 p-1">
        {opcoes.map((opcao) => {
          const ativo = opcao.valor === valor;
          const Icone = opcao.icone;
          return (
            <button
              key={opcao.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              aria-label={opcao.descricao ? `${opcao.rotulo} — ${opcao.descricao}` : undefined}
              onClick={() => onChange(opcao.valor)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-medium transition ${
                ativo ? 'bg-superficie text-acento shadow-sm ring-1 ring-borda' : 'text-texto hover:bg-superficie/50'
              }`}
            >
              {Icone && <Icone size={16} aria-hidden="true" />}
              <span style={opcao.estilo}>{opcao.rotulo}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Aparencia() {
  const { preferencia, definir } = useTema();
  const { preferencias, alterar } = usePreferencias();
  return (
    <Secao id="cfg-aparencia" icone={Palette} titulo="Aparência" descricao="Tema, tamanho do texto e movimento.">
      <Segmentado
        id="rotulo-tema"
        rotulo="Tema"
        valor={preferencia}
        onChange={definir}
        opcoes={[
          { valor: 'claro', rotulo: 'Claro', icone: Sun },
          { valor: 'escuro', rotulo: 'Escuro', icone: Moon },
          { valor: 'sistema', rotulo: 'Automático', icone: Monitor, descricao: 'segue o aparelho' },
        ]}
      />

      <Segmentado
        className="mt-6"
        id="rotulo-texto"
        rotulo="Tamanho do texto"
        valor={preferencias.tamanhoTexto}
        onChange={(tamanhoTexto) => alterar({ tamanhoTexto })}
        opcoes={[
          { valor: 'padrao', rotulo: 'Padrão' },
          { valor: 'grande', rotulo: 'Grande', estilo: { fontSize: '1.05em' } },
          { valor: 'maior', rotulo: 'Maior', estilo: { fontSize: '1.15em' } },
        ]}
      />
      <p className="mt-2 text-xs text-salvia-600">Vale para o app inteiro, inclusive o menu e a carteirinha.</p>

      <div className="-mx-4 mt-4 border-t border-salvia-100">
        <Interruptor
          id="cfg-movimento"
          rotulo="Reduzir animações"
          descricao="Tira transições e efeitos de mola. O app já respeita o ajuste do sistema."
          ligado={preferencias.movimento === 'reduzido'}
          onChange={(ligado) => alterar({ movimento: ligado ? 'reduzido' : 'sistema' })}
        />
      </div>
    </Secao>
  );
}

function Acessibilidade() {
  const { preferencias, alterar } = usePreferencias();
  return (
    <Secao id="cfg-acessibilidade" icone={HandHelping} titulo="Acessibilidade" descricao="Recursos para pessoas surdas ou com deficiência auditiva.">
      <div className="-mx-4 -mt-2">
        <Interruptor
          id="cfg-libras"
          rotulo="Modo Libras"
          descricao="Liga o VLibras, o intérprete virtual do Governo Federal. Toque no botão dele na lateral da tela e depois no texto que quer ver em Libras."
          ligado={preferencias.libras}
          onChange={(libras) => alterar({ libras })}
        />
      </div>
      <p className="mt-2 text-xs text-salvia-600">
        O VLibras é um serviço externo (vlibras.gov.br): ele só é carregado com o modo ligado, e o texto que você pede para
        traduzir é enviado ao servidor dele. Evite traduzir laudos se não quiser compartilhar esse conteúdo.
      </p>
    </Secao>
  );
}

function Voz() {
  const { usuario } = useAuth();
  const { preferencias, alterar } = usePreferencias();
  const voz = useSinteseDeFala({ vozURI: preferencias.vozURI, velocidade: preferencias.velocidadeVoz });
  const exemplo = useVozNatural({ vozURI: preferencias.vozURI, velocidade: preferencias.velocidadeVoz, natural: preferencias.vozNatural });

  return (
    <Secao id="cfg-voz" icone={Volume2} titulo="Voz do assistente" descricao="Como o assistente fala com você na conversa por voz.">
      <div className="-mx-4 -mt-2 mb-4 border-b border-salvia-100">
        <Interruptor
          id="cfg-voz-natural"
          rotulo="Voz natural"
          descricao="Voz em português do Brasil gerada pela OpenAI. O texto de cada resposta é enviado a ela para virar áudio. Desligada, o app usa a voz do aparelho."
          ligado={preferencias.vozNatural}
          onChange={(vozNatural) => alterar({ vozNatural })}
        />
      </div>
      <p className="mb-2 text-sm font-medium">Voz reserva, do aparelho</p>
      {!voz.suportado ? (
        <p className="text-sm text-salvia-600">Este navegador não tem voz própria; sem a voz natural, as respostas ficam só escritas.</p>
      ) : voz.vozes.length > 0 ? (
        <CampoSelecao
          id="cfg-voz-escolhida"
          rotulo="Voz"
          vazio="Padrão do aparelho"
          value={preferencias.vozURI ?? ''}
          onChange={(e) => alterar({ vozURI: e.target.value || null })}
          opcoes={voz.vozes.map((v) => ({
            valor: v.voiceURI,
            rotulo: `${v.name} (${v.lang}) — ${v.localService ? 'no aparelho' : 'online'}`,
          }))}
        />
      ) : (
        <p className="text-sm text-salvia-600">Nenhuma voz em português instalada; o navegador usa a padrão dele.</p>
      )}
      <p className="mt-1.5 text-xs text-salvia-600">
        Voz "online" é gerada no servidor do fabricante do navegador, que recebe o texto da resposta. "No aparelho" não sai daqui.
      </p>

      <Segmentado
        className="mt-5"
        id="rotulo-velocidade"
        rotulo="Velocidade"
        valor={preferencias.velocidadeVoz}
        onChange={(velocidadeVoz) => alterar({ velocidadeVoz })}
        opcoes={[
          { valor: 0.85, rotulo: 'Devagar' },
          { valor: 1, rotulo: 'Normal' },
          { valor: 1.2, rotulo: 'Rápida' },
        ]}
      />

      <Button
        variante="secundario"
        tamanho="sm"
        icone={Volume2}
        className="mt-5"
        onClick={() => {
          if (exemplo.falando) return exemplo.parar();
          destravarAudio();
          modoDaSessaoDeAudio('playback');
          exemplo.destravar();
          exemplo.falar(`Oi, ${comoChamar(usuario)}! É assim que eu vou falar com você.`);
        }}
      >
        {exemplo.falando ? 'Parar' : 'Ouvir exemplo'}
      </Button>
    </Secao>
  );
}

function Notificacoes() {
  const { preferencias, alterar } = usePreferencias();
  return (
    <Secao id="cfg-notificacoes" icone={Bell} titulo="Notificações" descricao="Escolha o que aparece no sino e na lista de avisos.">
      <ul className="-mx-4 divide-y divide-salvia-100 border-y border-salvia-100">
        {TIPOS_NOTIFICACAO.map(({ tipo, rotulo, descricao }) => (
          <li key={tipo}>
            <Interruptor
              id={`cfg-notif-${tipo}`}
              rotulo={rotulo}
              descricao={descricao}
              ligado={preferencias.notificacoes[tipo]}
              onChange={(ligado) => alterar({ notificacoes: { [tipo]: ligado } })}
            />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-salvia-600">
        Nesta versão os avisos existem só dentro do app. Envio por push, e-mail ou WhatsApp depende do backend.
      </p>
    </Secao>
  );
}

function Privacidade() {
  const { sincronizarUsuario } = useAuth();
  const [confirmando, setConfirmando] = useState(false);
  const [estado, setEstado] = useState('ocioso');

  async function apagar() {
    setEstado('apagando');
    await apagarPerfilSaude();
    sincronizarUsuario();
    setConfirmando(false);
    setEstado('apagado');
  }

  return (
    <div className="space-y-4">
      <Secao id="cfg-perfil-saude" icone={HeartPulse} titulo="Perfil de saúde" descricao="Condições, alergias, hábitos e contato de emergência.">
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to="/perfil/saude" variante="secundario" tamanho="sm">
            Revisar respostas
          </Button>
          {!confirmando && (
            <Button variante="fantasma" tamanho="sm" icone={Trash2} onClick={() => setConfirmando(true)}>
              Apagar perfil de saúde
            </Button>
          )}
        </div>
        {confirmando && (
          <div className="mt-4 rounded-2xl bg-alerta-50 p-4" role="alertdialog" aria-labelledby="cfg-apagar-titulo">
            <p id="cfg-apagar-titulo" className="text-sm text-alerta-600">
              Isso apaga todas as respostas do questionário e devolve seu perfil de cuidado ao que foi informado no cadastro. Não dá para desfazer.
            </p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variante="fantasma" tamanho="sm" onClick={() => setConfirmando(false)}>Cancelar</Button>
              <Button variante="perigo" tamanho="sm" icone={Trash2} onClick={apagar} carregando={estado === 'apagando'}>Sim, apagar</Button>
            </div>
          </div>
        )}
        {estado === 'apagado' && (
          <p role="status" className="mt-3 text-sm text-acento">Perfil de saúde apagado.</p>
        )}
      </Secao>
      <CompartilhamentoResultados />
      <PainelSeguranca />
    </div>
  );
}

function CompartilhamentoResultados() {
  const estado = useAsync(obterCompartilhamento, []);
  const [salvando, setSalvando] = useState(false);
  const dados = estado.dados;

  async function alternar(ativo) {
    setSalvando(true);
    try {
      await definirCompartilhamento(ativo);
      estado.recarregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Secao
      id="cfg-resultados"
      icone={FileCheck}
      titulo="Resultados de exames"
      descricao="Quem vai te atender a seguir já encontra seus resultados recentes, sem você levar o laudo."
    >
      <div className="-mx-4 -mt-2 border-b border-salvia-100" aria-busy={salvando}>
        <Interruptor
          id="cfg-compartilhar-resultados"
          rotulo="Compartilhar com quem vai me atender"
          descricao={`Resultados dos últimos ${Math.round((dados?.janelaDias ?? 365) / 30)} meses, só para o médico da próxima consulta, a equipe do próximo exame e o especialista do encaminhamento em aberto.`}
          ligado={dados?.ativo ?? true}
          onChange={alternar}
        />
      </div>
      {dados && (
        <div className="mt-4">
          {!dados.ativo ? (
            <p className="text-sm text-salvia-600">Desligado: só você vê seus resultados no app. Cada profissional pede os exames na consulta.</p>
          ) : dados.destinos.length ? (
            <>
              <p className="mb-2 text-sm font-medium">
                Com acesso agora a {dados.resultados.length === 1 ? '1 resultado' : `${dados.resultados.length} resultados`}:
              </p>
              <ListaDeDestinos destinos={dados.destinos} />
              <p className="mt-2 text-xs text-salvia-600">O acesso de cada um acaba quando o atendimento passa. Nada disso vai por WhatsApp.</p>
            </>
          ) : (
            <p className="text-sm text-salvia-600">Ninguém tem acesso agora: não há atendimento marcado ou resultado recente.</p>
          )}
        </div>
      )}
    </Secao>
  );
}

function Demonstracao() {
  const { reiniciarDemonstracao } = useAuth();
  const navigate = useNavigate();
  const [restaurando, setRestaurando] = useState(false);

  async function restaurar() {
    setRestaurando(true);
    await reiniciarDemonstracao();
    navigate('/login', { replace: true });
  }

  return (
    <Secao id="cfg-demo" icone={RotateCcw} titulo="Demonstração" descricao="Volta a Ana ao estado da primeira vez: sem foto, sem perfil respondido, avisos por ler.">
      <p className="text-sm text-salvia-600">Também acontece sozinho depois de 15 minutos sem uso. Tema e preferências desta tela são mantidos.</p>
      <Button variante="secundario" icone={RotateCcw} onClick={restaurar} carregando={restaurando} className="mt-4">
        Restaurar dados de demonstração
      </Button>
    </Secao>
  );
}
