export default function Logo({ size = 40, className = "", animated = true }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="logo-clip">
          <circle cx="24" cy="24" r="18.3" />
        </clipPath>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="22.5"
        strokeWidth="0.7"
        strokeDasharray="2 4"
        opacity="0.45"
        className={animated ? "animate-spin-slow origin-center" : ""}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <circle cx="24" cy="24" r="19" strokeWidth="1.3" opacity="0.9" />
      <g clipPath="url(#logo-clip)" strokeLinecap="round">
        <g
          className={animated ? "animate-pulse-soft" : ""}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <path
            d="M-24 21 q6 -9 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0"
            strokeWidth="1.6"
            className={animated ? "animate-flow" : ""}
          />
          <path
            d="M-24 26 q6 -6 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0"
            strokeWidth="1.1"
            opacity="0.55"
            className={animated ? "animate-flow" : ""}
            style={{ animationDuration: "4.8s", animationDirection: "reverse" }}
          />
          <path
            d="M-24 31 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0"
            strokeWidth="0.8"
            opacity="0.3"
            className={animated ? "animate-flow" : ""}
            style={{ animationDuration: "6.4s" }}
          />
        </g>
      </g>
    </svg>
  );
}
