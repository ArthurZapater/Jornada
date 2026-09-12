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

export const reconhecimentoDisponivel = () => Boolean(obterReconhecimento());

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
 * @param aoEncerrarSemFala chamado quando o microfone fecha sem ter ouvido nada —
 *   é a deixa para a conversa por voz pausar em vez de ficar ligando o microfone.
 * @returns {{suportado: boolean, ouvindo: boolean, parcial: string, erro: string|null,
 *   alternar: () => void, iniciar: () => boolean, parar: () => void, cancelar: () => void}}
 *   `parar` encerra e entrega o que já foi dito; `cancelar` descarta.
 */
export function useReconhecimentoDeFala({ aoTranscrever, aoConcluir, aoEncerrarSemFala }) {
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState('');
  const [erro, setErro] = useState(null);
  const instancia = useRef(null);
  const callback = useRef(aoTranscrever);
  const concluir = useRef(aoConcluir);
  const semFala = useRef(aoEncerrarSemFala);
  // Guarda o que foi ditado nesta sessão de fala: é ele que vai para o assistente
  // no fim, sem depender do estado do React ter sido aplicado a tempo.
  const ditado = useRef('');
  // Estado real do microfone, sem esperar render: pedir para ouvir quem já ouve não é erro.
  const aberto = useRef(false);

  useEffect(() => {
    callback.current = aoTranscrever;
    concluir.current = aoConcluir;
    semFala.current = aoEncerrarSemFala;
  }, [aoTranscrever, aoConcluir, aoEncerrarSemFala]);

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
      aberto.current = false;
      setOuvindo(false);
      setParcial('');
      const dito = ditado.current;
      ditado.current = '';
      if (dito) concluir.current?.(dito);
      else semFala.current?.();
    };

    instancia.current = reconhecimento;
    return () => {
      reconhecimento.onresult = null;
      reconhecimento.onerror = null;
      reconhecimento.onend = null;
      reconhecimento.abort();
      aberto.current = false;
      instancia.current = null;
    };
  }, []);

  /** Liga o microfone. Devolve `false` se não deu (sem suporte ou sessão ainda aberta). */
  const iniciar = useCallback(() => {
    const reconhecimento = instancia.current;
    if (!reconhecimento) return false;
    if (aberto.current) return true;
    setErro(null);
    setParcial('');
    ditado.current = '';
    try {
      reconhecimento.start();
      aberto.current = true;
      setOuvindo(true);
      return true;
    } catch {
      /* start() durante uma sessão que ainda não encerrou */
      return false;
    }
  }, []);

  const parar = useCallback(() => instancia.current?.stop(), []);

  const cancelar = useCallback(() => {
    ditado.current = '';
    instancia.current?.abort();
  }, []);

  const alternar = useCallback(() => (ouvindo ? parar() : iniciar()), [ouvindo, parar, iniciar]);

  return { suportado: reconhecimentoDisponivel(), ouvindo, parcial, erro, alternar, iniciar, parar, cancelar };
}
