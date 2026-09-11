import { useState } from 'react';
import { Clock, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import IconTile from '../ui/IconTile';
import { useAuth } from '../../contexts/AuthContext';
import {
  EVENTOS,
  INATIVIDADE_MS,
  MAX_TENTATIVAS,
  apagarDadosLocais,
  listarAuditoria,
} from '../../services/segurancaService';
import { tempoRelativo } from '../../utils/format';

const CORES = {
  ok: 'bg-salvia-100 text-petroleo-800',
  alerta: 'bg-ambar-50 text-ambar-700',
  neutro: 'bg-white/80 text-salvia-600',
};

export default function PainelSeguranca() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [eventos] = useState(() => listarAuditoria().slice(0, 5));
  const [confirmando, setConfirmando] = useState(false);

  function apagar() {
    apagarDadosLocais();
    logout('DADOS_APAGADOS'); // a própria exclusão fica registrada
    navigate('/login', { replace: true });
  }

  return (
    <section className="glass-strong rounded-3xl p-5" aria-labelledby="seguranca">
      <div className="flex items-center gap-3">
        <IconTile icone={ShieldCheck} tamanho="sm" />
        <div>
          <h2 id="seguranca" className="font-semibold">Segurança e privacidade</h2>
          <p className="text-sm text-salvia-600">Seus dados de saúde são tratados conforme a LGPD.</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-center gap-2.5">
          <Clock size={16} className="shrink-0 text-salvia-600" aria-hidden="true" />
          A sessão encerra sozinha após {Math.round(INATIVIDADE_MS / 60000)} minutos sem uso.
        </li>
        <li className="flex items-center gap-2.5">
          <KeyRound size={16} className="shrink-0 text-salvia-600" aria-hidden="true" />
          O acesso é bloqueado temporariamente após {MAX_TENTATIVAS} tentativas incorretas.
        </li>
        <li className="flex items-center gap-2.5">
          <ShieldCheck size={16} className="shrink-0 text-salvia-600" aria-hidden="true" />
          Sua senha é guardada apenas como hash, nunca em texto puro.
        </li>
      </ul>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-salvia-600">
        Atividade recente neste dispositivo
      </h3>
      {eventos.length ? (
        <ul className="mt-2 divide-y divide-salvia-100">
          {eventos.map((evento) => {
            const info = EVENTOS[evento.tipo] ?? { rotulo: evento.tipo, nivel: 'neutro' };
            return (
              <li key={evento.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${CORES[info.nivel]}`}>
                    {info.rotulo}
                  </span>
                  <span className="mt-1 block text-salvia-600">{evento.dispositivo}</span>
                </span>
                <span className="shrink-0 text-xs text-salvia-600">{tempoRelativo(evento.dataHora)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-salvia-600">Nenhum registro ainda.</p>
      )}

      <div className="mt-5 rounded-2xl bg-white/60 p-4 ring-1 ring-white">
        <p className="text-sm">
          <span className="font-medium">Apagar meus dados deste dispositivo</span>
          <span className="block text-salvia-600">
            Remove conta, agendamentos, notificações e registros guardados neste navegador. Não há como desfazer.
          </span>
        </p>
        {confirmando ? (
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button variante="fantasma" tamanho="sm" onClick={() => setConfirmando(false)}>Cancelar</Button>
            <Button variante="perigo" tamanho="sm" icone={Trash2} onClick={apagar}>Sim, apagar tudo</Button>
          </div>
        ) : (
          <Button variante="secundario" tamanho="sm" icone={Trash2} className="mt-3" onClick={() => setConfirmando(true)}>
            Apagar dados
          </Button>
        )}
      </div>
    </section>
  );
}
