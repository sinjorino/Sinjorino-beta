// Servidor de Mídia do Sinjorino: gera imagens (Cloudflare, Hugging Face, Pollinations) e sons (ElevenLabs, Freesound, Hugging Face).
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
        pollinations: true
      },
      som: {
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        freesound: !!process.env.FREESOUND_API_KEY,
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

    // 3) Pollinations.ai (com chave gratuita se houver, ou fallback público)
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
      error: 'Configure CF_ACCOUNT_ID + CF_API_TOKEN (Cloudflare), HF_TOKEN (Hugging Face) ou POLLINATIONS_API_KEY na Vercel para gerar imagens.',
      erros
    });
  }

  // ====== GERAR / BUSCAR SOM ======
  const erros = [];

  // 1) ElevenLabs Sound Effects (gera SFX ou ambiente por IA em MP3)
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

  // 2) Freesound API v2 (busca som real em MP3)
  if (process.env.FREESOUND_API_KEY) {
    try {
      const r = await fetch(
        `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(prompt)}&fields=id,name,previews&page_size=1&token=${encodeURIComponent(process.env.FREESOUND_API_KEY)}`
      );
      const d = await r.json().catch(() => ({}));
      const item = d.results && d.results[0];
      const mp3 = item && item.previews && (item.previews['preview-hq-mp3'] || item.previews['preview-lq-mp3']);
      if (mp3) {
        return res.status(200).json({ url: mp3, provider: 'freesound', titulo: item.name || prompt });
      }
      erros.push('freesound:sem-resultado');
    } catch (e) { erros.push('freesound:' + e.message); }
  }

  // 3) Hugging Face MusicGen (gera música/áudio por IA)
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
    error: 'Configure ELEVENLABS_API_KEY, FREESOUND_API_KEY ou HF_TOKEN na Vercel para gerar sons externos.',
    erros
  });
};
