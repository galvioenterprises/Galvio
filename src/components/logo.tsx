import Image from "next/image";
import { site } from "@/config/site";

/**
 * The wordmark.
 *
 * Supplied as a PNG wrapped in an SVG container, so it is exported here
 * as WebP at 3x the rendered size: 9KB instead of the 330KB original.
 * If a true vector export ever arrives, swap the <Image> for an inline
 * SVG and both files can go.
 */
export function Logo({
  variant,
  className = "",
}: {
  /** "light" for dark backgrounds, "dark" for light ones. */
  variant: "light" | "dark";
  className?: string;
}) {
  const src =
    variant === "light"
      ? "/images/brand/logo-white.webp"
      : "/images/brand/logo-dark.webp";

  return (
    <Image
      src={src}
      alt={site.name}
      width={396}
      height={70}
      priority
      className={`w-auto ${className}`}
    />
  );
}
