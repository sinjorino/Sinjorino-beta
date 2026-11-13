// Servidor do Sinjorino: contexto prolongado, tom personalizado, fontes externas (URL + Google Search) e detecção de ambiguidade.
const BASE_SYS = 'Você é o Sinjorino, uma rede neural com milhões de neurônios que conversa com elegância, calma e autenticidade. Responda em português do Brasil, de forma clara e sem markdown pesado.';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEM_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GROQ_CHAT = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'];
const GROQ_FAST = ['llama-3.1-8b-instant', 'openai/gpt-oss-20b'];
const GEM_CHAT = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];
const GEM_FAST = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];
const first = (envv, list) => [...new Set([envv, ...list].filter(Boolean))];

const TONES = {
  equilibrado: 'Mantenha tom equilibrado, elegante, calmo e natural.',
  direto: 'Seja extremamente direto, técnico e objetivo; vá direto ao ponto sem rodeios.',
  didatico: 'Seja amigável, paciente e didático, explicando passo a passo com analogias simples.',
  criativo: 'Use linguagem criativa, expressiva e inspiradora, mantendo precisão nas ideias.',
  formal: 'Adote tom formal, executivo, polido e bem estruturado.'
};

// Proteção simples contra SSRF ao buscar URLs externas.
function isSafeUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (
      h === 'localhost' ||
      h.endsWith('.local') ||
      h.endsWith('.internal') ||
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^169\.254\./.test(h) ||
      /^0\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      h === '::1' ||
      h.startsWith('[::1]')
    ) return false;
    return true;
  } catch (e) { return false; }
}

