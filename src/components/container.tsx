/**
 * The page's content column.
 *
 * The Figma frames are 1920 wide, and they do not all use the same column:
 * the landing page runs 1240, the product listing 1560 because it carries
 * a filter rail alongside a four-column grid, and the product page 1192
 * because a specification page reads better narrow.
 * Both widths come from the design rather than from the browser window —
 * sizing a column to a 1440 laptop is what made the first pass read as
 * cramped.
 */
type Size = "default" | "listing" | "product" | "wide";

const WIDTHS: Record<Size, string> = {
  // 1240 content at >= 1304
  default: "max-w-[1304px] px-5 sm:px-8",
  // 1560 content at >= 1624
  listing: "max-w-[1624px] px-5 sm:px-8",
  // 1192 content at >= 1256
  product: "max-w-[1256px] px-5 sm:px-8",
  // Near-full-bleed band, 40px from each edge
  wide: "max-w-none px-5 sm:px-8 lg:px-10",
};

export function Container({
  children,
  className = "",
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: Size;
}) {
  return (
    <div className={`mx-auto w-full ${WIDTHS[size]} ${className}`}>{children}</div>
  );
}
