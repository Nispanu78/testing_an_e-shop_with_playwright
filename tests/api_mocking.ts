import { test, expect } from '@playwright/test';
export const twoProductsMock = [ { id: '1', name: 'Mechanical Keyboard', price: 120 }, { id: '2', name: 'USB-C Hub', price: 45 }, ];

test('renders mocked products from API', async ({ page }) => {
  let intercepted = false;

  await page.route('**/api/products', route => {
    intercepted = true;

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(twoProductsMock),
    });
  });

  await page.goto('/products');

  expect(intercepted).toBeTruthy();

  await expect(page.locator('.product')).toHaveCount(2);
  await expect(page.getByText('Mechanical Keyboard')).toBeVisible();
  await expect(page.getByText('USB-C Hub')).toBeVisible();
});