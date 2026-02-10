import Image from "next/image";
import Link from "next/link";
import axisLogo from "../../AXIS Logo.png";

interface BrandLogoProps {
  href?: string;
  label?: string;
  showText?: boolean;
  className?: string;
}

export function BrandLogo({
  href = "/",
  label = "FyxxLabs",
  showText = true,
  className = "",
}: BrandLogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-2 font-semibold text-foreground ${className}`}>
      <span className="relative h-9 w-9 overflow-hidden rounded-lg ring-1 ring-border/60">
        <Image
          src={axisLogo}
          alt="FyxxLabs Logo"
          fill
          sizes="36px"
          className="object-cover object-top"
          priority
        />
      </span>
      {showText && <span className="hidden sm:inline">{label}</span>}
    </Link>
  );
}
