import { useEffect } from 'react';
import { usePreferencias } from '../../contexts/PreferenciasContext';

// Modo Libras: o VLibras Widget, ferramenta oficial do Governo Federal (gov.br, código
// aberto, LGPLv3) que traduz o texto da página para Libras com um intérprete 3D.
// A pessoa toca no botão do VLibras na lateral e depois no texto que quer traduzir.
//
// SEGURANÇA — é o único script de terceiro do app, então ele só é baixado quando a
// pessoa liga o modo em Configurações. A CSP (vercel.json) libera só o que ele usa:
//   script/img  vlibras.gov.br e cdn.jsdelivr.net/gh/spbgovbr-vlibras/ (o próprio
//               governo redireciona para lá); o caminho /gh/spbgovbr-vlibras/ barra
//               o resto do jsDelivr — inclusive a telemetria (PostHog) que o widget
//               tenta importar de /npm/, e o host dela, que fica fora de connect-src;
//   connect     *.vlibras.gov.br (tradução e dicionário);
//   frame       vlibras.gov.br (o avatar roda num iframe dessa origem, isolado do app).
// PRIVACIDADE — o texto que a pessoa manda traduzir vai para o servidor do VLibras.
// Configurações avisa isso antes de ligar.

const RAIZ_VLIBRAS = 'https://vlibras.gov.br/app';
const ID_SCRIPT = 'jornada-vlibras';
const ELEMENTOS_DO_WIDGET = ['vlibras-access-wrapper', 'vlibras-app-root'];

function carregar() {
  if (document.getElementById(ID_SCRIPT)) return;
  const script = document.createElement('script');
  script.id = ID_SCRIPT;
  script.src = `${RAIZ_VLIBRAS}/vlibras-plugin.js`;
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
