import { test, expect, type Page } from "@playwright/test";

const PROJECT_ID = "demo-solid-fishstick";
const ADMIN_EMAIL = "admin@mail.com";
const ADMIN_PASSWORD = "password123";

const monitorErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
};

const openTab = (page: Page, name: "Catálogo" | "Clientes" | "Pedidos") =>
  page
    .getByRole("navigation")
    .getByRole("button", { name: new RegExp(`${name}$`) })
    .click();

const signIn = async (
  page: Page,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
) => {
  await page.goto("/");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Crea tu tienda" })
  ).toBeVisible();
};

const addStore = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "+ Tienda", exact: true }).click();
  await page.getByPlaceholder("Nombre de la nueva tienda").fill(name);
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(
    page.getByLabel("Tienda activa").locator("option:checked")
  ).toHaveText(name);
};

const addProduct = async (
  page: Page,
  name: string,
  price: string,
  withImage = false,
) => {
  await openTab(page, "Catálogo");
  await page.getByRole("button", { name: /Agregar producto/ }).click();
  if (withImage) {
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "pixel.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      ),
    });
    await expect(page.getByAltText("Vista previa")).toBeVisible();
  }
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Precio de venta").fill(price);
  await page.getByLabel("Mostrar en catálogo público").check();
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
};

const addCustomerAndOrder = async (
  page: Page,
  customer: string,
  product: string,
) => {
  await openTab(page, "Clientes");
  await page.getByRole("button", { name: /Agregar cliente/ }).click();
  await page.getByLabel("Nombre").fill(customer);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(customer, { exact: true })).toBeVisible();

  await openTab(page, "Pedidos");
  await page.getByRole("button", { name: /Nuevo pedido/ }).click();
  await page.getByRole("combobox", { name: "Cliente", exact: true }).fill(customer);
  await page.getByLabel("Del catálogo (opcional)").selectOption({ label: product });
  await page.getByRole("button", { name: "Guardar pedido" }).click();
  await expect(page.getByText(product, { exact: true })).toBeVisible();
};

test.beforeAll(async () => {
  await fetch(
    `http://127.0.0.1:28086/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" }
  );
  await fetch(
    `http://127.0.0.1:29096/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: "DELETE" }
  );
  const response = await fetch(
    "http://127.0.0.1:29096/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  expect(response.ok).toBe(true);
});

test("a new authenticated user creates their first store through the UI", async ({ page }) => {
  const email = "new-owner@example.com";
  const errors = monitorErrors(page);
  await page.goto("/");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(
    page.getByRole("heading", { name: "Crea tu tienda" })
  ).toBeVisible();
  await page.getByPlaceholder("Nombre de la tienda").fill("Tienda Autónoma");
  await page.getByRole("button", { name: "Crear tienda nueva" }).click();
  await expect(
    page.getByLabel("Tienda activa").locator("option:checked")
  ).toHaveText("Tienda Autónoma");
  await expect(page.getByRole("navigation")).toBeVisible();
  expect(errors).toEqual([]);
});

test("existing store survives while two new stores work end-to-end", async ({ page }) => {
  const errors = monitorErrors(page);
  await signIn(page);

  // Seed the current legacy store through the shipped legacy repositories.
  const seeded = await page.evaluate(async () => {
    const productRepo = await import("/src/services/repositories/productRepository.ts");
    const customerRepo = await import("/src/services/repositories/customerRepository.ts");
    const orderRepo = await import("/src/services/repositories/orderRepository.ts");
    const ts = "2026-06-24T00:00:00.000Z";
    await productRepo.save({
      id: "legacy-product",
      name: "Producto heredado",
      category: "other",
      referenceCost: 10,
      referencePrice: 25,
      imagePath: "product-images/legacy-product/original.jpg",
      isPublic: true,
      createdAt: ts,
      updatedAt: ts,
    });
    await customerRepo.save({
      id: "legacy-customer",
      name: "Cliente heredado",
      createdAt: ts,
      updatedAt: ts,
    });
    await orderRepo.save({
      id: "legacy-order",
      customerId: "legacy-customer",
      productId: "legacy-product",
      productName: "Producto heredado",
      cost: 10,
      price: 25,
      deposit: 0,
      status: "asked",
      createdAt: ts,
      updatedAt: ts,
    });
    return true;
  });
  expect(seeded).toBe(true);

  // Migrate via the real UI and production migration module.
  await page.getByRole("button", { name: "Migrar tienda actual" }).click();
  await expect(page.getByLabel("Tienda activa")).toHaveValue("default");
  await openTab(page, "Catálogo");
  await expect(page.getByText("Producto heredado", { exact: true })).toBeVisible();

  // Re-run the shipped migration: it must remain a no-op.
  const migratedAgain = await page.evaluate(async () => {
    const migration = await import("/src/services/migration/copyLegacyToStore.ts");
    await migration.copyLegacyToStore("default");
    return true;
  });
  expect(migratedAgain).toBe(true);
  await expect(page.getByText("Producto heredado", { exact: true })).toHaveCount(1);

  await addStore(page, "Joyas Luna");
  await addProduct(page, "Anillo Luna", "1200", true);
  await addCustomerAndOrder(page, "Ana Luna", "Anillo Luna");

  await addStore(page, "Pedidos Norte");
  await addProduct(page, "Perfume Norte", "900");
  await addCustomerAndOrder(page, "Bruno Norte", "Perfume Norte");

  // Switching proves UI-level isolation for all three workflows.
  await page.getByLabel("Tienda activa").selectOption({ label: "Joyas Luna" });
  await openTab(page, "Catálogo");
  await expect(page.getByText("Anillo Luna", { exact: true })).toBeVisible();
  await expect(page.getByText("Perfume Norte", { exact: true })).toHaveCount(0);
  await openTab(page, "Clientes");
  await expect(page.getByText("Ana Luna", { exact: true })).toBeVisible();
  await expect(page.getByText("Bruno Norte", { exact: true })).toHaveCount(0);
  await openTab(page, "Pedidos");
  await expect(page.getByText("Anillo Luna", { exact: true })).toBeVisible();
  await expect(page.getByText("Perfume Norte", { exact: true })).toHaveCount(0);

  await page.getByLabel("Tienda activa").selectOption({ label: "Tienda existente" });
  await openTab(page, "Catálogo");
  await expect(page.getByText("Producto heredado", { exact: true })).toBeVisible();
  await expect(page.getByText("Anillo Luna", { exact: true })).toHaveCount(0);

  // Duplicate routing names fail without replacing the existing pointer.
  await page.getByRole("button", { name: "+ Tienda", exact: true }).click();
  await page.getByPlaceholder("Nombre de la nueva tienda").fill("Joyas Luna");
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(page.getByText("Ese nombre público ya está ocupado")).toBeVisible();
  await expect(page.getByLabel("Tienda activa").locator("option")).toHaveCount(3);

  // Public routes expose only their own safe projections.
  await page.goto("/catalogo/joyas-luna");
  await expect(page.getByText("Anillo Luna", { exact: true })).toBeVisible();
  await expect(page.getByText("Perfume Norte", { exact: true })).toHaveCount(0);
  await page.goto("/catalogo/pedidos-norte");
  await expect(page.getByText("Perfume Norte", { exact: true })).toBeVisible();
  await expect(page.getByText("Anillo Luna", { exact: true })).toHaveCount(0);
  await page.goto("/catalogo/default");
  await expect(page.getByText("Producto heredado", { exact: true })).toBeVisible();
  await page.goto("/catalogo");
  await expect(page.getByText("Producto heredado", { exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});
