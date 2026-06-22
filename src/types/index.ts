// Domain types. Field names follow the spec. UI strings live in lib/strings.ts.

export type ProductCategory = "perfume" | "sneakers" | "cap" | "other";

export type OrderStatus =
  | "asked"
  | "confirmed"
  | "to_buy"
  | "bought"
  | "arrived"
  | "delivered"
  | "paid";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  referenceCost: number;
  referencePrice: number;
  imageUrl?: string;
  imagePath?: string;
  publicDescription?: string;
  privateNotes?: string;
  isPublic: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// Public, customer-facing projection of a Product. SAFE fields only —
// never include referenceCost, notes, privateNotes, or createdAt.
export type PublicCatalogProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  imageUrl?: string;
  imagePath?: string;
  description?: string;
  isPublic: boolean;
  updatedAt: string;
};

export type PublicCatalogSettings = {
  businessName?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  customerId: string;
  productId?: string;
  productName: string;
  details?: string;
  cost: number;
  price: number;
  deposit: number;
  status: OrderStatus;
  promisedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type DB = {
  version: 1;
  products: Product[];
  customers: Customer[];
  orders: Order[];
};

export type Tab = "home" | "catalog" | "orders" | "customers";

// Input shape for creating an order. Lives here so forms and the store share
// one definition without the store depending on the form (or vice versa).
export type NewOrderInput = {
  customerName: string;
  customerPhone?: string;
  productId?: string;
  productName: string;
  details?: string;
  cost: number;
  price: number;
  deposit: number;
  promisedDate?: string;
  notes?: string;
};
