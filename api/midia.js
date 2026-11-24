// Servidor de Mídia do Sinjorino: Imagens (Cloudflare FLUX.2/1, Hugging Face, Pollinations) e Sons (ElevenLabs, Hugging Face).
module.exports = async (req, res) => {
  const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SB_KEY = process.env.SUPABASE_ANON_KEY;

  async function fetchT(url, opts, ms) {
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), ms);
    try {
      return await fetch(url, { ...opts, signal: ac.signal });
    } finally {
      clearTimeout(id);
    }
  }

  async function authed() {
    const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!SB_URL || !SB_KEY || !t) return false;
    try {
      const r = await fetchT(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, authorization: 'Bearer ' + t } }, 5000);
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
  const prompt = String(body.prompt || '').trim().slice(0, 500);
  if (!prompt) return res.status(400).json({ error: 'Descreva o que deseja gerar.' });

  // ====== GERAR IMAGEM ======
  if (tipo === 'imagem') {
    const RATIOS = {
      '1:1': [1024, 1024],
      '16:9': [1280, 720],
      '9:16': [720, 1280],
      '4:3': [1152, 864]
    };
    const STYLES = {
      auto: '',
      realista: 'photorealistic, 35mm lens, natural lighting, sharp focus, intricate real-world textures, high dynamic range',
      ilustracao: 'editorial digital illustration, expressive brushwork, rich color harmony, detailed composition',
      '3d': 'stylized 3D octane render, soft studio lighting, subsurface scattering, clean materials, depth of field',
      anime: 'high-detail anime key visual, cel shading, cinematic atmospheric lighting, crisp lineart',
      minimalista: 'minimalist modern graphic design, clean negative space, balanced geometric composition, refined lighting'
    };

    const ratio = RATIOS[body.ratio] ? body.ratio : '1:1';
    const [width, height] = RATIOS[ratio];
    const style = STYLES[body.style] !== undefined ? body.style : 'auto';
    const seed = Number.isFinite(+body.seed) && +body.seed > 0 ? Math.floor(+body.seed) : Math.floor(Math.random() * 9999999) + 1;

    // Aprimora e traduz o prompt para inglês rico (timeout curto de 2.2s para não atrasar)
    async function enhancePrompt(raw) {
      const styleHint = STYLES[style] ? `Apply this visual direction: ${STYLES[style]}.` : '';
      const sys = `You are an expert FLUX image prompt engineer. Rewrite the user's request into a vivid, concise English image prompt (max 90 words). Keep any text meant to appear inside the image in its original language inside quotes. Describe subject, lighting, mood, camera/composition and textures cleanly without buzzwords like "8k, masterpiece". ${styleHint} Output ONLY the final English prompt.`;

      try {
        if (process.env.GROQ_API_KEY) {
          const r = await fetchT('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { authorization: 'Bearer ' + process.env.GROQ_API_KEY, 'content-type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              temperature: 0.55,
              max_tokens: 150,
              messages: [{ role: 'system', content: sys }, { role: 'user', content: raw }]
            })
          }, 2200);
          const d = await r.json().catch(() => ({}));
          const out = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
          if (r.ok && out) return out.trim().replace(/^["']|["']$/g, '');
        }
        if (process.env.GEMINI_API_KEY) {
          const r = await fetchT(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
            {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: sys + '\n\nUser request: ' + raw }] }],
                generationConfig: { temperature: 0.55, maxOutputTokens: 150 }
              })
            },
            2200
          );
          const d = await r.json().catch(() => ({}));
          const out = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0] && d.candidates[0].content.parts[0].text;
          if (r.ok && out) return out.trim().replace(/^["']|["']$/g, '');
        }
        if (process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN) {
          const r = await fetchT(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct-fast`,
            {
              method: 'POST',
              headers: { authorization: 'Bearer ' + process.env.CF_API_TOKEN, 'content-type': 'application/json' },
              body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: raw }], max_tokens: 150 })
            },
            2200
          );
          const d = await r.json().catch(() => ({}));
          const out = d.result && d.result.response;
          if (r.ok && out) return out.trim().replace(/^["']|["']$/g, '');
        }
      } catch (e) {}
      return STYLES[style] ? `${raw}, ${STYLES[style]}` : raw;
    }

    const finalPrompt = body.rawPrompt ? prompt : await enhancePrompt(prompt);
    const erros = [];

    // 1) Cloudflare Workers AI — FLUX.2 Klein 9B (suporta width, height e seed via FormData)
    if (process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN) {
      try {
        const fd = new FormData();
        fd.append('prompt', finalPrompt);
        fd.append('width', String(width));
        fd.append('height', String(height));
        fd.append('seed', String(seed));

        const r = await fetchT(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-2-klein-9b`,
          { method: 'POST', headers: { authorization: 'Bearer ' + process.env.CF_API_TOKEN }, body: fd },
          13000
        );
        const ct = r.headers.get('content-type') || '';
        if (r.ok && ct.startsWith('image/')) {
          const buf = Buffer.from(await r.arrayBuffer());
          return res.status(200).json({ url: `data:${ct};base64,` + buf.toString('base64'), provider: 'cloudflare/flux-2-klein-9b', enhancedPrompt: finalPrompt, seed, ratio, style });
        }
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.result && d.result.image) {
          return res.status(200).json({ url: 'data:image/jpeg;base64,' + d.result.image, provider: 'cloudflare/flux-2-klein-9b', enhancedPrompt: finalPrompt, seed, ratio, style });
        }
        erros.push('cf-flux2:' + r.status);
      } catch (e) { erros.push('cf-flux2:' + e.message); }

      // Fallback rápido na própria Cloudflare: FLUX.1-schnell com 8 steps
      try {
        const r = await fetchT(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
          {
            method: 'POST',
            headers: { authorization: 'Bearer ' + process.env.CF_API_TOKEN, 'content-type': 'application/json' },
            body: JSON.stringify({ prompt: finalPrompt, steps: 8 })
          },
          11000
        );
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.result && d.result.image) {
          return res.status(200).json({ url: 'data:image/jpeg;base64,' + d.result.image, provider: 'cloudflare/flux-1-schnell', enhancedPrompt: finalPrompt, seed, ratio: '1:1', style });
        }
        erros.push('cf-flux1:' + r.status);
      } catch (e) { erros.push('cf-flux1:' + e.message); }
    }

    // 2) Hugging Face Inference (FLUX.1-schnell com parâmetros)
    if (process.env.HF_TOKEN) {
      try {
        const r = await fetchT(
          'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
          {
            method: 'POST',
            headers: { authorization: 'Bearer ' + process.env.HF_TOKEN, 'content-type': 'application/json', accept: 'image/jpeg' },
            body: JSON.stringify({ inputs: finalPrompt, parameters: { width, height, num_inference_steps: 6, seed } })
          },
          13000
        );
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          return res.status(200).json({ url: 'data:image/jpeg;base64,' + buf.toString('base64'), provider: 'huggingface/flux-1-schnell', enhancedPrompt: finalPrompt, seed, ratio, style });
        }
        erros.push('hf:' + r.status);
      } catch (e) { erros.push('hf:' + e.message); }
    }

    // 3) Pollinations.ai
    if (process.env.POLLINATIONS_API_KEY) {
      try {
        const u = `https://gen.pollinations.ai/image/${encodeURIComponent(finalPrompt)}?model=flux&width=${width}&height=${height}&seed=${seed}&enhance=false&nologo=true`;
        const r = await fetchT(u, { headers: { authorization: 'Bearer ' + process.env.POLLINATIONS_API_KEY } }, 13000);
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          return res.status(200).json({ url: 'data:image/jpeg;base64,' + buf.toString('base64'), provider: 'pollinations/flux', enhancedPrompt: finalPrompt, seed, ratio, style });
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

  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const r = await fetchT('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ text: prompt, duration_seconds: 5, model_id: 'eleven_text_to_sound_v2' })
      }, 15000);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        return res.status(200).json({ url: 'data:audio/mpeg;base64,' + buf.toString('base64'), provider: 'elevenlabs/sfx', titulo: prompt });
      }
      erros.push('elevenlabs:' + r.status);
    } catch (e) { erros.push('elevenlabs:' + e.message); }
  }

  if (process.env.HF_TOKEN) {
    try {
      const r = await fetchT('https://router.huggingface.co/hf-inference/models/facebook/musicgen-small', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + process.env.HF_TOKEN, 'content-type': 'application/json' },
        body: JSON.stringify({ inputs: prompt })
      }, 15000);
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
