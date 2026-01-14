const { test, expect } = require('@playwright/test');

// Requiere instalar Playwright: npx playwright install
// Ajusta la URL según tu servidor local
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

test('Validación → Certificados → Consolidado (creación y eliminación)', async ({ page }) => {
  // Inyectar DB inicial antes de cargar la app
  await page.addInitScript(() => {
    const key = 'sistema_notarial_v1';
    const db = {
      validacion: [
        { id: 'act1', acta: 'A-1', escritura: '500', tipo_deposito: 'BEN', valor_acta: 100000 }
      ],
      certificados: [],
      consolidado: []
    };
    localStorage.setItem(key, JSON.stringify(db));
  });

  await page.goto(APP_URL);

  // Ir a Validación
  await page.click('.menu-link[data-target="validacion"]');
  await page.waitForSelector('#tabla-validacion tr[data-id="act1"]');

  // Seleccionar la acta
  await page.check('#tabla-validacion tr[data-id="act1"] input.sel-acta');
  // Seleccionar destino certificados y ejecutar mover
  await page.selectOption('#target-phase-validacion', 'certificados');
  await page.click('#btn-move-validacion');

  // Esperar hasta que el certificado aparezca en localStorage
  await page.waitForFunction(() => {
    try {
      const db = JSON.parse(localStorage.getItem('sistema_notarial_v1') || '{}');
      return db.certificados && db.certificados.some(c => c.id === 'act1' || String(c.escritura) === '500');
    } catch (e) { return false; }
  }, { timeout: 5000 });

  // Verificaciones finales en el estado (localStorage)
  const db = await page.evaluate(() => JSON.parse(localStorage.getItem('sistema_notarial_v1') || '{}'));

  expect(db.certificados).toBeDefined();
  expect(db.certificados.some(c => c.id === 'act1' || String(c.escritura) === '500')).toBeTruthy();

  expect(db.consolidado).toBeDefined();
  expect(db.consolidado.some(c => c.source === 'certificados' && (c.id === 'act1' || String(c.escritura) === '500'))).toBeTruthy();

  // El acta debe haber sido removida de validacion luego del movimiento
  expect(!db.validacion || !db.validacion.some(a => a.id === 'act1')).toBeTruthy();
});