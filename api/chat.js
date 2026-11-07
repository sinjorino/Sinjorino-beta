// Servidor do Sinjorino (versão gratuita): guarda as chaves em segredo e conversa com Groq (principal) e Gemini (reserva).
const SYS = 'Você é o Sinjorino, uma rede neural com milhões de neurônios que conversa com elegância, calma e autenticidade. Responda em português do Brasil, de forma clara, direta e concisa, sem markdown pesado.';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEM_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GROQ_CHAT = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'];
const GROQ_FAST = ['llama-3.1-8b-instant', 'openai/gpt-oss-20b'];
const GEM_CHAT = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const GEM_FAST = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];
const first = (envv, list) => [...new Set([envv, ...list].filter(Boolean))];

module.exports = async (req, res) => {
  const GROQ = process.env.GROQ_API_KEY, GEM = process.env.GEMINI_API_KEY;
  const clean = s => String(s || '').slice(0, 4000);
  const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, ''), SB_KEY = process.env.SUPABASE_ANON_KEY;

  // Só deixa conversar quem estiver logado: confere o token no Supabase.
  async function authed() {
    const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!SB_URL || !SB_KEY || !t) return false;
    try {
      const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, authorization: 'Bearer ' + t } });
      return r.ok;
    } catch (e) { return false; }
  }

  // Lista de tentativas: primeiro os modelos do Groq, depois os do Gemini (só dos serviços que têm chave).
  const plan = fast => {
    const p = [];
    if (GROQ) first(process.env.GROQ_MODEL, fast ? GROQ_FAST : GROQ_CHAT).forEach(m => p.push({ prov: 'groq', model: m }));
    if (GEM) first(process.env.GEMINI_MODEL, fast ? GEM_FAST : GEM_CHAT).forEach(m => p.push({ prov: 'gemini', model: m }));
    return p;
  };

  async function call(t, system, messages, max) {
    if (t.prov === 'groq') {
      const body = { model: t.model, max_completion_tokens: max, messages: [{ role: 'system', content: system }, ...messages] };
      if (t.model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
      const r = await fetch(GROQ_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + GROQ }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      const msg = d.choices && d.choices[0] && d.choices[0].message;
      return { ok: r.ok, status: r.status, d, text: ((msg && msg.content) || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim() };
    }
    const r = await fetch(GEM_BASE + encodeURIComponent(t.model) + ':generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': GEM },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: max }
      })
    });
    const d = await r.json().catch(() => ({}));
    const c = d.candidates && d.candidates[0];
    const parts = (c && c.content && c.content.parts) || [];
    return { ok: r.ok, status: r.status, d, text: parts.filter(p => p.text && !p.thought).map(p => p.text).join('') };
  }

  // Tenta cada opção até uma funcionar; guarda o motivo de cada falha.
  async function ask(fast, system, messages, max) {
    const errs = [], t0 = Date.now();
    for (const t of plan(fast)) {
      if (Date.now() - t0 > 8000) break;
      try {
        const r = await call(t, system, messages, max);
        if (r.ok) return { text: r.text, model: t.prov + '/' + t.model };
        errs.push({ modelo: t.prov + '/' + t.model, status: r.status, mensagem: String((r.d.error && r.d.error.message) || 'sem detalhe').slice(0, 220) });
      } catch (e) {
        errs.push({ modelo: t.prov + '/' + t.model, status: 0, mensagem: String(e.message).slice(0, 220) });
      }
    }
    const e = new Error(errs.length ? 'todas as opções falharam' : 'sem chave');
    e.errs = errs;
    throw e;
  }

  if (req.method === 'GET') {
    const info = { status: 'ok', nome: 'Sinjorino', chaves: { groq: !!GROQ, gemini: !!GEM }, supabase: !!(SB_URL && SB_KEY) };
    if ((GROQ || GEM) && new URL(req.url, 'http://x').searchParams.has('testar')) {
      try {
        const r = await ask(false, 'Responda só com a palavra: ok', [{ role: 'user', content: 'teste' }], 200);
        info.teste = { ok: true, modelo: r.model, resposta: r.text.slice(0, 40) };
      } catch (e) {
        info.teste = { ok: false, erros: e.errs || String(e.message) };
      }
    }
    return res.status(200).json(info);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!(await authed())) return res.status(401).json({ error: 'Entre na sua conta para conversar.' });
  if (!GROQ && !GEM) return res.status(500).json({ error: 'Nenhuma chave configurada. Adicione GROQ_API_KEY na Vercel.' });
  const body = req.body || {};

  try {
    if (body.task === 'facts') {
      const r = await ask(
        true,
        'Responda somente com JSON válido, sem texto extra.',
        [{ role: 'user', content: 'Do texto abaixo, extraia no máximo 2 fatos duradouros sobre a pessoa (nome, gostos, projetos, objetivos), em português, como array JSON de strings curtas. Se não houver nenhum, responda []. Texto: ' + clean(body.text) }],
        600
      );
      let facts = [];
      try { facts = JSON.parse(r.text.replace(/```json|```/g, '').trim()); } catch (e) {}
      return res.status(200).json({ facts: Array.isArray(facts) ? facts.slice(0, 2) : [] });
    }

    const msgs = (Array.isArray(body.messages) ? body.messages : [])
      .slice(-14)
      .map(m => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: clean(m && m.content) }))
      .filter(m => m.content);
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    if (!msgs.length) return res.status(400).json({ error: 'Mensagem vazia' });

    const facts = (Array.isArray(body.facts) ? body.facts : []).slice(-40).map(f => String(f).slice(0, 200));
    const system = SYS + (facts.length
      ? ' O que você sabe sobre a pessoa e o que ela te ensinou (use só se for relevante; se a pergunta coincidir com algo ensinado, responda com a resposta ensinada): ' + facts.join('; ') + '.'
      : '');
    const r = await ask(false, system, msgs, 2048);
    return res.status(200).json({ text: r.text || 'Não consegui formular uma resposta. Tente reformular a pergunta.' });
  } catch (e) {
    console.error(JSON.stringify(e.errs || e.message));
    const errs = e.errs || [];
    const temp = s => s === 429 || s === 500 || s === 503 || s === 504 || s === 0;
    if (errs.length && errs.every(x => temp(x.status))) {
      return res.status(503).json({ error: 'O Sinjorino está sem resposta agora: o limite gratuito acabou ou há muita demanda. Tente de novo em alguns minutos.' });
    }
    const real = errs.find(x => !temp(x.status)) || errs[0];
    const detalhe = real ? ' (' + real.modelo + ' · ' + real.status + ': ' + real.mensagem + ')' : '';
    return res.status(500).json({ error: 'Falha ao consultar o modelo' + detalhe });
  }
};
