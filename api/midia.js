// Servidor de Mídia do Sinjorino: Imagens (Cloudflare, Hugging Face, Pollinations) e Sons (ElevenLabs, Hugging Face).
module.exports = async (req, res) => {
  const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SB_KEY = process.env.SUPABASE_ANON_KEY;

  async function authed() {
    const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!SB_URL || !SB_KEY || !t) return false;
    try {
      const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, authorization: 'Bearer ' + t } });
      return r.ok;
    } catch (e) { return false; }
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      imagem: {
        cloudflare: !!(process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN),
        huggingface: !!process.env.HF_TOKEN,
        pollinations: !!process.env.POLLINATIONS_API_KEY
      },
      som: {
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        huggingface: !!process.env.HF_TOKEN
      }
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!(await authed())) return res.status(401).json({ error: 'Entre na sua conta para gerar imagens e sons.' });

  const body = req.body || {};
  const tipo = body.tipo === 'som' ? 'som' : 'imagem';
  const prompt = String(body.prompt || '').trim().slice(0, 400);
  if (!prompt) return res.status(400).json({ error: 'Descreva o que deseja gerar.' });

  // ====== GERAR IMAGEM ======
  if (tipo === 'imagem') {
    const erros = [];

    // 1) Cloudflare Workers AI (FLUX.1-schnell)
    if (process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN) {
      try {
        const r = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
          {
            method: 'POST',
            headers: { authorization: 'Bearer ' + process.env.CF_API_TOKEN, 'content-type': 'application/json' },
            body: JSON.stringify({ prompt, steps: 4 })
          }
        );
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.result && d.result.image) {
          return res.status(200).json({ url: 'data:image/jpeg;base64,' + d.result.image, provider: 'cloudflare/flux-1-schnell' });
        }
        erros.push('cloudflare:' + r.status);
      } catch (e) { erros.push('cloudflare:' + e.message); }
    }

    // 2) Hugging Face Inference (FLUX.1-schnell)
    if (process.env.HF_TOKEN) {
      try {
        const r = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
          method: 'POST',
          headers: { authorization: 'Bearer ' + process.env.HF_TOKEN, 'content-type': 'application/json', accept: 'image/jpeg' },
          body: JSON.stringify({ inputs: prompt })
        });
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          return res.status(200).json({ url: 'data:image/jpeg;base64,' + buf.toString('base64'), provider: 'huggingface/flux-1-schnell' });
        }
        erros.push('hf:' + r.status);
      } catch (e) { erros.push('hf:' + e.message); }
    }

    // 3) Pollinations.ai
    if (process.env.POLLINATIONS_API_KEY) {
      try {
        const u = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&nologo=true`;
        const r = await fetch(u, { headers: { authorization: 'Bearer ' + process.env.POLLINATIONS_API_KEY } });
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          return res.status(200).json({ url: 'data:image/jpeg;base64,' + buf.toString('base64'), provider: 'pollinations/flux' });
        }
        erros.push('pollinations:' + r.status);
      } catch (e) { erros.push('pollinations:' + e.message); }
    }

    return res.status(502).json({
      error: 'Não foi possível gerar a imagem agora. Confira suas chaves de imagem na Vercel (Cloudflare, Hugging Face ou Pollinations).',
      erros
    });
  }

  // ====== GERAR SOM / ÁUDIO ======
  const erros = [];

  // 1) ElevenLabs Sound Effects
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ text: prompt, duration_seconds: 5, model_id: 'eleven_text_to_sound_v2' })
      });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        return res.status(200).json({ url: 'data:audio/mpeg;base64,' + buf.toString('base64'), provider: 'elevenlabs/sfx', titulo: prompt });
      }
      erros.push('elevenlabs:' + r.status);
    } catch (e) { erros.push('elevenlabs:' + e.message); }
  }

  // 2) Hugging Face MusicGen
  if (process.env.HF_TOKEN) {
    try {
      const r = await fetch('https://router.huggingface.co/hf-inference/models/facebook/musicgen-small', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + process.env.HF_TOKEN, 'content-type': 'application/json' },
        body: JSON.stringify({ inputs: prompt })
      });
      if (r.ok) {
        const ct = r.headers.get('content-type') || 'audio/flac';
        const buf = Buffer.from(await r.arrayBuffer());
        return res.status(200).json({ url: `data:${ct};base64,` + buf.toString('base64'), provider: 'huggingface/musicgen', titulo: prompt });
      }
      erros.push('hf-audio:' + r.status);
    } catch (e) { erros.push('hf-audio:' + e.message); }
  }

  return res.status(502).json({
    error: 'Nenhuma API externa de som respondeu agora.',
    erros
  });
};
