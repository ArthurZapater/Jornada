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
import { RotaProtegida, RotaPublica } from './routes/guards';

export default function App() {
  return (
    <Routes>
      <Route element={<RotaPublica />}>
        <Route path="/boas-vindas" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
      </Route>

      <Route element={<RotaProtegida />}>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="consultas" element={<Consultas />} />
          <Route path="consultas/agendar" element={<AgendarConsulta />} />
          <Route path="exames" element={<Exames />} />
          <Route path="exames/agendar" element={<AgendarExame />} />
          <Route path="resultados" element={<Resultados />} />
          <Route path="resultados/:id" element={<ResultadoDetalhe />} />
          <Route path="encaminhamentos" element={<Encaminhamentos />} />
          <Route path="rede" element={<RedeCredenciada />} />
          <Route path="plano-de-cuidado" element={<PlanoDeCuidado />} />
          <Route path="assistente" element={<Assistente />} />
          <Route path="pagamento" element={<Pagamento />} />
          <Route path="pagamento/historico" element={<HistoricoPagamentos />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="notificacoes" element={<Notificacoes />} />
          <Route path="*" element={<NaoEncontrado />} />
        </Route>
      </Route>
    </Routes>
  );
}
