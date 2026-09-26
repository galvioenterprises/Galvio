"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { canAddToCart } from "@/lib/availability";
import type { Product } from "@/lib/product-schema";

type Availability = Product["availability"];

export type RuntimeCatalogueOverride = {
  sellingPrice: number;
  mrp: number | null;
  availability: Availability;
  stockCount: number | null;
  updatedAt: string;
};

type RuntimeCatalogue = Record<string, RuntimeCatalogueOverride>;

const RuntimeCatalogueContext = createContext<RuntimeCatalogue>({});
const AVAILABILITY = new Set<Availability>([
  "unknown",
  "in_stock",
  "out_of_stock",
  "preorder",
  "backorder",
]);

function parseOverrides(value: unknown): RuntimeCatalogue {
  if (!value || typeof value !== "object") return {};
  const raw = (value as { overrides?: unknown }).overrides;
  if (!raw || typeof raw !== "object") return {};

  return Object.fromEntries(
    Object.entries(raw).flatMap(([slug, entry]) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      if (
        typeof item.sellingPrice !== "number" ||
        !Number.isFinite(item.sellingPrice) ||
        item.sellingPrice <= 0 ||
        typeof item.availability !== "string" ||
        !AVAILABILITY.has(item.availability as Availability) ||
        (item.mrp !== null && (typeof item.mrp !== "number" || item.mrp <= 0)) ||
        (item.stockCount !== null &&
          (typeof item.stockCount !== "number" ||
            !Number.isInteger(item.stockCount) ||
            item.stockCount < 0)) ||
        typeof item.updatedAt !== "string"
      ) {
        return [];
      }
      return [[slug, item as RuntimeCatalogueOverride]];
    }),
  );
}

function sameCatalogue(left: RuntimeCatalogue, right: RuntimeCatalogue): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((slug) => {
    const a = left[slug];
    const b = right[slug];
    return Boolean(
      b &&
        a.sellingPrice === b.sellingPrice &&
        a.mrp === b.mrp &&
        a.availability === b.availability &&
        a.stockCount === b.stockCount &&
        a.updatedAt === b.updatedAt,
    );
  });
}

export function RuntimeCatalogueProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<RuntimeCatalogue>({});

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/catalogue/overrides", {
        headers: { accept: "application/json" },
      });
      if (!response.ok) return;
      const next = parseOverrides(await response.json());
      setOverrides((current) => (sameCatalogue(current, next) ? current : next));
    } catch {
      // The build-time catalogue remains a safe fallback when the API is
      // unavailable. Checkout still re-prices and re-checks stock server-side.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch resolves asynchronously; this effect synchronizes Worker inventory into the client cache
    void refresh();
    const interval = window.setInterval(refresh, 60_000);
    function onVisibility() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return (
    <RuntimeCatalogueContext.Provider value={overrides}>
      {children}
    </RuntimeCatalogueContext.Provider>
  );
}

export function applyRuntimeOverride<T extends { slug: string }>(
  product: T,
  override: RuntimeCatalogueOverride | undefined,
): T {
  if (!override) return product;
  const next: Record<string, unknown> = {
    ...product,
    availability: override.availability,
    stockCount: override.stockCount ?? undefined,
  };
  if ("sellingPrice" in product) next.sellingPrice = override.sellingPrice;
  if ("price" in product) next.price = override.sellingPrice;
  // Customer-facing product/card models keep MRP numeric. Treat a deliberately
  // blank runtime MRP as equal to the live selling price so discount UI
  // disappears and stays consistent with the server quote, where null MRP
  // contributes the selling price to mrpTotal.
  if ("mrp" in product) next.mrp = override.mrp ?? override.sellingPrice;
  if ("orderable" in product) next.orderable = canAddToCart(override.availability);
  return next as T;
}

export function useRuntimeProduct<T extends { slug: string }>(product: T): T {
  const overrides = useContext(RuntimeCatalogueContext);
  return useMemo(
    () => applyRuntimeOverride(product, overrides[product.slug]),
    [overrides, product],
  );
}

export function useRuntimeProducts<T extends { slug: string }>(products: T[]): T[] {
  const overrides = useContext(RuntimeCatalogueContext);
  return useMemo(
    () => products.map((product) => applyRuntimeOverride(product, overrides[product.slug])),
    [overrides, products],
  );
}

export function useRuntimeProductRecord<T extends { slug: string }>(
  products: Record<string, T>,
): Record<string, T> {
  const overrides = useContext(RuntimeCatalogueContext);
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(products).map(([slug, product]) => [
          slug,
          applyRuntimeOverride(product, overrides[slug]),
        ]),
      ),
    [overrides, products],
  );
}
