import { useCallback, useEffect, useRef, useState } from 'react';

// Ditado pela Web Speech API — é o navegador que transcreve, o app só recebe texto.
//
// AVISO HONESTO: em boa parte dos navegadores (Chrome e derivados), essa API
// manda o áudio para o serviço de voz do fabricante. Não é processamento local.
// Por isso o microfone só liga quando a pessoa toca no botão, nunca sozinho, e a
// tela diz de onde vem a transcrição. Firefox não implementa a API: nesse caso o
// botão simplesmente não aparece, e digitar continua funcionando.
// Lido na hora de usar, e não uma vez no carregamento do módulo: assim o hook não
// depende da ordem em que o navegador expõe a API — e dá para trocar por um dublê
// em teste.
const obterReconhecimento = () =>
  typeof window === 'undefined' ? null : window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;

const MENSAGENS = {
  'not-allowed': 'Você não autorizou o microfone. Libere nas permissões do navegador para falar.',
  'service-not-allowed': 'Este dispositivo bloqueou o reconhecimento de fala.',
  'no-speech': 'Não ouvi nada. Toque no microfone e fale de novo.',
  'audio-capture': 'Nenhum microfone foi encontrado.',
  network: 'O reconhecimento de fala precisa de internet e não respondeu.',
  aborted: null,
};

/**
 * @param aoTranscrever recebe cada trecho final reconhecido, para a tela acompanhar.
 * @param aoConcluir recebe o ditado inteiro quando a fala termina — é o que dispensa
 *   apertar enviar. Não é chamado se nada foi reconhecido (silêncio, recusa, erro).
 * @returns {{suportado: boolean, ouvindo: boolean, parcial: string, erro: string|null, alternar: () => void}}
 */
export function useReconhecimentoDeFala({ aoTranscrever, aoConcluir }) {
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState('');
  const [erro, setErro] = useState(null);
  const instancia = useRef(null);
  const callback = useRef(aoTranscrever);
  const concluir = useRef(aoConcluir);
  // Guarda o que foi ditado nesta sessão de fala: é ele que vai para o assistente
  // no fim, sem depender do estado do React ter sido aplicado a tempo.
  const ditado = useRef('');

  useEffect(() => {
    callback.current = aoTranscrever;
    concluir.current = aoConcluir;
  }, [aoTranscrever, aoConcluir]);

  useEffect(() => {
    const Reconhecimento = obterReconhecimento();
    if (!Reconhecimento) return undefined;
    const reconhecimento = new Reconhecimento();
    reconhecimento.lang = 'pt-BR';
    reconhecimento.interimResults = true;
    reconhecimento.continuous = false;
    reconhecimento.maxAlternatives = 1;

    reconhecimento.onresult = (evento) => {
      let emAndamento = '';
      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const trecho = evento.results[i][0].transcript;
        if (evento.results[i].isFinal) {
          const limpo = trecho.trim();
          ditado.current = ditado.current ? `${ditado.current} ${limpo}` : limpo;
          callback.current?.(limpo);
        }
        else emAndamento += trecho;
      }
      setParcial(emAndamento);
    };
    reconhecimento.onerror = (evento) => {
      const mensagem = MENSAGENS[evento.error];
      if (mensagem !== null) setErro(mensagem ?? 'Não consegui usar o microfone agora.');
      setOuvindo(false);
    };
    reconhecimento.onend = () => {
      setOuvindo(false);
      setParcial('');
      if (ditado.current) concluir.current?.(ditado.current);
      ditado.current = '';
    };

    instancia.current = reconhecimento;
    return () => {
      reconhecimento.onresult = null;
      reconhecimento.onerror = null;
      reconhecimento.onend = null;
      reconhecimento.abort();
      instancia.current = null;
    };
  }, []);

  const alternar = useCallback(() => {
    const reconhecimento = instancia.current;
    if (!reconhecimento) return;
    if (ouvindo) {
      reconhecimento.stop();
      return;
    }
    setErro(null);
    setParcial('');
    ditado.current = '';
    try {
      reconhecimento.start();
      setOuvindo(true);
    } catch {
      /* start() durante uma sessão que ainda não encerrou: ignora */
    }
  }, [ouvindo]);

  return { suportado: Boolean(obterReconhecimento()), ouvindo, parcial, erro, alternar };
}
