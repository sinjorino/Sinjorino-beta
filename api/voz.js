// Voz do Sinjorino: transforma texto em fala com o Gemini TTS (4 vozes: 2 femininas e 2 masculinas).
const VOZES = { 1: 'Kore', 2: 'Aoede', 3: 'Charon', 4: 'Puck' };
const MODELOS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-lite-tts'];

function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

module.exports = async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, ''), SB_KEY = process.env.SUPABASE_ANON_KEY;

  async function authed() {
    const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!SB_URL || !SB_KEY || !t) return false;
    try {
      const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, authorization: 'Bearer ' + t } });
      return r.ok;
    } catch (e) { return false; }
  }

  // Tenta cada modelo de voz até um funcionar (os nomes mudam com frequência).
  async function falar(texto, voz) {
    const nome = process.env['VOZ' + voz] || VOZES[voz];
    const lista = [...new Set([process.env.TTS_MODEL, ...MODELOS].filter(Boolean))];
    const erros = [];
    for (const modelo of lista) {
      try {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelo) + ':generateContent', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: texto }] }],
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: nome } } } }
          })
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { erros.push({ modelo, status: r.status, mensagem: String((d.error && d.error.message) || 'sem detalhe').slice(0, 200) }); continue; }
        const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
        const inl = parts.find(x => x.inlineData && x.inlineData.data);
        if (!inl) { erros.push({ modelo, status: 200, mensagem: 'a resposta veio sem áudio' }); continue; }
        const m = /rate=(\d+)/.exec(inl.inlineData.mimeType || '');
        return { audio: wav(Buffer.from(inl.inlineData.data, 'base64'), m ? +m[1] : 24000), modelo };
      } catch (e) { erros.push({ modelo, status: 0, mensagem: String(e.message).slice(0, 200) }); }
    }
    const e = new Error('sem voz'); e.erros = erros; throw e;
  }

  if (req.method === 'GET') {
    const info = { status: 'ok', chave_gemini: !!key, vozes: VOZES };
    if (key && new URL(req.url, 'http://x').searchParams.has('testar')) {
      try { const r = await falar('Teste.', 1); info.teste = { ok: true, modelo: r.modelo, bytes: r.audio.length }; }
      catch (e) { info.teste = { ok: false, erros: e.erros || String(e.message) }; }
    }
    return res.status(200).json(info);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!(await authed())) return res.status(401).json({ error: 'Entre na sua conta para usar a voz.' });
  if (!key) return res.status(500).json({ error: 'Chave do Gemini não configurada' });

  const body = req.body || {};
  const texto = String(body.text || '').trim().slice(0, 600);
  const voz = [1, 2, 3, 4].includes(+body.voz) ? +body.voz : 1;
  if (!texto) return res.status(400).json({ error: 'Texto vazio' });
  try {
    const r = await falar(texto, voz);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(r.audio);
  } catch (e) {
    console.error(JSON.stringify(e.erros || e.message));
    return res.status(502).json({ error: 'Voz indisponível agora', erros: e.erros });
  }
};
