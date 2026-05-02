import { test, expect } from "@playwright/test"

const products = [{
  product: "abc",
  quantity: 1,
  price: 10
}, {
  product: "def",
  quantity: 2,
  price: 20
}]

test("Populate the database with mocked data and retrieve it", async({ page }) => {
  const intercepted = false;
  await page.route("**/api/products", async (route) => {
    const intercepted = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(products)
    });
  });

  await page.goto("/products")
  expect(intercepted).toBeTruthy();
  await expect(page.locator(".products")).toHaveCount(2);
  await expect(page.getByText("abc")).toBeVisible();
  await expect(page.getByText("def")).toBeVisible();
})