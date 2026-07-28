export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="34"
      height="34"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="17.5" stroke="currentColor" strokeWidth="1" />
      <path
        d="M24 2.8 28.2 19.8 45.2 24 28.2 28.2 24 45.2 19.8 28.2 2.8 24 19.8 19.8 24 2.8Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="m24 13 5.2 11L24 35l-5.2-11L24 13Z"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle cx="24" cy="24" r="2.2" fill="currentColor" />
    </svg>
  );
}
