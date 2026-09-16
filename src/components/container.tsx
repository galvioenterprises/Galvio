/**
 * The page's content column.
 *
 * The Figma frames are 1920 wide with a 1240px content column, so the
 * max width is set from the design rather than from the browser window —
 * matching it at 1440 is what stops the page reading as cramped.
 */
export function Container({
  children,
  className = "",
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** The category strip sits in a near-full-bleed band of its own. */
  wide?: boolean;
  }) {
  return (
    <div
      className={`mx-auto w-full ${
        wide
          ? "max-w-none px-5 sm:px-8 lg:px-10"
          : "max-w-[1304px] px-5 sm:px-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}
