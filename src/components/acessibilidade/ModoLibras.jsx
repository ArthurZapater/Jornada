import { useEffect } from 'react';
import { usePreferencias } from '../../contexts/PreferenciasContext';

// Modo Libras: o VLibras Widget, ferramenta oficial do Governo Federal (gov.br, código
// aberto, LGPLv3) que traduz o texto da página para Libras com um intérprete 3D.
// A pessoa toca no botão do VLibras na lateral e depois no texto que quer traduzir.
//
// SEGURANÇA — é o único script de terceiro do app, então ele só é baixado quando a
// pessoa liga o modo em Configurações. O carregador é fixado na release v7.12.2 e
// validado com SRI. O segundo módulo, criado pelo próprio widget ao abrir o botão,
// recebe a mesma proteção antes de ser executado.
// A CSP (vercel.json) libera apenas os caminhos /app/ do vlibras.gov.br e a release
// imutável correspondente no jsDelivr; não há permissão ampla para o CDN.
//   connect     *.vlibras.gov.br (tradução e dicionário);
//   frame       vlibras.gov.br (o avatar roda num iframe dessa origem, isolado do app).
// PRIVACIDADE — o texto que a pessoa manda traduzir vai para o servidor do VLibras.
// Configurações avisa isso antes de ligar.

const RAIZ_VLIBRAS = 'https://vlibras.gov.br/app';
const URL_CARREGADOR = 'https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/vlibras-portal@v7.12.2/app/vlibras-plugin.js';
const URL_MODULO = `${RAIZ_VLIBRAS}/vlibras-plugin-app.js?v=7.12.2`;
const INTEGRIDADE_CARREGADOR = 'sha256-Jnum4rEBEM3Vv7LWvUrTU5hwfSQiL9Atg8EhUJGC5vc=';
const INTEGRIDADE_MODULO = 'sha256-dk77BWgZaEM88eS4ESvMQYNN+1no1DAYH86SPhDCF8Y=';
const ID_SCRIPT = 'jornada-vlibras';
const ELEMENTOS_DO_WIDGET = ['vlibras-access-wrapper', 'vlibras-app-root'];

function protegerModuloDoWidget() {
  const observer = new MutationObserver((mutations) => {
    mutations
      .flatMap((mutation) => [...mutation.addedNodes])
      .filter((node) => node instanceof HTMLScriptElement)
      .filter((script) => script.src === URL_MODULO)
      .forEach((script) => {
        script.integrity = INTEGRIDADE_MODULO;
        script.crossOrigin = 'anonymous';
        observer.disconnect();
      });
  });
  observer.observe(document.body, { childList: true });
  return observer;
}

function carregar() {
  if (document.getElementById(ID_SCRIPT)) return;
  protegerModuloDoWidget();
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
