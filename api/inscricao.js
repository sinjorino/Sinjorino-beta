// Recebe inscrições do Sinjorino Pro e envia para sinjorino.eg@gmail.com.
const DESTINO = 'sinjorino.eg@gmail.com';

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      destino: DESTINO,
      web3forms: !!process.env.WEB3FORMS_KEY,
      resend: !!process.env.RESEND_API_KEY
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const body = req.body || {};
  const nome = String(body.nome || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().slice(0, 140);

  if (nome.length < 2) return res.status(400).json({ error: 'Informe seu nome.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Informe um e-mail válido.' });

  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: 'Sinjorino Pro <onboarding@resend.dev>',
          to: [DESTINO],
          reply_to: email,
          subject: 'Nova inscrição no Sinjorino Pro: ' + nome,
          text: `Nome: ${nome}\nE-mail: ${email}`
        })
      });
      if (r.ok) return res.status(200).json({ ok: true, via: 'resend' });
    } catch (e) {}
  }

  if (process.env.WEB3FORMS_KEY) {
    try {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'Sinjorino/1.0' },
        body: JSON.stringify({
          access_key: process.env.WEB3FORMS_KEY.trim(),
          subject: 'Nova inscrição no Sinjorino Pro: ' + nome,
          from_name: 'Sinjorino Pro',
          name: nome,
          email
        })
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.success) return res.status(200).json({ ok: true, via: 'web3forms' });
    } catch (e) {}
  }

  return res.status(200).json({ ok: true, relay: 'formsubmit' });
};
