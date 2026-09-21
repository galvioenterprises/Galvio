import manifest from "../../public/images/products/manifest.json";

export type ProductImageManifestEntry = {
  width: number;
  height: number;
  widths: number[];
};

type ProductImageManifest = Record<string, ProductImageManifestEntry>;

const images = manifest as ProductImageManifest;

export function getProductImageManifestEntry(
  src: string,
): ProductImageManifestEntry | undefined {
  return src.startsWith("/") ? undefined : images[src];
}

export function resolveProductImagePath(src: string): string {
  if (src.startsWith("/")) return src;

  const entry = getProductImageManifestEntry(src);
  const fallbackWidth = entry?.widths[entry.widths.length - 1];

  return fallbackWidth
    ? `/images/products/${src}-${fallbackWidth}.webp`
    : `/images/products/${src}.webp`;
}

export function resolveProductImageUrl(src: string, origin: string): string {
  return new URL(resolveProductImagePath(src), origin).toString();
}