async function fetchUrlText(url) {
  if (!isSafeUrl(url)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3200);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'SinjorinoBot/1.0 (+https://vercel.app)', accept: 'text/html,text/plain,application/json' }
    });
    if (!r.ok) return null;
    const ct = String(r.headers.get('content-type') || '').toLowerCase();
    if (!/(text\/|json|xml)/.test(ct)) return null;
    const raw = (await r.text()).slice(0, 140000);
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 120) : url;
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3200);
    return text ? { url, title, text } : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  const GROQ = process.env.GROQ_API_KEY, GEM = process.env.GEMINI_API_KEY;
  const clean = s => String(s || '').slice(0, 6000);
  const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, ''), SB_KEY = process.env.SUPABASE_ANON_KEY;

  async function authed() {
    const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!SB_URL || !SB_KEY || !t) return false;
    try {
      const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, authorization: 'Bearer ' + t } });
      return r.ok;
    } catch (e) { return false; }
  }

  const plan = (fast, preferGemini) => {
    const p = [];
    const addGroq = () => GROQ && first(process.env.GROQ_MODEL, fast ? GROQ_FAST : GROQ_CHAT).forEach(m => p.push({ prov: 'groq', model: m }));
    const addGem = () => GEM && first(process.env.GEMINI_MODEL, fast ? GEM_FAST : GEM_CHAT).forEach(m => p.push({ prov: 'gemini', model: m }));
    if (preferGemini) { addGem(); addGroq(); } else { addGroq(); addGem(); }
    return p;
  };

  async function call(t, system, messages, max, useWeb) {
    if (t.prov === 'groq') {
      const body = { model: t.model, max_completion_tokens: max, messages: [{ role: 'system', content: system }, ...messages] };
      if (t.model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
      const r = await fetch(GROQ_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + GROQ }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      const msg = d.choices && d.choices[0] && d.choices[0].message;
      return { ok: r.ok, status: r.status, d, text: ((msg && msg.content) || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim(), sources: [] };
    }

    const gemBody = {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: max }
    };
    if (useWeb) gemBody.tools = [{ google_search: {} }];

    const r = await fetch(GEM_BASE + encodeURIComponent(t.model) + ':generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': GEM },
      body: JSON.stringify(gemBody)
    });
    const d = await r.json().catch(() => ({}));
    const c = d.candidates && d.candidates[0];
    const parts = (c && c.content && c.content.parts) || [];
    const chunks = (c && c.groundingMetadata && c.groundingMetadata.groundingChunks) || [];
    const sources = [];
    const seen = new Set();
    for (const ch of chunks) {
      const uri = ch && ch.web && ch.web.uri;
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        sources.push({ title: (ch.web.title || uri).slice(0, 80), url: uri });
      }
    }
    return {
      ok: r.ok,
      status: r.status,
      d,
      text: parts.filter(p => p.text && !p.thought).map(p => p.text).join(''),
      sources: sources.slice(0, 5)
    };
  }

  async function ask(fast, system, messages, max, opts = {}) {
    const errs = [], t0 = Date.now(), useWeb = !!opts.useWeb;
    for (const t of plan(fast, useWeb)) {
      if (Date.now() - t0 > 12000) break;
      try {
        const r = await call(t, system, messages, max, useWeb && t.prov === 'gemini');
        if (r.ok) return { text: r.text, model: t.prov + '/' + t.model, sources: r.sources || [] };
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
    const info = {
      status: 'ok',
      nome: 'Sinjorino',
      chaves: { groq: !!GROQ, gemini: !!GEM },
      supabase: !!(SB_URL && SB_KEY),
      recursos: ['contexto-prolongado', 'tom', 'fontes-externas', 'ambiguidade']
    };
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

    const rawMsgs = (Array.isArray(body.messages) ? body.messages : [])
      .slice(-60)
      .map(m => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: clean(m && m.content) }))
      .filter(m => m.content);
    while (rawMsgs.length && rawMsgs[0].role !== 'user') rawMsgs.shift();
    if (!rawMsgs.length) return res.status(400).json({ error: 'Mensagem vazia' });

    // 1. Contexto prolongado: mantém as 16 mais recentes intactas e compacta as anteriores em resumo.
    let summary = typeof body.summary === 'string' ? body.summary.slice(0, 1400) : '';
    let msgs = rawMsgs;
    if (rawMsgs.length > 18) {
      const older = rawMsgs.slice(0, -16);
      msgs = rawMsgs.slice(-16);
      if (!summary || rawMsgs.length % 8 === 0) {
        try {
          const transcript = older.map(m => (m.role === 'user' ? 'Pessoa: ' : 'Sinjorino: ') + m.content.slice(0, 350)).join('\n').slice(0, 7000);
          const sr = await ask(
            true,
            'Resuma de forma objetiva os principais tópicos, decisões, nomes e contexto da conversa abaixo em no máximo 5 linhas em português.',
            [{ role: 'user', content: (summary ? 'Resumo anterior: ' + summary + '\n\nNovas mensagens:\n' : '') + transcript }],
            320
          );
          if (sr.text) summary = sr.text.trim().slice(0, 1400);
        } catch (e) {}
      }
    }

    // 2. Fontes externas: lê URLs coladas na última mensagem + decide se ativa busca na web.
    const lastUser = msgs[msgs.length - 1].content;
    const urls = [...new Set((lastUser.match(/https?:\/\/[^\s<>)"']+/gi) || []).slice(0, 2))];
    const fetchedDocs = (await Promise.all(urls.map(fetchUrlText))).filter(Boolean);
    const wantsAutoWeb = /\b(pesquise|busque na web|na internet|not[ií]cias|hoje|atual|cota[cç][aã]o|pre[cç]o atual|tempo real|lan[cç]amento recente|2025|2026)\b/i.test(lastUser);
    const useWeb = Boolean((body.web || wantsAutoWeb) && GEM);

    // 3. Personalização de tom.
    const toneKey = TONES[body.tone] ? body.tone : 'equilibrado';
    const toneNote = typeof body.toneNote === 'string' ? body.toneNote.trim().slice(0, 300) : '';

    // 4. Montagem do System Prompt completo (memórias + resumo prolongado + tom + fontes + ambiguidade).
    const facts = (Array.isArray(body.facts) ? body.facts : []).slice(-40).map(f => String(f).slice(0, 200));
    const sysParts = [BASE_SYS, TONES[toneKey]];
    if (toneNote) sysParts.push('Instrução personalizada do usuário: ' + toneNote);
    if (facts.length) {
      sysParts.push('O que você sabe sobre a pessoa e o que ela te ensinou (use só se for relevante; se coincidir com algo ensinado, use a resposta ensinada): ' + facts.join('; ') + '.');
    }
    if (summary) sysParts.push('Resumo do contexto anterior desta conversa: ' + summary);
    if (fetchedDocs.length) {
      sysParts.push(
        'Conteúdo extraído de fontes externas citadas pelo usuário (baseie sua resposta nestas fontes quando pertinente):\n' +
        fetchedDocs.map(d => `[Fonte: ${d.title} (${d.url})]\n${d.text}`).join('\n\n')
      );
    }
    if (body.voice) {
      sysParts.push('Modo de voz ativo: responda em até 3 frases curtas, em linguagem de conversa, sem listas, símbolos, links nem emojis.');
    } else {
      sysParts.push(
        'Detecção de ambiguidade: se a pergunta do usuário for genuinamente ambígua, vaga demais ou admitir 2 ou mais interpretações bem diferentes (onde responder sem perguntar poderia errar o alvo), faça uma pergunta curta e educada de esclarecimento e termine a resposta exatamente com uma linha no formato: [[OPCOES: Opção 1 | Opção 2 | Opção 3]] (com no máximo 4 opções curtas e diretas). Se a pergunta estiver clara, responda normalmente SEM usar [[OPCOES:...]].'
      );
    }

    const r = await ask(false, sysParts.join('\n\n'), msgs, 2048, { useWeb });

    // Extrai opções de esclarecimento de ambiguidade, se existirem.
    let finalText = r.text || 'Não consegui formular uma resposta. Tente reformular a pergunta.';
    let clarify = [];
    const optMatch = finalText.match(/\[\[OPCO[EÊ]S:\s*([^\]]+)\]\]/i);
    if (optMatch) {
      clarify = optMatch[1].split(/\s*[|;]\s*/).map(s => s.trim().slice(0, 64)).filter(Boolean).slice(0, 4);
      finalText = finalText.replace(optMatch[0], '').trim();
    }

    // Une fontes da web (Google Search) + URLs lidas diretamente.
    const sourcesMap = new Map();
    for (const d of fetchedDocs) sourcesMap.set(d.url, { title: d.title, url: d.url });
    for (const s of (r.sources || [])) if (!sourcesMap.has(s.url)) sourcesMap.set(s.url, s);

    return res.status(200).json({
      text: finalText,
      sources: [...sourcesMap.values()].slice(0, 5),
      clarify,
      summary
    });
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
