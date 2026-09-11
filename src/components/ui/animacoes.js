// Presets de movimento no espírito das interfaces da Apple: nada de duração fixa
// com curva — tudo por física de mola, que responde à interação em vez de tocar
// uma animação pronta. Centralizar aqui mantém o mesmo "peso" no app inteiro.
//
// Acessibilidade: <MotionConfig reducedMotion="user"> em main.jsx faz o Motion
// respeitar "reduzir movimento" do sistema, sem precisar tratar caso a caso.

/** Resposta rápida: toques, pílula de navegação, bolhas de chat. */
export const MOLA = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 };

/** Movimento amplo: troca de página, entrada de listas. */
export const MOLA_SUAVE = { type: 'spring', stiffness: 240, damping: 30 };

export const transicaoPagina = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: MOLA_SUAVE,
};

/** No pai: encadeia a entrada dos filhos em cascata. */
export const grupoEscalonado = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};

export const itemEntrada = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: MOLA_SUAVE },
};

export const bolhaChat = {
  initial: { opacity: 0, y: 8, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: MOLA,
};

/** Afundar levemente ao toque, como nos cards do iOS. */
export const AO_TOCAR = { scale: 0.97 };
