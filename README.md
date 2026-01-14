# Gestión Notarial — Cambios recientes

Resumen de cambios realizados:

- Consolidada la capa de persistencia en `js/data.js` con manejo seguro de `localStorage` (try/catch, backups básicos) y clonado de datos al leer.
- Eliminada la duplicación de responsabilidades: `js/utils.js` marcado como DEPRECATED.
- Validaciones centralizadas en `js/validation.js` y usadas en los formularios (`ingreso` y `pagos`).
- Normalizado el campo de proyección de pago a `proyeccion_pago` y el monto se guarda como número.
- Formateo de montos a 2 decimales en vistas de `pagos`, `certificados` y `consolidado`.
- Añadido `js/tests/basic.js` con pruebas básicas que se pueden ejecutar desde el navegador.
- Añadida carga condicional de pruebas: abre la app con `index.html?test=1` y verás resultados en la consola (DevTools).
- Añadido ejemplo de pruebas e2e con Playwright en `tests/e2e/menu.spec.js` (requiere instalar Playwright).
- `js/menu.js` y `js/utils.js` han sido eliminados del flujo (contenido reemplazado y listos para borrado definitivo del repositorio).
- Añadida pestaña `Validación` con UI editable y carga de CSV (campos: Acta, Fecha_Acta, Tipo_Deposito, Cliente, Documento, Radicado, Escritura, Año, Valor_Acta, Estado, Observaciones, Constructora).
- Al ingresar o enviar a pagos, el sistema busca actas en `Validación` por `Escritura` y: suma `Vr_Ben` y `Vr_Reg`, calcula `Total` y `Pago_Cli` automáticamente; muestra `Actas` unidas por `-`.
- Si `estado` cambia a `pagado` en `Pagos`, se genera un `Certificado` con referencia.

Cómo probar rápidamente:

1. Abrir `index.html` en el navegador (servir por HTTP es recomendable).
2. Abrir DevTools (F12 / Ctrl+Shift+I).
3. Navegar a `index.html?test=1` para ejecutar las pruebas automáticas básicas en consola.

Pruebas e2e (ejemplo con Playwright):

1. Instala dependencias: `npm install` (usa Node >=18). Esto instalará `@playwright/test` declarado en `package.json`.
2. Instala los navegadores de Playwright: `npx playwright install`.
3. Sirve la app localmente en el puerto 3000: `npm start` (usa `npx serve` si no instalas globalmente).
4. Ejecuta las e2e: `npm run test:e2e`.

Añadida prueba e2e: `tests/e2e/flow-validacion-certificados.spec.js` que valida el flujo de mover una acta desde Validación hacia Certificados, la creación del certificado en `certificados` y la adición correspondiente en `consolidado`, así como la eliminación de la acta en `validacion`.

Notas:

- Si encuentras problemas con datos corruptos en `localStorage`, la app intentará restaurar una estructura por defecto y registrará una advertencia en consola.
- Reemplacé `alert()` por mensajes inline en formularios para una mejor UX.
- Si quieres, puedo añadir la configuración de Playwright y un script npm para correr los e2e automáticamente.

