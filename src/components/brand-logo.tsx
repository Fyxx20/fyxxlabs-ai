import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  label?: string;
  showText?: boolean;
  className?: string;
}

function FyxxLabsIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="36" height="36" rx="8" className="fill-primary" />
      <text
        x="50%"
        y="54%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-primary-foreground"
        fontWeight="700"
        fontSize="18"
        fontFamily="system-ui, sans-serif"
      >
        F
      </text>
    </svg>
  );
}

export function BrandLogo({
  href = "/",
  label = "FyxxLabs",
  showText = true,
  className = "",
}: BrandLogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-2 font-semibold text-foreground ${className}`}>
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border/60">
        <FyxxLabsIcon className="h-9 w-9" />
      </span>
      {showText && <span className="hidden sm:inline">{label}</span>}
    </Link>
  );
}
