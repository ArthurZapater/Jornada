import { useCallback, useEffect, useRef, useState } from 'react';

// Voz do assistente pela Web Speech API (speechSynthesis) — o outro lado do ditado.
//
// Na maioria dos aparelhos, quem fala é uma voz instalada no próprio sistema, e o
// texto não sai dali. A exceção honesta: no Chrome, as vozes com "Google" no nome
// são geradas no servidor do Google, e o texto da resposta vai para lá. A voz
// escolhida em Configurações diz qual é o caso ("no aparelho" x "online").
//
// Lido na hora de usar, como no reconhecimento: permite trocar por dublê em teste.
const obterSintese = () => (typeof window === 'undefined' ? null : window.speechSynthesis ?? null);

export const sinteseDisponivel = () => Boolean(obterSintese()) && typeof window.SpeechSynthesisUtterance === 'function';

/** Se o primeiro trecho não começar a tocar nesse prazo, a fala é dada como feita. */
const PRAZO_PARA_COMECAR_MS = 3000;

export function vozesEmPortugues(sintese = obterSintese()) {
  if (!sintese) return [];
  return sintese.getVoices().filter((voz) => voz.lang?.replace('_', '-').toLowerCase().startsWith('pt'));
}

function escolherVoz(vozes, uri) {
  return (
    vozes.find((voz) => voz.voiceURI === uri) ??
    vozes.find((voz) => voz.lang.replace('_', '-').toLowerCase() === 'pt-br') ??
    vozes[0] ??
    null
  );
}

/** O Chrome corta falas longas (~15 s): frases curtas em fila não sofrem o corte. */
function emFrases(texto) {
  return (texto.match(/[^.!?;\n]+[.!?;]*/g) ?? []).map((frase) => frase.trim()).filter(Boolean);
}

/**
 * Safari e iOS só deixam o site falar depois de uma fala iniciada por toque. Chame
 * dentro do clique que abre a conversa: a fala vazia destrava as seguintes.
 */
export function prepararVoz() {
  const sintese = obterSintese();
  if (!sintese || !sinteseDisponivel()) return;
  const silencio = new SpeechSynthesisUtterance(' ');
  silencio.volume = 0;
  sintese.speak(silencio);
}

/**
 * @returns {{suportado: boolean, falando: boolean, vozes: SpeechSynthesisVoice[],
 *   falar: (texto: string) => Promise<boolean>, parar: () => void}}
 *   `falar` resolve `true` quando termina e `false` se foi interrompida.
 */
export function useSinteseDeFala({ vozURI = null, velocidade = 1 } = {}) {
  const [vozes, setVozes] = useState(() => vozesEmPortugues());
  const [falando, setFalando] = useState(false);
  // Cada fala nova invalida a anterior; o que chegar atrasado da antiga é ignorado.
  const rodada = useRef(0);
  const encerrarPendente = useRef(null);

  const parar = useCallback(() => {
    rodada.current += 1;
    encerrarPendente.current?.(false);
    obterSintese()?.cancel();
    setFalando(false);
  }, []);

  useEffect(() => {
    const sintese = obterSintese();
    if (!sintese) return undefined;
    // As vozes chegam depois do carregamento em alguns navegadores.
    const atualizar = () => setVozes(vozesEmPortugues(sintese));
    atualizar();
    sintese.addEventListener?.('voiceschanged', atualizar);
    return () => {
      sintese.removeEventListener?.('voiceschanged', atualizar);
      parar();
    };
  }, [parar]);

  const falar = useCallback(
    (texto) => {
      const sintese = obterSintese();
      const frases = emFrases(texto ?? '');
      if (!sintese || !sinteseDisponivel() || !frases.length) return Promise.resolve(false);

      parar();
      const minha = rodada.current;
      const voz = escolherVoz(vozesEmPortugues(sintese), vozURI);
      setFalando(true);

      return new Promise((resolve) => {
        let resolvida = false;
        let comecou = false;
        const encerrar = (completa) => {
          if (resolvida) return;
          resolvida = true;
          clearTimeout(vigia);
          if (rodada.current === minha) {
            setFalando(false);
            encerrarPendente.current = null;
          }
          resolve(completa);
        };
        encerrarPendente.current = encerrar;
        // Sem voz instalada, alguns navegadores aceitam a fala e nunca a tocam nem
        // avisam erro: a conversa não pode ficar presa esperando.
        const vigia = setTimeout(() => !comecou && encerrar(true), PRAZO_PARA_COMECAR_MS);

        try {
          sintese.resume(); // o Chrome às vezes fica "pausado" depois de uma aba em segundo plano
          frases.forEach((frase, i) => {
            const fala = new SpeechSynthesisUtterance(frase);
            fala.lang = voz?.lang ?? 'pt-BR';
            if (voz) fala.voice = voz;
            fala.rate = velocidade;
            fala.onstart = () => {
              comecou = true;
            };
            fala.onend = () => {
              if (rodada.current !== minha) encerrar(false);
              else if (i === frases.length - 1) encerrar(true);
            };
            fala.onerror = () => encerrar(false);
            sintese.speak(fala);
          });
        } catch {
          // Voz recusada pelo navegador: a resposta já está escrita na tela, a conversa segue.
          encerrar(true);
        }
      });
    },
    [parar, vozURI, velocidade],
  );

  return { suportado: sinteseDisponivel(), falando, vozes, falar, parar };
}
