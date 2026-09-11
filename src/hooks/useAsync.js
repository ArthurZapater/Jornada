import { useCallback, useEffect, useState } from 'react';

/**
 * Executa uma função assíncrona quando `deps` mudam.
 * Mantém os dados anteriores enquanto recarrega (evita "piscar" em buscas).
 */
export function useAsync(funcao, deps = []) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }));
    Promise.resolve()
      .then(funcao)
      .then(
        (dados) => ativo && setEstado({ dados, carregando: false, erro: null }),
        (erro) => ativo && setEstado((atual) => ({ ...atual, carregando: false, erro })),
      );
    return () => {
      ativo = false;
    };
    // `funcao` é recriada a cada render; quem decide quando recarregar são as deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { ...estado, recarregar };
}
