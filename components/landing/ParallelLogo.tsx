export function ParallelLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g stroke="#3A7D73" strokeWidth="12" strokeLinecap="round">
        <path d="M20 30H80" />
        <path d="M20 50H60" />
        <path d="M20 70H80" />
      </g>
    </svg>
  );
}
