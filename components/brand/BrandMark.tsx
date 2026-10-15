/** Square app icon: slate tile, house mark, amber dot (matches navbar). */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#0f172a" />
      <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-5h4v5" />
      </g>
      <circle cx="26" cy="6" r="3.5" fill="#fbbf24" stroke="#fff" strokeWidth="2" />
    </svg>
  )
}
