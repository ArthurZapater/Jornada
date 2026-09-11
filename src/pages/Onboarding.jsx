import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/brand/Logo';
import Button from '../components/ui/Button';
import { CHAVE_ONBOARDING } from '../routes/guards';
import { gravar } from '../utils/storage';

const SLIDES = [
  { titulo: 'Sua saúde em todas as fases da vida.', texto: 'Mais cuidado, mais bem-estar, mais você.' },
  { titulo: 'Tudo em um só lugar.', texto: 'Consultas, exames, resultados e encaminhamentos na palma da mão.' },
  { titulo: 'Cuidado feito para você.', texto: 'Lembretes e recomendações de acordo com o seu momento de vida.' },
  { titulo: 'Seus dados protegidos.', texto: 'Privacidade e segurança em conformidade com a LGPD.' },
];
const INTERVALO_MS = 4500;

export default function Onboarding() {
  const navigate = useNavigate();
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setAtual((i) => (i + 1) % SLIDES.length), INTERVALO_MS);
    return () => clearInterval(timer);
  }, [atual]);

  function comecar() {
    gravar(CHAVE_ONBOARDING, true);
    navigate('/login');
  }

  const slide = SLIDES[atual];

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-8 pt-6">
      <div className="flex justify-end">
        <Link to="/login" onClick={() => gravar(CHAVE_ONBOARDING, true)} className="rounded-full px-3 py-1.5 text-sm font-medium text-petroleo-700 hover:bg-white/60">
          Já tenho conta
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <LogoMark className="h-20 w-20" />
        <h1 className="mt-5 text-5xl font-semibold tracking-tight text-petroleo-800">Jornada</h1>
        <div className="mt-8 min-h-32" aria-live="polite">
          <p key={atual} className="animate-[aparecer_.5s_ease] text-xl leading-snug">
            {slide.titulo}
          </p>
          <p key={`t${atual}`} className="mx-auto mt-6 max-w-64 animate-[aparecer_.6s_ease] text-salvia-600">
            {slide.texto}
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-center gap-2" role="group" aria-label="Páginas de apresentação">
        {SLIDES.map((s, i) => (
          <button
            key={s.titulo}
            type="button"
            onClick={() => setAtual(i)}
            aria-label={`Página ${i + 1} de ${SLIDES.length}`}
            aria-current={i === atual}
            className={`h-2 rounded-full transition-all ${i === atual ? 'w-6 bg-petroleo-800' : 'w-2 bg-salvia-300'}`}
          />
        ))}
      </div>
      <Button tamanho="lg" bloco iconeFim={ArrowRight} onClick={comecar}>
        Começar
      </Button>
    </main>
  );
}
