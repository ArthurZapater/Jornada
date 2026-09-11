const PALETAS = {
  verde: ['#bcd5c6', '#8fb49f', '#dcebe2'],
  lilas: ['#cfd1ee', '#aeb2dd', '#e6e7f6'],
  escuro: ['#ffffff', '#cfe3d7', '#ffffff'],
};

/** Textura orgânica (folhas e curvas em vidro) usada nos cards de destaque. */
export default function LeafArt({ tom = 'verde', className = '' }) {
  const [a, b, c] = PALETAS[tom];
  const opacidade = tom === 'escuro' ? 0.12 : 1;
  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      className={`arte-folha pointer-events-none absolute ${className}`}
      style={{ opacity: opacidade }}
      aria-hidden="true"
    >
      <ellipse cx="250" cy="70" rx="110" ry="70" fill={c} fillOpacity="0.55" />
      <path d="M40 230C120 160 170 70 330 20" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" />
      <path d="M90 240C170 170 220 110 340 90" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" />
      <path d="M205 205c-22-80 28-150 115-175 10 80-30 150-115 175Z" fill={a} fillOpacity="0.6" />
      <path d="M205 205c40-60 75-110 115-175" stroke="#fff" strokeOpacity="0.6" strokeWidth="1" />
      <path d="M255 215c0-60 40-110 90-125-5 60-40 105-90 125Z" fill={b} fillOpacity="0.45" />
      <path d="M150 235c40-60 110-80 180-70" stroke={b} strokeOpacity="0.5" strokeWidth="1" />
    </svg>
  );
}
