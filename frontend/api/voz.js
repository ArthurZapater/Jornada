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
  'como uma atendente de saúde atenciosa. Ritmo de conversa ágil e fluido, sem pausas longas e sem soar como leitura. ' +
  'Leia valores em reais, datas e horários do jeito que um brasileiro fala.';

// ~65 s de fala: em WAV (ver abaixo) fica em ~3 MB, abaixo do limite de 4,5 MB de resposta da Vercel.
const MAX_CARACTERES = 1000;
const JANELA_MS = 5 * 60 * 1000;
// Cada resposta falada vira de 1 a 4 pedidos (ela é dividida para começar a tocar antes).
const MAX_POR_JANELA = 150;
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

// VOLUME: a voz da OpenAI sai baixa (medido: fala a -20 dBFS de média, picos a -5 dBFS),
// e o Safari do iPhone não deixa o site passar do volume 1 do <audio>. Por isso o
// áudio é pedido em PCM e nivelado aqui: ganho até a média da fala chegar a ALVO_DB,
// com um limitador que olha 5 ms à frente e segura os picos abaixo do TETO, sem
// distorcer. Sai em WAV, que todo navegador toca.
const TAXA = 24_000; // PCM da OpenAI: 24 kHz, 16 bits, mono, little-endian
const ALVO_DB = -10;
const GANHO_MAX = 5; // +14 dB no máximo: não levantar ruído de trecho quase mudo
const TETO = 0.89; // -1 dBFS
const BLOCO = 120; // 5 ms
const SOLTURA = 1 - Math.exp(-BLOCO / (0.08 * TAXA)); // volta do limitador em ~80 ms

export function nivelarVoz(pcm) {
  const total = Math.floor(pcm.length / 2);
  const entrada = new Float32Array(total);
  for (let i = 0; i < total; i += 1) entrada[i] = pcm.readInt16LE(i * 2) / 32768;

  // Média só dos trechos com fala (blocos acima de -40 dBFS), para o silêncio não puxar o ganho.
  let soma = 0;
  let contados = 0;
  for (let i = 0; i + BLOCO <= total; i += BLOCO) {
    let s = 0;
    for (let j = 0; j < BLOCO; j += 1) s += entrada[i + j] * entrada[i + j];
    if (s / BLOCO > 1e-4) {
      soma += s;
      contados += BLOCO;
    }
  }
  const rms = contados ? Math.sqrt(soma / contados) : 0;
  const ganho = rms ? Math.min(GANHO_MAX, 10 ** (ALVO_DB / 20) / rms) : 1;

  // Ganho que cada bloco aguenta sem passar do teto; o envelope pega o menor entre o
  // bloco atual e o seguinte (antecipação), desce na hora e sobe devagar.
  const blocos = Math.ceil(total / BLOCO);
  const permitido = new Float32Array(blocos);
  for (let b = 0; b < blocos; b += 1) {
    let pico = 0;
    for (let i = b * BLOCO; i < Math.min(total, (b + 1) * BLOCO); i += 1) pico = Math.max(pico, Math.abs(entrada[i]));
    permitido[b] = pico * ganho > TETO ? TETO / (pico * ganho) : 1;
  }
  const saida = Buffer.alloc(44 + total * 2);
  let anterior = 1;
  for (let b = 0; b < blocos; b += 1) {
    const alvo = Math.min(permitido[b], permitido[b + 1] ?? 1);
    const envelope = alvo < anterior ? alvo : anterior + (alvo - anterior) * SOLTURA;
    const fim = Math.min(total, (b + 1) * BLOCO);
    for (let i = b * BLOCO; i < fim; i += 1) {
      const t = (i - b * BLOCO) / BLOCO;
      const g = Math.min(anterior + (envelope - anterior) * t, permitido[b]) * ganho;
      const amostra = Math.max(-1, Math.min(1, entrada[i] * g));
      saida.writeInt16LE(Math.round(amostra * 32767), 44 + i * 2);
    }
    anterior = envelope;
  }

  // Cabeçalho WAV (PCM 16 bits mono)
  saida.write('RIFF', 0, 'ascii');
  saida.writeUInt32LE(36 + total * 2, 4);
  saida.write('WAVEfmt ', 8, 'ascii');
  saida.writeUInt32LE(16, 16);
  saida.writeUInt16LE(1, 20);
  saida.writeUInt16LE(1, 22);
  saida.writeUInt32LE(TAXA, 24);
  saida.writeUInt32LE(TAXA * 2, 28);
  saida.writeUInt16LE(2, 32);
  saida.writeUInt16LE(16, 34);
  saida.write('data', 36, 'ascii');
  saida.writeUInt32LE(total * 2, 40);
  return saida;
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
      body: JSON.stringify({ model: MODELO, voice: VOZ, input: texto, instructions: INSTRUCOES, response_format: 'pcm' }),
      signal: controle.signal,
    });
    if (!resposta.ok) {
      // O corpo do erro da OpenAI não é repassado: pode citar detalhes da conta.
      console.error('voz: OpenAI respondeu', resposta.status);
      return responderErro(res, 502, 'falha-na-voz');
    }
    const audio = nivelarVoz(Buffer.from(await resposta.arrayBuffer()));
    // Resposta de saúde falada: nada de cache em proxy nem no navegador.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'audio/wav');
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
