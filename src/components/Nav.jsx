import { motion } from "framer-motion";
import Logo from "./Logo.jsx";

const links = [
  { label: "Capacidades", href: "#capacidades" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Vozes", href: "#vozes" },
  { label: "Preços", href: "#precos" },
];

export default function Nav() {
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4 sm:px-8">
        <a href="#" className="flex items-center gap-3" aria-label="Sinjorino — início">
          <Logo size={34} className="text-accent" />
          <span className="font-mono text-xs tracking-[0.35em] text-paper/90 uppercase">
            Sinjorino
          </span>
        </a>

        <nav className="ml-auto hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group relative text-[13px] tracking-wide text-mist transition-colors hover:text-paper"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <a
          href="/app.html"
          className="magnetic ml-auto rounded-full bg-paper px-5 py-2 text-[13px] font-medium text-void transition-all duration-300 hover:shadow-[0_0_30px_rgba(125,208,196,0.35)] md:ml-6"
          data-cursor
        >
          Abrir o Sinjorino
        </a>
      </div>
    </motion.header>
  );
}
