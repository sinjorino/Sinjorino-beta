import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1];

function Card({ className = "", children, delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease, delay }}
      whileHover={{ y: -4 }}
      className={`group relative overflow-hidden rounded-3xl glass p-7 transition-shadow duration-500 hover:shadow-[0_20px_70px_rgba(125,208,196,0.08)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute -top-1/2 left-1/2 h-full w-[140%] -translate-x-1/2 bg-[radial-gradient(circle,rgba(125,208,196,0.07),transparent_60%)]" />
      </div>
      {children}
    </motion.div>
  );
}

function Icon({ children }) {
  return (
    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-accent">
      {children}
    </div>
  );
}

const stroke = { fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

export default function Features() {
  return (
    <section id="capacidades" className="relative mx-auto max-w-6xl px-5 py-28 sm:px-8 sm:py-36">
      <div className="reveal mb-14 max-w-2xl">
        <p className="mb-4 font-mono text-[11px] tracking-[0.3em] text-accent uppercase">Capacidades</p>
        <h2 className="text-4xl font-medium tracking-tight text-balance sm:text-5xl">
          Um agente. <span className="font-serif italic font-normal text-mist">Muitas formas de ajudar.</span>
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <Icon>
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" {...stroke}>
              <path d="M4 17V7m5 10V9m5 8V5m5 12v-6" />
            </svg>
          </Icon>
          <h3 className="mb-2 text-xl font-medium">Rede neural de milhões de neurônios</h3>
          <p className="max-w-md text-[15px] leading-relaxed text-mist">
            Cada pergunta ativa camadas de processamento em tempo real — você vê a rede pensar,
            do primeiro caractere à resposta escolhida.
          </p>
          {/* mini network viz */}
          <div className="mt-8 flex items-end gap-1.5" aria-hidden="true">
            {[4, 7, 5, 9, 6, 11, 8, 12, 7, 10, 5, 8].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-accent/60 transition-all duration-500 group-hover:bg-accent"
                style={{ height: h * 4 }}
              />
            ))}
          </div>
        </Card>

        <Card delay={0.08}>
          <Icon>
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" {...stroke}>
              <path d="M12 3a7 7 0 0 1 7 7c0 2.5-1.5 4-2.5 5.5-.6.9-.5 2.5-.5 2.5h-8s.1-1.6-.5-2.5C6.5 14 5 12.5 5 10a7 7 0 0 1 7-7z" />
              <path d="M9.5 21h5" />
            </svg>
          </Icon>
          <h3 className="mb-2 text-xl font-medium">Memória que aprende</h3>
          <p className="text-[15px] leading-relaxed text-mist">
            Ensine com <span className="font-mono text-sm text-paper">“ensinar: pergunta = resposta”</span> —
            o Sinjorino guarda e usa o que você ensinou, para sempre.
          </p>
        </Card>

        <Card delay={0.12}>
          <Icon>
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" {...stroke}>
              <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V5a3 3 0 0 1 3-3z" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
            </svg>
          </Icon>
          <h3 className="mb-2 text-xl font-medium">Voz natural em 4 timbres</h3>
          <p className="text-[15px] leading-relaxed text-mist">
            Fale e seja respondido. Vozes femininas e masculinas, geradas em nuvem, com reconhecimento contínuo.
          </p>
        </Card>

        <Card delay={0.16}>
          <Icon>
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" {...stroke}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </Icon>
          <h3 className="mb-2 text-xl font-medium">Respostas rápidas</h3>
          <p className="text-[15px] leading-relaxed text-mist">
            Modelos de última geração com fallback automático: se um serviço falta, outro assume em milissegundos.
          </p>
        </Card>

        <Card delay={0.2}>
          <Icon>
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" {...stroke}>
              <path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </Icon>
          <h3 className="mb-2 text-xl font-medium">Sua conta, seus dados</h3>
          <p className="text-[15px] leading-relaxed text-mist">
            Conversas e memórias ficam na sua conta privada, protegidas e apagáveis quando você quiser.
          </p>
        </Card>
      </div>
    </section>
  );
}
