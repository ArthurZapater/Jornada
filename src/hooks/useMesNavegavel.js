import { useState } from 'react';

const MESES_A_FRENTE = 2;

/** Estado do mês exibido no calendário, limitado a [mês atual, mês atual + 2]. */
export function useMesNavegavel() {
  const hoje = new Date();
  const [visivel, setVisivel] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const deslocamento = (visivel.ano - hoje.getFullYear()) * 12 + (visivel.mes - hoje.getMonth());

  function mudarMes(delta) {
    setVisivel(({ ano, mes }) => {
      const d = new Date(ano, mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });
  }

  return {
    ano: visivel.ano,
    mes: visivel.mes,
    props: {
      ano: visivel.ano,
      mes: visivel.mes,
      onMudarMes: mudarMes,
      podeVoltar: deslocamento > 0,
      podeAvancar: deslocamento < MESES_A_FRENTE,
    },
  };
}
