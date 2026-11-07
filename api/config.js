// Entrega ao site os dados públicos do Supabase (URL e chave anon), lidos das variáveis da Vercel.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ url: process.env.SUPABASE_URL || '', key: process.env.SUPABASE_ANON_KEY || '' });
};
