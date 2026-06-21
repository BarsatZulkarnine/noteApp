/**
 * Hybrid barcode → product lookup against Open Food Facts (public, no key).
 * Network-only and best-effort: any failure (offline, no hit, timeout) resolves
 * to `null` so the scan flow falls back to manual naming. Never throws.
 */

export type ProductInfo = {
  /** Best display name we could derive, e.g. "Free-range Eggs". */
  name: string;
  /** Brand string if present, e.g. "Happy Hens". */
  brand?: string;
};

const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';
const TIMEOUT_MS = 6000;

export async function lookupBarcode(code: string): Promise<ProductInfo | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${ENDPOINT}/${encodeURIComponent(trimmed)}.json?fields=product_name,brands`,
      { signal: controller.signal, headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: number;
      product?: { product_name?: string; brands?: string };
    };
    if (data.status !== 1 || !data.product) return null;

    const name = data.product.product_name?.trim();
    const brand = data.product.brands?.split(',')[0]?.trim() || undefined;
    if (!name) return brand ? { name: brand, brand } : null;
    return { name, brand };
  } catch {
    return null; // offline, aborted, malformed — caller handles manual entry
  } finally {
    clearTimeout(timer);
  }
}
