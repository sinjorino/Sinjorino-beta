import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1];

const steps = [
  {
    n: "01",
    title: "Crie sua conta",
    text: "E-mail e senha, ou Google em um toque. Leva menos de um minuto.",
  },
  {
    n: "02",
    title: "Converse ou fale",
    text: "Digite sua pergunta — ou toque na logo e fale. O Sinjorino ouve e responde com voz.",
  },
  {
    n: "03",
    title: "Ensine e evolua",
    text: "Use “ensinar: pergunta = resposta” e o agente guarda seu conhecimento para as próximas conversas.",
  },
];

export default function HowItWorks() {
  const reduce = useReducedMotion();
  return (
    <section id="como-funciona" className="relative border-y hairline bg-coal/60">
      <div className="mx-auto max-w-6xl px-5 py-28 sm:px-8 sm:py-36">
        <div className="reveal mb-16 max-w-2xl">
          <p className="mb-4 font-mono text-[11px] tracking-[0.3em] text-accent uppercase">Como funciona</p>
          <h2 className="text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            Três passos entre você <span className="font-serif italic font-normal text-mist">e uma rede neural.</span>
          </h2>
        </div>

        <div className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          <div className="absolute top-6 left-0 hidden h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent md:block" aria-hidden="true" />
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={reduce ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, ease, delay: i * 0.12 }}
              className="relative"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-void font-mono text-sm text-accent">
                {s.n}
              </div>
              <h3 className="mb-3 text-xl font-medium">{s.title}</h3>
              <p className="max-w-xs text-[15px] leading-relaxed text-mist">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
