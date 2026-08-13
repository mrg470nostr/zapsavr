export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id="zapsavr-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8dfa6" />
          <stop offset="0.5" stopColor="#e9b75f" />
          <stop offset="1" stopColor="#b8873a" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="264" r="196" fill="#7a5a24" />
      <circle cx="256" cy="252" r="192" fill="url(#zapsavr-coin)" />
      <circle cx="256" cy="252" r="168" fill="none" stroke="#8a6528" strokeWidth="3" opacity="0.55" />
      <path
        d="M 130 190 A 155 155 0 0 1 330 118"
        stroke="#fffceb"
        strokeWidth="16"
        fill="none"
        opacity="0.22"
        strokeLinecap="round"
      />
      <path d="M 270,157 L 198,267 L 246,267 L 232,347 L 314,227 L 262,227 Z" fill="#0c1216" />
    </svg>
  );
}
