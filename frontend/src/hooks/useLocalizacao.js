import { useCallback, useState } from 'react';
import { obterLocalizacao } from '../services/localizacaoService';
import { LOCALIZACAO_USUARIO } from '../services/mockDb';

/**
 * Origem das distâncias da rede: começa na posição de demonstração e passa para a
 * real quando o usuário autoriza. A posição fica só neste estado de React — some
 * ao recarregar a página, de propósito.
 */
export function useLocalizacao() {
  const [posicao, setPosicao] = useState(LOCALIZACAO_USUARIO);
  const [real, setReal] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState(null);

  const usarLocalizacaoReal = useCallback(async () => {
    setBuscando(true);
    setErro(null);
    try {
      const atual = await obterLocalizacao();
      setPosicao(atual);
      setReal(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setBuscando(false);
    }
  }, []);

  const voltarParaSimulada = useCallback(() => {
    setPosicao(LOCALIZACAO_USUARIO);
    setReal(false);
    setErro(null);
  }, []);

  return { posicao, real, buscando, erro, usarLocalizacaoReal, voltarParaSimulada };
}
