import Image from "next/image";

/**
 * Icons exported from the Figma icon set.
 *
 * Roughly half that set is 512px PNG artwork pasted into Figma rather
 * than drawn as vectors, so it cannot be inlined as SVG and cannot take
 * `currentColor`. They are served as WebP at 128px — a few kilobytes
 * each — and the set ships explicit light and dark artwork for the
 * placements that need each.
 *
 * Interface chrome (chevrons, search, arrows, checks) stays as the inline
 * SVGs in icons.tsx: those change colour with their surroundings and cost
 * no extra requests.
 */
export type FigmaIconName =
  | "trust-warranty-light"
  | "trust-genuine-light"
  | "trust-delivery-light"
  | "category-air-conditioners"
  | "category-refrigerators"
  | "category-washing-machines"
  | "category-air-coolers"
  | "category-water-dispensers"
  | "category-televisions"
  | "service-tools"
  | "returns"
  | "support-headset"
  | "payment-cards"
  | "phone"
  | "phone-light"
  | "chat-light"
  | "offers-discount"
  | "exchange";

export function FigmaIcon({
  name,
  size = 24,
  className = "",
  priority = false,
}: {
  name: FigmaIconName;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={`/images/icons/${name}.webp`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
