// Localização real do aparelho, usada para ordenar a rede credenciada pela
// distância de verdade.
//
// LGPD: localização é dado pessoal. Por isso ela (1) só é pedida quando o usuário
// clica, nunca ao abrir a tela; (2) fica apenas na memória desta sessão — não vai
// para o localStorage nem para lugar nenhum, porque o cálculo de distância é todo
// feito no próprio aparelho; (3) entra na trilha de auditoria, como as outras
// ações sensíveis. Fechou o app, acabou.
import { registrarEvento } from './segurancaService';

const TEMPO_LIMITE_MS = 10_000;

export class LocalizacaoError extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'LocalizacaoError';
  }
}

const MENSAGENS = {
  1: 'Você não autorizou o acesso à localização. Libere nas permissões do navegador para ver as distâncias reais.',
  2: 'Não foi possível determinar sua posição agora. Verifique se o GPS está ligado.',
  3: 'A localização demorou demais para responder. Tente de novo.',
};

/**
 * Pede a posição atual ao navegador.
 * @returns {Promise<{latitude: number, longitude: number, precisaoM: number}>}
 */
export function obterLocalizacao() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new LocalizacaoError('Este navegador não oferece localização.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        registrarEvento('LOCALIZACAO_USADA');
        resolve({ latitude: coords.latitude, longitude: coords.longitude, precisaoM: Math.round(coords.accuracy) });
      },
      (erro) => reject(new LocalizacaoError(MENSAGENS[erro.code] ?? 'Não foi possível obter sua localização.')),
      { enableHighAccuracy: true, timeout: TEMPO_LIMITE_MS, maximumAge: 60_000 },
    );
  });
}
