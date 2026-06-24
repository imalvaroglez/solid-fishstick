import type { PublicCatalogProduct } from "../types";
import { formatMoney } from "./format";
import { STRINGS } from "./strings";

const CATEGORY_LABEL: Record<PublicCatalogProduct["category"], string> = {
  perfume: STRINGS.categories.perfume,
  sneakers: STRINGS.categories.sneakers,
  cap: STRINGS.categories.cap,
  other: STRINGS.categories.other,
};

// Builds a wa.me link with a prefilled Spanish message for a catalog product.
export const createWhatsAppProductUrl = (
  product: PublicCatalogProduct,
  sellerPhone: string,
  businessName?: string
): string => {
  const who = businessName?.trim() || STRINGS.appName;
  const message =
    `Hola ${who}, me interesa este producto:\n` +
    `*${product.name}*\n` +
    `Categoría: ${CATEGORY_LABEL[product.category]}\n` +
    `Precio: ${formatMoney(product.price)}\n` +
    `¿Lo tienes disponible?`;
  const phone = sellerPhone.replace(/[^\d]/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

// Public catalog URL at the current origin.
export const publicCatalogUrl = (slug?: string): string =>
  `${window.location.origin}/catalogo${slug ? `/${encodeURIComponent(slug)}` : ""}`;
