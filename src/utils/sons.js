// Sons curtos da conversa por voz, sintetizados na hora (Web Audio): nenhum arquivo
// de áudio a baixar e nada que a CSP precise liberar.
//
// O mesmo AudioContext mede o volume da voz do assistente para a bolinha pulsar.
// Navegadores só deixam o contexto tocar depois de um toque do usuário: por isso
// destravarAudio() é chamado dentro do clique que inicia a conversa.

let contexto = null;

export function contextoDeAudio() {
  if (contexto) return contexto;
  const Contexto = typeof window === 'undefined' ? null : window.AudioContext ?? window.webkitAudioContext;
  if (!Contexto) return null;
  contexto = new Contexto();
  return contexto;
}

export function destravarAudio() {
  const ctx = contextoDeAudio();
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
}

const MELODIAS = {
  // Duas notas subindo: "pode falar".
  inicio: [
    [587.33, 0],
    [880, 0.11],
  ],
  // Um toque leve quando o microfone reabre depois da resposta.
  ouvir: [[1046.5, 0]],
  // Duas notas descendo: fim da conversa.
  fim: [
    [880, 0],
    [587.33, 0.11],
  ],
};

export function tocarSom(nome) {
  const ctx = contextoDeAudio();
  const notas = MELODIAS[nome];
  if (!ctx || !notas || ctx.state !== 'running') return;
  const agora = ctx.currentTime;
  notas.forEach(([frequencia, atraso]) => {
    const inicio = agora + atraso;
    const oscilador = ctx.createOscillator();
    const volume = ctx.createGain();
    oscilador.type = 'sine';
    oscilador.frequency.value = frequencia;
    volume.gain.setValueAtTime(0, inicio);
    volume.gain.linearRampToValueAtTime(0.09, inicio + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.22);
    oscilador.connect(volume).connect(ctx.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + 0.24);
  });
}
