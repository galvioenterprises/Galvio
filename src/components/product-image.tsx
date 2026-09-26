/*
 * next/image is deliberately not used here. Under `output: "export"` it
 * cannot negotiate formats — there is no server to do it — so it would
 * ship one format to everyone. A <picture> lets the browser pick AVIF
 * and fall back to WebP on its own, which is the whole reason the
 * pipeline generates both.
 */
/* eslint-disable @next/next/no-img-element */
import {
  getProductImageManifestEntry,
  resolveProductImagePath,
} from "@/lib/product-images";

/**
 * A product photograph.
 *
 * `src` is either a literal path (the placeholder SVG, anything starting
 * with "/") or the base name of an image produced by
 * `scripts/build-images.mts`. In the second case this renders a <picture>
 * offering AVIF first and WebP as the fallback — the site is a static
 * export with no image server, so the formats have to be negotiated in
 * the markup rather than by the CDN.
 *
 * `sizes` is required for anything responsive. Without it the browser
 * assumes the image spans the viewport and downloads the largest file in
 * the set, which defeats the whole point of having a set.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  className = "",
  priority = false,
  literalWidth = 800,
  literalHeight = 800,
  style,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Intrinsic dimensions for literal public assets such as placeholder.svg. */
  literalWidth?: number;
  literalHeight?: number;
  style?: React.CSSProperties;
}) {
  const loading = priority ? undefined : "lazy";
  const entry = getProductImageManifestEntry(src);

  if (!entry) {
    if (!src.startsWith("/")) {
      throw new Error(
        `Product image "${src}" is missing from public/images/products/manifest.json. ` +
          "Run pnpm build:images after adding the source photograph.",
      );
    }
    // Literal assets such as an SVG already live under public/ and do not
    // participate in the responsive image manifest.
    return (
      <img
        src={resolveProductImagePath(src)}
        alt={alt}
        width={literalWidth}
        height={literalHeight}
        loading={loading}
        decoding="async"
        className={className}
        style={style}
      />
    );
  }

  const srcSet = (ext: "avif" | "webp") =>
    entry.widths.map((w) => `/images/products/${src}-${w}.${ext} ${w}w`).join(", ");

  const fallbackWidth = entry.widths[entry.widths.length - 1];

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
      <img
        src={`/images/products/${src}-${fallbackWidth}.webp`}
        alt={alt}
        width={entry.width}
        height={entry.height}
        loading={loading}
        decoding="async"
        className={className}
        style={style}
      />
    </picture>
  );
}
