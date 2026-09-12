import { useCallback, useEffect, useRef, useState } from 'react';

// Ditado pela Web Speech API — é o navegador que transcreve, o app só recebe texto.
//
// AVISO HONESTO: em boa parte dos navegadores (Chrome e derivados), essa API
// manda o áudio para o serviço de voz do fabricante. Não é processamento local.
// Por isso o microfone só liga quando a pessoa toca no botão, nunca sozinho, e a
// tela diz de onde vem a transcrição. Firefox não implementa a API: nesse caso o
// botão simplesmente não aparece, e digitar continua funcionando.
const Reconhecimento =
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
 * @param aoTranscrever recebe cada trecho final reconhecido.
 * @returns {{suportado: boolean, ouvindo: boolean, parcial: string, erro: string|null, alternar: () => void}}
 */
export function useReconhecimentoDeFala({ aoTranscrever }) {
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState('');
  const [erro, setErro] = useState(null);
  const instancia = useRef(null);
  const callback = useRef(aoTranscrever);

  useEffect(() => {
    callback.current = aoTranscrever;
  }, [aoTranscrever]);

  useEffect(() => {
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
        if (evento.results[i].isFinal) callback.current?.(trecho.trim());
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
    try {
      reconhecimento.start();
      setOuvindo(true);
    } catch {
      /* start() durante uma sessão que ainda não encerrou: ignora */
    }
  }, [ouvindo]);

  return { suportado: Boolean(Reconhecimento), ouvindo, parcial, erro, alternar };
}
