import { somenteDigitos } from '../../utils/format';

// Code 39 de verdade: cada caractere são 9 elementos alternando barra/espaço
// (5 barras e 4 espaços), sendo 3 deles largos. O leitor do balcão consegue ler
// da tela — o número codificado é o da carteirinha, que é fictícia.
const PADROES = {
  0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw',
  5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn',
  '*': 'nwnnwnwnn',
};

function elementosDe(valor) {
  const caracteres = `*${somenteDigitos(valor)}*`.split('');
  const elementos = [];
  caracteres.forEach((caractere, indice) => {
    const padrao = PADROES[caractere];
    if (!padrao) return;
    padrao.split('').forEach((largura, posicao) => {
      elementos.push({ barra: posicao % 2 === 0, larga: largura === 'w' });
    });
    // Espaço estreito separando um caractere do outro.
    if (indice < caracteres.length - 1) elementos.push({ barra: false, larga: false });
  });
  return elementos;
}

/** Código de barras do número da carteirinha, para leitura no atendimento. */
export default function CodigoBarras({ valor, className = '' }) {
  return (
    <div className={`flex items-stretch bg-salvia-50 ${className}`} role="img" aria-label={`Código de barras da carteirinha ${valor}`}>
      {elementosDe(valor).map((elemento, indice) => (
        <span
          key={indice}
          style={{ flex: `${elemento.larga ? 3 : 1} 0 0` }}
          className={elemento.barra ? 'bg-petroleo-950' : ''}
        />
      ))}
    </div>
  );
}
