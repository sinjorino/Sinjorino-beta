// Recebe inscrições da lista de espera do Sinjorino Pro e envia notificação para sinjorino.eg@gmail.com.
const DESTINO = 'sinjorino.eg@gmail.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const body = req.body || {};
  const nome = String(body.nome || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().slice(0, 140);

  if (nome.length < 2) return res.status(400).json({ error: 'Informe seu nome.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Informe um e-mail válido.' });

  // Opção 1: Resend (se RESEND_API_KEY estiver na Vercel)
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: 'Bearer ' + process.env.RESEND_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Sinjorino Pro <onboarding@resend.dev>',
          to: [DESTINO],
          reply_to: email,
          subject: 'Nova inscrição no Sinjorino Pro: ' + nome,
          text: `Nova inscrição na lista de espera do Sinjorino Pro:\n\nNome: ${nome}\nE-mail: ${email}\nData: ${new Date().toISOString()}`
        })
      });
      if (r.ok) return res.status(200).json({ ok: true, via: 'resend' });
    } catch (e) {}
  }

  // Opção 2: Web3Forms (se WEB3FORMS_KEY estiver na Vercel)
  if (process.env.WEB3FORMS_KEY) {
    try {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          access_key: process.env.WEB3FORMS_KEY,
          subject: 'Nova inscrição no Sinjorino Pro: ' + nome,
          from_name: 'Sinjorino Pro',
          name: nome,
          email
        })
      });
      if (r.ok) return res.status(200).json({ ok: true, via: 'web3forms' });
    } catch (e) {}
  }

  // Opção 3: Sem chave extra — o frontend completa o envio automático pelo FormSubmit para sinjorino.eg@gmail.com
  return res.status(200).json({ ok: true, relay: 'formsubmit' });
};
```
