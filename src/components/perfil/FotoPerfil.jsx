import { useId, useState } from 'react';
import { Camera, LoaderCircle, Trash2 } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { atualizarFoto, removerFoto } from '../../services/beneficiarioService';
import { ACCEPT, TAMANHO_MAX_MB, prepararFotoPerfil } from '../../utils/imagem';

/** Avatar do perfil com envio, troca e remoção da foto. */
export default function FotoPerfil({ nome, fotoInicial, children }) {
  const { sincronizarUsuario } = useAuth();
  const [foto, setFoto] = useState(fotoInicial ?? null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(null);
  const idInput = useId();

  async function aplicar(executar) {
    setErro(null);
    setOcupado(true);
    try {
      const perfil = await executar();
      setFoto(perfil.fotoUrl);
      sincronizarUsuario();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  function aoEscolher(evento) {
    const arquivo = evento.target.files?.[0];
    // Zera o campo para o mesmo arquivo poder ser escolhido de novo depois de um erro.
    evento.target.value = '';
    if (!arquivo) return;
    aplicar(async () => atualizarFoto(await prepararFotoPerfil(arquivo)));
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Avatar nome={nome} foto={foto} tamanho="lg" />
        <input
          id={idInput}
          type="file"
          accept={ACCEPT}
          onChange={aoEscolher}
          disabled={ocupado}
          className="peer sr-only"
        />
        <label
          htmlFor={idInput}
          className="absolute -bottom-1 -right-1 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-petroleo-800 text-white ring-2 ring-superficie transition hover:bg-petroleo-700 peer-focus-visible:ring-4 peer-focus-visible:ring-petroleo-500 peer-disabled:cursor-wait peer-disabled:opacity-70"
        >
          {ocupado ? (
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Camera size={16} aria-hidden="true" />
          )}
          <span className="sr-only">{foto ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}</span>
        </label>
      </div>

      {children}

      {erro ? (
        <p role="alert" className="mt-3 text-xs font-medium text-alerta-600">{erro}</p>
      ) : foto ? (
        <button
          type="button"
          onClick={() => aplicar(removerFoto)}
          disabled={ocupado}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-salvia-600 transition hover:bg-superficie/70 hover:text-alerta-600 disabled:opacity-50"
        >
          <Trash2 size={14} aria-hidden="true" /> Remover foto
        </button>
      ) : (
        <p className="mt-3 text-[11px] text-salvia-600">
          Toque na câmera para usar uma foto sua. JPG, PNG ou WebP, até {TAMANHO_MAX_MB} MB.
        </p>
      )}
    </div>
  );
}
