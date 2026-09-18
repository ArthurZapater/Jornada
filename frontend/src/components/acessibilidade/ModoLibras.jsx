import { useEffect } from 'react';
import { usePreferencias } from '../../contexts/PreferenciasContext';

// Modo Libras: o VLibras Widget, ferramenta oficial do Governo Federal (gov.br, código
// aberto, LGPLv3) que traduz o texto da página para Libras com um intérprete 3D.
// A pessoa toca no botão do VLibras na lateral e depois no texto que quer traduzir.
//
// SEGURANÇA — é o único script de terceiro do app, então ele só é baixado quando a
// pessoa liga o modo em Configurações. Todo JavaScript do widget que roda na página
// é conferido por SRI (hash sha256) da release v7.12.2:
//   - o carregador, pelo atributo integrity do próprio <script>;
//   - o módulo que o carregador cria e os pedaços que ele importa (inclusive os que só
//     carregam ao abrir uma tela do widget), por <link rel="modulepreload" integrity>
//     inserido ANTES. O navegador guarda o módulo verificado pela URL; quando o widget
//     pede a mesma URL, recebe esse — e, se o hash não bater, o módulo falha em vez de
//     rodar. (Pôr integrity no <script> depois de inserido não adianta: o download já
//     começou sem ele.)
// A CSP (vercel.json) libera apenas /app/ do vlibras.gov.br e essa release no jsDelivr.
//   connect     *.vlibras.gov.br (tradução e dicionário);
//   frame       vlibras.gov.br (o avatar roda num iframe dessa origem, isolado do app;
//               o que roda lá dentro não passa pela nossa CSP nem por este SRI).
// PRIVACIDADE — o texto que a pessoa manda traduzir vai para o servidor do VLibras.
// Configurações avisa isso antes de ligar.
//
// ATUALIZAR A VERSÃO: quando o governo publicar outra release, o modo Libras para de
// abrir (hash e CSP fixados). Troque VERSAO, recalcule os hashes de todos os arquivos
// abaixo (listar os imports de vlibras-initial-*.js) e ajuste o caminho no vercel.json.

const VERSAO = '7.12.2';
const RAIZ_VLIBRAS = 'https://vlibras.gov.br/app';
const RAIZ_RELEASE = `https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/vlibras-portal@v${VERSAO}/app`;
const URL_CARREGADOR = `${RAIZ_RELEASE}/vlibras-plugin.js`;
const INTEGRIDADE_CARREGADOR = 'sha256-Jnum4rEBEM3Vv7LWvUrTU5hwfSQiL9Atg8EhUJGC5vc=';

/** Módulos ES do widget (URL exata que ele pede → hash). */
const MODULOS = {
  // O carregador pede este endereço, que o governo redireciona para a release no jsDelivr.
  [`${RAIZ_VLIBRAS}/vlibras-plugin-app.js?v=${VERSAO}`]: 'sha256-dk77BWgZaEM88eS4ESvMQYNN+1no1DAYH86SPhDCF8Y=',
  [`${RAIZ_RELEASE}/vlibras-initial-CMx6VRWn.js`]: 'sha256-i1NjQy8Nzx18EtEmMsJINzTQLXqquUrMgWHa25gbc+g=',
  [`${RAIZ_RELEASE}/translator-BYuHpRbA.js`]: 'sha256-cTWuahbHcs/7FhzJ6CgxMzEyEUjzDOVtt9/sVu4/Yi0=',
  [`${RAIZ_RELEASE}/dictionary-ChNhyQx4.js`]: 'sha256-5JmzvNWc2CY6AUqrKvemL9Rb5RHYrYgZpMsWnYAnfPU=',
  [`${RAIZ_RELEASE}/settings-LyTzLRJt.js`]: 'sha256-oQMkqSR0XV8mq9U00+get0y+m0haLjixm1epR4xEp4s=',
  [`${RAIZ_RELEASE}/about-Cehfl43c.js`]: 'sha256-CB/9v5sJtAvBKzarSlaDWabrFlXYByZ2DPfyD+gUGI4=',
  [`${RAIZ_RELEASE}/guide-DwuxI2b_.js`]: 'sha256-23R5DA+FeX8OEyYRrY2nurxLRLS9BZjb8yevoN25cM8=',
  [`${RAIZ_RELEASE}/feedback-DavaMska.js`]: 'sha256-3UGEEinUIM1+T9EONQlGDVIlFtKdcJCTmXK1Brz3XV0=',
  [`${RAIZ_RELEASE}/feedback-CmshvrY3.js`]: 'sha256-arIvm7wJ/u+WY6J+niNTquiNLd9KAwg+nTy5kNYrx9w=',
  [`${RAIZ_RELEASE}/feedback-suggestion-_LfASsg6.js`]: 'sha256-cUSp8ALlBUVjbiw1A+CNQqNl8lVoE3GmPmxOuRzAdoQ=',
  [`${RAIZ_RELEASE}/dialog--Duz0582.js`]: 'sha256-UMw6DvN3QVXy+/Zsdbyil58/5Wcg1pwDaAyMnm49Jks=',
  [`${RAIZ_RELEASE}/zus-context-bnn0Im3X.js`]: 'sha256-OLLI155Q45J0WTVyay2nQFmpgKvlO8+eRNGeommBB2c=',
  [`${RAIZ_RELEASE}/components-gi4cX3o0.js`]: 'sha256-k4+1QQUE6CEvQOYiMxQG1vBqes7+g8hmmcmNK7Q4888=',
  [`${RAIZ_RELEASE}/trie-Ruj6kykA.js`]: 'sha256-4uQAGriTSu563qZTcLFxq5acyPVUTByKR7I6LjLR+SI=',
};

const ID_SCRIPT = 'jornada-vlibras';
const ELEMENTOS_DO_WIDGET = ['vlibras-access-wrapper', 'vlibras-app-root'];

/** Registra cada módulo já verificado, antes de o widget pedir. */
function preverificarModulos() {
  Object.entries(MODULOS).forEach(([href, integrity]) => {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = href;
    link.integrity = integrity;
    link.crossOrigin = 'anonymous';
    link.dataset.vlibras = '';
    document.head.appendChild(link);
  });
}

function carregar() {
  if (document.getElementById(ID_SCRIPT)) return;
  preverificarModulos();
  const script = document.createElement('script');
  script.id = ID_SCRIPT;
  script.src = URL_CARREGADOR;
  script.integrity = INTEGRIDADE_CARREGADOR;
  script.crossOrigin = 'anonymous';
  script.async = true;
  script.onload = () => {
    try {
      new window.VLibras.Widget({ rootPath: RAIZ_VLIBRAS, position: 'R' });
    } catch {
      /* sem o widget o app segue normal */
    }
  };
  document.body.appendChild(script);
}

/**
 * Desligar esconde em vez de apagar: o carregador do VLibras só monta o botão uma
 * vez por página, então religar sem recarregar precisa do mesmo elemento.
 */
function mostrar(visivel) {
  ELEMENTOS_DO_WIDGET.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !visivel;
    if (!visivel && el.dataset.active) el.dataset.active = 'false';
  });
}

export default function ModoLibras() {
  const { preferencias } = usePreferencias();

  useEffect(() => {
    if (!preferencias.libras) {
      mostrar(false);
      return;
    }
    carregar();
    mostrar(true);
  }, [preferencias.libras]);

  return null;
}
