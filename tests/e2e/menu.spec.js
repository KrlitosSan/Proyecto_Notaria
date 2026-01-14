// Ejemplo de test e2e con Playwright
// Requiere instalar Playwright: npx playwright install

const { test, expect } = require('@playwright/test');

// Ajusta la URL según tu servidor local
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

test('menu toggle and forms show inline errors', async ({ page }) => {
  await page.goto(APP_URL);

  const btn = await page.locator('#btn-menu');
  await btn.click();
  const menu = await page.locator('#menu');
  await expect(menu).toHaveClass(/show/);

  // Cerrar con clic fuera
  await page.click('main');
  await expect(menu).not.toHaveClass(/show/);

  // Ingreso form validation
  await page.click('.menu-link[data-target="ingreso"]');
  const numero = await page.locator('#form-ingreso #numero');
  await numero.fill('');
  await page.locator('#form-ingreso').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await expect(page.locator('#form-ingreso .error-message')).toBeVisible();

  // Pagos form validation
  await page.click('.menu-link[data-target="pagos"]');
  await page.locator('#form-pagos #monto').fill('0');
  await page.locator('#form-pagos').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await expect(page.locator('#form-pagos .error-message')).toBeVisible();
});