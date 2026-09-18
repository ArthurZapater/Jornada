import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { TAMANHOS_TEXTO, TIPOS_NOTIFICACAO, VELOCIDADES_VOZ } from '../utils/preferencias';
import { gravar, ler } from '../utils/storage';

// Preferências de interface escolhidas em Configurações. Ficam no dispositivo e,
// como o tema, NÃO são apagadas quando a demonstração se reinicia: não são dado
// do beneficiário, são o jeito de a pessoa usar o app.
const CHAVE = 'jornada:preferencias';

const PADRAO = {
  tamanhoTexto: 'padrao',
  movimento: 'sistema',
  vozNatural: true,
  vozURI: null,
  velocidadeVoz: 1,
  // Desligado por padrão: ligar baixa o VLibras, script de terceiro (ModoLibras.jsx).
  libras: false,
  notificacoes: Object.fromEntries(TIPOS_NOTIFICACAO.map(({ tipo }) => [tipo, true])),
};

/** Aceita só valores conhecidos: o localStorage pode ter sido editado à mão. */
function carregar() {
  const salvo = ler(CHAVE, {}) ?? {};
  const notificacoes = { ...PADRAO.notificacoes };
  TIPOS_NOTIFICACAO.forEach(({ tipo }) => {
    if (typeof salvo.notificacoes?.[tipo] === 'boolean') notificacoes[tipo] = salvo.notificacoes[tipo];
  });
  return {
    tamanhoTexto: TAMANHOS_TEXTO.includes(salvo.tamanhoTexto) ? salvo.tamanhoTexto : PADRAO.tamanhoTexto,
    movimento: salvo.movimento === 'reduzido' ? 'reduzido' : 'sistema',
    vozNatural: salvo.vozNatural !== false,
    vozURI: typeof salvo.vozURI === 'string' ? salvo.vozURI.slice(0, 200) : null,
    velocidadeVoz: VELOCIDADES_VOZ.includes(salvo.velocidadeVoz) ? salvo.velocidadeVoz : PADRAO.velocidadeVoz,
    libras: salvo.libras === true,
    notificacoes,
  };
}

const PreferenciasContext = createContext(null);

export function PreferenciasProvider({ children }) {
  const [preferencias, setPreferencias] = useState(carregar);

  // Tamanho do texto e movimento viram atributos na raiz; o CSS faz o resto
  // (index.css). Antes da pintura, para não piscar no tamanho antigo.
  useLayoutEffect(() => {
    document.documentElement.dataset.texto = preferencias.tamanhoTexto;
    document.documentElement.dataset.movimento = preferencias.movimento;
  }, [preferencias.tamanhoTexto, preferencias.movimento]);

  const alterar = useCallback((parcial) => {
    setPreferencias((atual) => {
      const nova = { ...atual, ...parcial, notificacoes: { ...atual.notificacoes, ...(parcial.notificacoes ?? {}) } };
      gravar(CHAVE, nova);
      return nova;
    });
  }, []);

  const valor = useMemo(() => ({ preferencias, alterar }), [preferencias, alterar]);

  return (
    <PreferenciasContext.Provider value={valor}>
      {/* "user" segue o sistema operacional; "always" é a escolha explícita no app. */}
      <MotionConfig reducedMotion={preferencias.movimento === 'reduzido' ? 'always' : 'user'}>{children}</MotionConfig>
    </PreferenciasContext.Provider>
  );
}

export function usePreferencias() {
  const contexto = useContext(PreferenciasContext);
  if (!contexto) throw new Error('usePreferencias deve ser usado dentro de <PreferenciasProvider>');
  return contexto;
}
