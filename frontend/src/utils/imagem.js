// Preparo da foto de perfil no próprio navegador.
//
// SEGURANÇA: o arquivo escolhido nunca é guardado como veio. Ele é decodificado
// como imagem e redesenhado num canvas — o que sai dali é um JPEG novo. Isso
// (1) descarta os metadados EXIF, inclusive a geolocalização de onde a foto foi
// tirada, que é dado pessoal e não precisa entrar no app; (2) derruba conteúdo
// escondido num arquivo que só finge ser imagem, porque nada do original
// sobrevive ao redesenho; (3) limita o peso do que vai para o armazenamento.
// SVG fica de fora de propósito: aceita script dentro.

/** Formatos aceitos — sem SVG (pode carregar script). */
export const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPT = TIPOS_ACEITOS.join(',');
/** Limite do arquivo original, antes do redimensionamento. */
export const TAMANHO_MAX_MB = 8;
/** Lado do quadrado final, em pixels (2x o maior avatar da interface). */
const LADO = 256;
const QUALIDADE = 0.82;

export class ImagemInvalidaError extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ImagemInvalidaError';
  }
}

/** Decodifica respeitando a orientação EXIF (foto de celular não vira de lado). */
async function decodificar(arquivo) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    } catch {
      /* navegador sem suporte à opção: cai no <img> abaixo */
    }
  }
  const url = URL.createObjectURL(arquivo);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new ImagemInvalidaError('Não foi possível abrir esta imagem.'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Valida, recorta no centro em quadrado e devolve um data URL JPEG de 256px.
 * @throws {ImagemInvalidaError} com mensagem pronta para a tela.
 */
export async function prepararFotoPerfil(arquivo) {
  if (!arquivo) throw new ImagemInvalidaError('Nenhum arquivo selecionado.');
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new ImagemInvalidaError('Formato não aceito. Envie uma imagem JPG, PNG ou WebP.');
  }
  if (arquivo.size > TAMANHO_MAX_MB * 1024 * 1024) {
    throw new ImagemInvalidaError(`Imagem muito grande. O limite é ${TAMANHO_MAX_MB} MB.`);
  }

  let origem;
  try {
    origem = await decodificar(arquivo);
  } catch {
    throw new ImagemInvalidaError('Não foi possível abrir esta imagem. Tente outro arquivo.');
  }

  const largura = origem.width ?? origem.naturalWidth;
  const altura = origem.height ?? origem.naturalHeight;
  if (!largura || !altura) throw new ImagemInvalidaError('Arquivo de imagem inválido.');

  const lado = Math.min(largura, altura);
  const canvas = document.createElement('canvas');
  canvas.width = LADO;
  canvas.height = LADO;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  // Recorte central: o rosto costuma estar no meio do enquadramento.
  ctx.drawImage(origem, (largura - lado) / 2, (altura - lado) / 2, lado, lado, 0, 0, LADO, LADO);
  origem.close?.();

  const dataUrl = canvas.toDataURL('image/jpeg', QUALIDADE);
  if (!dataUrl.startsWith('data:image/jpeg')) throw new ImagemInvalidaError('Não foi possível processar a imagem.');
  return dataUrl;
}
