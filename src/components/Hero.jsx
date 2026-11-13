import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* Lightweight GPU-friendly particle field: floating nodes with
   proximity links, drawn once per frame on a single canvas. */
function NeuralField() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = canvas.getContext("2d");
    const DPR = Math.min(devicePixelRatio || 1, 2);
    let W = 0, H = 0, raf = 0;
    const nodes = [];
    const COUNT = innerWidth < 640 ? 42 : 80;
    const LINK = 130;

    function resize() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    for (let i = 0; i < COUNT; i++) {
      nodes.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0006,
        vy: (Math.random() - 0.5) * 0.0006,
        r: 1 + Math.random() * 1.6,
        ph: Math.random() * Math.PI * 2,
      });
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, W, H);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = (a.x - b.x) * W, dy = (a.y - b.y) * H;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(125,208,196,${(1 - d / LINK) * 0.09})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x * W, a.y * H);
            ctx.lineTo(b.x * W, b.y * H);
            ctx.stroke();
          }
        }
        const tw = 0.25 + 0.2 * Math.sin(t / 1400 + n.ph);
        ctx.fillStyle = `rgba(244,244,240,${tw})`;
        ctx.beginPath();
        ctx.arc(a.x * W, a.y * H, n.r, 0, 6.283);
        ctx.fill();
      }
    }

    resize();
    new ResizeObserver(resize).observe(canvas);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

const headline = ["Inteligência", "que", "conversa."];
const sub = "Sinjorino é um agente de IA em português: uma rede neural viva que escuta, aprende com você e responde com voz — com elegância e sem ruído.";

const ease = [0.22, 1, 0.36, 1];

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      {/* gradient mesh backdrop */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute -top-1/4 left-1/2 h-[80vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(125,208,196,0.13),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-0 right-[-10%] h-[60vh] w-[50vw] rounded-full bg-[radial-gradient(circle,rgba(44,107,98,0.12),transparent_70%)] blur-3xl" />
        <NeuralField />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-28 pb-20 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.3 }}
          className="mb-8 inline-flex items-center gap-3 rounded-full glass px-4 py-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
          <span className="font-mono text-[11px] tracking-[0.25em] text-mist uppercase">
            Agente de IA · em português
          </span>
        </motion.div>

        <h1 className="max-w-4xl text-[13vw] leading-[1.02] font-medium tracking-tight text-balance sm:text-7xl md:text-8xl">
          {headline.map((word, i) => (
            <motion.span
              key={i}
              initial={reduce ? false : { opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1, ease, delay: 0.45 + i * 0.14 }}
              className="mr-[0.24em] inline-block last:mr-0"
            >
              {i === 2 ? (
                <span className="font-serif italic font-normal text-accent">{word}</span>
              ) : (
                word
              )}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 1.0 }}
          className="mt-8 max-w-xl text-lg leading-relaxed text-mist"
        >
          {sub}
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 1.15 }}
          className="mt-12 flex flex-wrap items-center gap-4"
        >
          <MagneticLink href="/app.html">Começar a conversar</MagneticLink>
          <a
            href="#capacidades"
            className="group inline-flex items-center gap-2 text-[15px] text-mist transition-colors hover:text-paper"
          >
            Ver capacidades
            <span className="inline-block transition-transform duration-300 group-hover:translate-y-0.5">↓</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function MagneticLink({ href, children }) {
  const ref = useRef(null);

  function onMove(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * 0.2}px, ${y * 0.3}px)`;
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <a
      ref={ref}
      href={href}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      data-cursor
      className="magnetic inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-[15px] font-medium text-void accent-glow transition-shadow duration-300 hover:shadow-[0_0_50px_rgba(125,208,196,0.4)]"
    >
      {children}
      <span aria-hidden="true">→</span>
    </a>
  );
}
