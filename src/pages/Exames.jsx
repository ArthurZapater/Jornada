import { ArrowRight, CalendarDays, ClipboardList, Clock, FileText, FlaskConical, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NotaResultados } from '../components/exame/ResultadosCompartilhados';
import Button from '../components/ui/Button';
import { ConteudoAssincrono, Vazio } from '../components/ui/Feedback';
import IconTile from '../components/ui/IconTile';
import PageHeader from '../components/ui/PageHeader';
import SecurityNote from '../components/ui/SecurityNote';
import ServiceHero from '../components/ui/ServiceHero';
import TopicList from '../components/ui/TopicList';
import { useAsync } from '../hooks/useAsync';
import { listarExamesAgendados } from '../services/agendamentoService';
import { obterCompartilhamento } from '../services/compartilhamentoService';
import { formatarDataLonga, formatarHora } from '../utils/format';

const TOPICOS = [
  { icone: CalendarDays, titulo: 'Agendar exame', descricao: 'Encontre o exame ideal para você.', to: '/exames/agendar' },
  { icone: FileText, titulo: 'Resultados online', descricao: 'Acesse seus resultados com segurança.', to: '/resultados' },
  { icone: ClipboardList, titulo: 'Acompanhamento', descricao: 'Acompanhe seus exames e histórico.', to: '/resultados' },
];

export default function Exames() {
  const agendados = useAsync(listarExamesAgendados, []);
  const compartilhamento = useAsync(obterCompartilhamento, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Exames" subtitulo="Agende, prepare-se e acompanhe seus exames." compartilhar />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <ServiceHero icone={FlaskConical} titulo="Exames" descricao="Resultados com agilidade e segurança." tom="lilas" />
          <TopicList itens={TOPICOS} tom="lilas" />
          <div className="flex items-center gap-4 rounded-3xl bg-lilas-100/80 p-4 ring-1 ring-borda/80">
            <IconTile icone={Clock} tom="vidro" tamanho="sm" className="text-lilas-600" />
            <p className="text-sm">
              <span className="block font-medium">Agilidade no seu cuidado</span>
              <span className="text-salvia-600">Exames com tecnologia de ponta e equipe especializada.</span>
            </p>
          </div>
        </div>

        <section aria-labelledby="exames-agendados" className="space-y-4 lg:glass lg:rounded-[2rem] lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="exames-agendados" className="text-xl font-semibold">Exames agendados</h2>
            <Link to="/resultados" className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-acento hover:bg-superficie/60">
              Ver resultados <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ConteudoAssincrono
            estado={agendados}
            vazio={<Vazio icone={FlaskConical} titulo="Nenhum exame agendado" descricao="Quando você agendar, ele aparece aqui com as orientações de preparo." />}
          >
            {(lista) => (
              <ul className="space-y-3">
                {lista.map((exame) => (
                  <li key={exame.id} className="rounded-3xl bg-superficie/75 p-4 ring-1 ring-borda">
                    <div className="flex items-start gap-4">
                      <IconTile icone={FlaskConical} tom="lilas" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{exame.tipoExame.nome}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm">
                          <CalendarDays size={14} className="shrink-0 text-salvia-600" aria-hidden="true" />
                          <span className="first-letter:uppercase">{formatarDataLonga(exame.dataAgendada)}</span> · {formatarHora(exame.dataAgendada)}
                        </p>
                        <p className="flex items-center gap-1.5 text-sm">
                          <MapPin size={14} className="shrink-0 text-salvia-600" aria-hidden="true" />
                          {exame.unidade.nome}
                        </p>
                        <p className="mt-2 rounded-2xl bg-lilas-100/70 px-3 py-2 text-sm">
                          <span className="font-medium">Preparo:</span> {exame.tipoExame.preparo}
                        </p>
                        <NotaResultados compartilhamento={compartilhamento.dados} tipo="EXAME" referenciaId={exame.id} className="mt-2" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ConteudoAssincrono>
          <Button as={Link} to="/exames/agendar" bloco tamanho="lg" iconeFim={ArrowRight}>
            Agendar exame
          </Button>
          <SecurityNote />
        </section>
      </div>
    </div>
  );
}
