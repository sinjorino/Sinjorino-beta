import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1];

const quotes = [
  {
    text: "É a primeira IA que conversa comigo na minha língua, sem tradução forçada. Sinto que estou falando com alguém.",
    who: "Mariana C.",
    role: "Designer de produto",
  },
  {
    text: "Ensinei meu vocabulário técnico em uma tarde. Agora ele responde do jeito que eu responderia.",
    who: "Rafael T.",
    role: "Engenheiro de software",
  },
  {
    text: "A voz é o detalhe que muda tudo. Pergunto cozinhando, sem tocar na tela.",
    who: "Beatriz L.",
    role: "Chef de cozinha",
  },
];

export default function Testimonials() {
  const reduce = useReducedMotion();
  return (
    <section className="mx-auto max-w-6xl px-5 py-28 sm:px-8 sm:py-36">
      <div className="reveal mb-16 max-w-2xl">
        <p className="mb-4 font-mono text-[11px] tracking-[0.3em] text-accent uppercase">Vozes</p>
        <h2 className="text-4xl font-medium tracking-tight sm:text-5xl">
          Quem conversa, <span className="font-serif italic font-normal text-mist">fica.</span>
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quotes.map((q, i) => (
          <motion.figure
            key={q.who}
            initial={reduce ? false : { opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease, delay: i * 0.1 }}
            className="flex flex-col justify-between rounded-3xl border hairline p-7"
          >
            <blockquote className="font-serif text-xl leading-snug text-paper/90 italic">
              “{q.text}”
            </blockquote>
            <figcaption className="mt-8">
              <div className="text-sm font-medium">{q.who}</div>
              <div className="text-sm text-mist">{q.role}</div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
