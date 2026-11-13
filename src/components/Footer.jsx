import Logo from "./Logo.jsx";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pt-24 pb-12 sm:px-8">
        <div className="mb-24 text-center">
          <p className="reveal mb-6 font-mono text-[11px] tracking-[0.3em] text-mist uppercase">
            Pronto para conversar?
          </p>
          <a
            href="/app.html"
            data-cursor
            className="reveal reveal-d1 group inline-block"
          >
            <span className="font-serif text-[16vw] leading-none tracking-tight text-paper/90 italic transition-colors duration-500 group-hover:text-accent sm:text-8xl">
              sinjorino
            </span>
            <span className="mt-4 block font-mono text-[11px] tracking-[0.3em] text-accent uppercase opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              abrir o agente →
            </span>
          </a>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t hairline pt-8 sm:flex-row">
          <div className="flex items-center gap-3">
            <Logo size={26} animated={false} className="text-mist" />
            <span className="text-sm text-mist">© 2026 Sinjorino</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-mist">
            <a href="#capacidades" className="transition-colors hover:text-paper">Capacidades</a>
            <a href="#como-funciona" className="transition-colors hover:text-paper">Como funciona</a>
            <a href="#precos" className="transition-colors hover:text-paper">Preços</a>
          </nav>
          <p className="font-mono text-[11px] tracking-[0.2em] text-fog uppercase">
            feito com calma, no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
