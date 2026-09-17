import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import AgendarConsulta from './pages/AgendarConsulta';
import AgendarExame from './pages/AgendarExame';
import Assistente from './pages/Assistente';
import Cadastro from './pages/Cadastro';
import Consultas from './pages/Consultas';
import Encaminhamentos from './pages/Encaminhamentos';
import Exames from './pages/Exames';
import HistoricoPagamentos from './pages/HistoricoPagamentos';
import Home from './pages/Home';
import Login from './pages/Login';
import NaoEncontrado from './pages/NaoEncontrado';
import Notificacoes from './pages/Notificacoes';
import Onboarding from './pages/Onboarding';
import Pagamento from './pages/Pagamento';
import Perfil from './pages/Perfil';
import PlanoDeCuidado from './pages/PlanoDeCuidado';
import RedeCredenciada from './pages/RedeCredenciada';
import ResultadoDetalhe from './pages/ResultadoDetalhe';
import Resultados from './pages/Resultados';
import { ROTA_QUESTIONARIO, RotaProtegida, RotaPublica } from './routes/guards';
import { Carregando } from './components/ui/Feedback';

// Telas visitadas uma vez ou raramente: ficam fora do pacote inicial.
const CompletarPerfil = lazy(() => import('./pages/CompletarPerfil'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Conexoes = lazy(() => import('./pages/Conexoes'));
const PerfilSaude = lazy(() => import('./pages/PerfilSaude'));
const Sobre = lazy(() => import('./pages/Sobre'));
const SalaTeleconsulta = lazy(() => import('./pages/SalaTeleconsulta'));

export default function App() {
  return (
    <Routes>
      <Route element={<RotaPublica />}>
        <Route path="/boas-vindas" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
      </Route>

      <Route element={<RotaProtegida />}>
        {/* Tela cheia, sem menu: o questionário do primeiro acesso vem antes do app. */}
        <Route
          path={ROTA_QUESTIONARIO}
          element={
            <Suspense fallback={<Carregando />}>
              <CompletarPerfil />
            </Suspense>
          }
        />
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="consultas" element={<Consultas />} />
          <Route path="consultas/agendar" element={<AgendarConsulta />} />
          <Route path="consultas/:id/sala" element={<SalaTeleconsulta />} />
          <Route path="exames" element={<Exames />} />
          <Route path="exames/agendar" element={<AgendarExame />} />
          <Route path="resultados" element={<Resultados />} />
          <Route path="resultados/:id" element={<ResultadoDetalhe />} />
          <Route path="encaminhamentos" element={<Encaminhamentos />} />
          <Route path="rede" element={<RedeCredenciada />} />
          <Route path="plano-de-cuidado" element={<PlanoDeCuidado />} />
          <Route path="conexoes" element={<Conexoes />} />
          <Route path="assistente" element={<Assistente />} />
          <Route path="pagamento" element={<Pagamento />} />
          <Route path="pagamento/historico" element={<HistoricoPagamentos />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="perfil/saude" element={<PerfilSaude />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="sobre" element={<Sobre />} />
          <Route path="notificacoes" element={<Notificacoes />} />
          <Route path="*" element={<NaoEncontrado />} />
        </Route>
      </Route>
    </Routes>
  );
}
