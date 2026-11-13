import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1];

const plans = [
  {
    name: "Aberto",
    price: "Grátis",
    note: "para sempre",
    features: ["Conversas ilimitadas", "Memória de aprendizados", "Voz no navegador", "Conta privada"],
    cta: "Começar agora",
    featured: false,
  },
  {
    name: "Assinatura",
    price: "Em breve",
    note: "lista de espera aberta",
    features: ["Voz em nuvem (4 timbres)", "Prioridade em horários de pico", "Modelos avançados primeiro", "Suporte direto"],
    cta: "Entrar na lista",
    featured: true,
  },
];

export default function Pricing() {
  const reduce = useReducedMotion();
  return (
    <section id="precos" className="relative border-y hairline bg-coal/60">
      <div className="mx-auto max-w-6xl px-5 py-28 sm:px-8 sm:py-36">
        <div className="reveal mb-16 max-w-2xl">
          <p className="mb-4 font-mono text-[11px] tracking-[0.3em] text-accent uppercase">Preços</p>
          <h2 className="text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            Comece de graça. <span className="font-serif italic font-normal text-mist">Evolua quando fizer sentido.</span>
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={reduce ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, ease, delay: i * 0.1 }}
              className={`relative rounded-3xl p-8 sm:p-10 ${
                p.featured
                  ? "glass accent-glow"
                  : "border hairline"
              }`}
            >
              {p.featured && (
                <span className="absolute top-6 right-6 rounded-full bg-accent/15 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-accent uppercase">
                  Novo
                </span>
              )}
              <h3 className="font-mono text-[11px] tracking-[0.3em] text-mist uppercase">{p.name}</h3>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-medium tracking-tight">{p.price}</span>
                <span className="text-sm text-mist">{p.note}</span>
              </div>
              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-[15px] text-mist">
                    <span className="text-accent">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href="/app.html"
                data-cursor
                className={`magnetic mt-10 block rounded-full py-3.5 text-center text-[15px] font-medium transition-all duration-300 ${
                  p.featured
                    ? "bg-accent text-void hover:shadow-[0_0_40px_rgba(125,208,196,0.35)]"
                    : "border hairline text-paper hover:bg-white/5"
                }`}
              >
                {p.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
