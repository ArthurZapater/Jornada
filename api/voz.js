// Função da Vercel que transforma o texto da resposta do assistente em voz natural
// (OpenAI, gpt-4o-mini-tts). É o único pedaço de servidor do projeto, e existe só
// para a chave da OpenAI nunca chegar ao navegador: ela vem de OPENAI_API_KEY,
// configurada no painel da Vercel — nunca em arquivo versionado.
//
// LIMITE HONESTO: sem login no servidor, não dá para garantir que só o app chame
// esta rota. As barreiras abaixo (mesma origem, tamanho do texto, limite por IP)
// dificultam o abuso, mas a proteção de verdade contra gasto é o limite de uso
// mensal definido no projeto da OpenAI.

const MODELO = process.env.OPENAI_TTS_MODELO || 'gpt-4o-mini-tts';
const VOZ = process.env.OPENAI_TTS_VOZ || 'marin';
const INSTRUCOES =
  'Fale em português do Brasil, com sotaque brasileiro natural. Tom acolhedor, calmo e claro, ' +
  'como uma atendente de saúde atenciosa. Ritmo de conversa, sem soar como leitura. ' +
  'Leia valores em reais, datas e horários do jeito que um brasileiro fala.';

const MAX_CARACTERES = 1200;
const JANELA_MS = 5 * 60 * 1000;
const MAX_POR_JANELA = 40;
const PRAZO_OPENAI_MS = 20_000;

// Por instância da função: some quando a Vercel recicla a instância. É um freio de
// melhor esforço contra uso em massa, não uma cota rígida.
const pedidosPorIp = new Map();

function excedeuLimite(ip, agora = Date.now()) {
  const recentes = (pedidosPorIp.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  recentes.push(agora);
  pedidosPorIp.set(ip, recentes);
  if (pedidosPorIp.size > 5000) pedidosPorIp.clear();
  return recentes.length > MAX_POR_JANELA;
}

/** Só aceita chamada vinda de página do próprio site. */
function mesmaOrigem(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origem = req.headers.origin;
  if (!host || !origem) return false;
  try {
    return new URL(origem).host === host;
  } catch {
    return false;
  }
}

function responderErro(res, status, codigo) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json({ erro: codigo });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return responderErro(res, 405, 'metodo-nao-permitido');
  }
  if (!mesmaOrigem(req)) return responderErro(res, 403, 'origem-nao-permitida');

  const chave = process.env.OPENAI_API_KEY;
  if (!chave) return responderErro(res, 503, 'voz-natural-desligada');

  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'desconhecido';
  if (excedeuLimite(ip)) {
    res.setHeader('Retry-After', String(Math.ceil(JANELA_MS / 1000)));
    return responderErro(res, 429, 'muitas-requisicoes');
  }

  const texto = typeof req.body?.texto === 'string' ? req.body.texto.replace(/\s+/g, ' ').trim() : '';
  if (!texto || texto.length > MAX_CARACTERES) return responderErro(res, 422, 'texto-invalido');

  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), PRAZO_OPENAI_MS);
  try {
    const resposta = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODELO, voice: VOZ, input: texto, instructions: INSTRUCOES, response_format: 'mp3' }),
      signal: controle.signal,
    });
    if (!resposta.ok) {
      // O corpo do erro da OpenAI não é repassado: pode citar detalhes da conta.
      console.error('voz: OpenAI respondeu', resposta.status);
      return responderErro(res, 502, 'falha-na-voz');
    }
    const audio = Buffer.from(await resposta.arrayBuffer());
    // Resposta de saúde falada: nada de cache em proxy nem no navegador.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(audio);
  } catch {
    // Texto da resposta nunca vai para o log: pode conter dado de saúde.
    console.error('voz: sem resposta da OpenAI');
    return responderErro(res, 504, 'voz-sem-resposta');
  } finally {
    clearTimeout(prazo);
  }
}
