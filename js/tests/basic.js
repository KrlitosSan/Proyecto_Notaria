 import { validateIngreso, validatePago } from "../validation.js";
import { initData, getData, setData } from "../data.js";
import { renderIngreso } from "../ingreso.js";
import { renderPagos } from "../pagos.js";

export function runBasicTests(){
    console.group('Pruebas básicas');

    console.log('validateIngreso (ok):', validateIngreso({escritura:88}) === null ? 'OK' : 'FAIL');
    console.log('validateIngreso (falla):', validateIngreso({}) !== null ? 'OK' : 'FAIL');

    console.log('validatePago (ok):', validatePago({escritura:88,total:100}) === null ? 'OK' : 'FAIL');
    console.log('validatePago (monto invalido):', validatePago({escritura:88,total:-1}) !== null ? 'OK' : 'FAIL');

    initData();
    // prepare sample actas in validacion
    setData('validacion', [
        { acta: '123', escritura: '88', tipo_deposito: 'BEN', valor_acta: 150000 },
        { acta: '124', escritura: '88', tipo_deposito: 'REG', valor_acta: 200000 }
    ]);

    renderIngreso();
    const formIngreso = document.getElementById('form-ingreso');
    // submit with missing escritura should error
    formIngreso.querySelector('#escritura').value = '';
    formIngreso.dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}));
    console.log('Ingreso inline error displayed:', !!formIngreso.querySelector('.error-message') ? 'OK' : 'FAIL');

    // submit valid ingreso that matches actas
    formIngreso.querySelector('#escritura').value = '88';
    formIngreso.querySelector('#nir').value = '100';
    formIngreso.querySelector('#responsable').value = 'Tester';
    formIngreso.querySelector('#estado').value = 'normal';
    formIngreso.dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}));

    const ingresos = getData('ingreso');
    console.log('Ingreso auto-pago set to pagado:', ingresos.some(i=>i.escritura == 88 && i.pago === 'pagado') ? 'OK' : 'FAIL');

    // simulate send to pagos by clicking the button
    const btnSend = document.querySelector('#tabla-ingreso button');
    btnSend.click();
    const pagos = getData('pagos');
    console.log('Pago creado y total calculado:', pagos.some(p=>p.escritura==88 && Number(p.total)===350000) ? 'OK' : 'FAIL');

    // send to certificados (use first send button in pagos table)
    const btnSendCert = document.querySelector('#tabla-pagos button.send');
    if (btnSendCert) btnSendCert.click();
    const certs = getData('certificados');
    console.log('Certificado creado al enviar pago:', certs.some(c=>c.escritura==88) ? 'OK' : 'FAIL');
    const cons = getData('consolidado');
    console.log('Certificado agregado a consolidado:', cons.some(c=>c.escritura==88 && c.source==='certificados') ? 'OK' : 'FAIL');

    const actas = getData('validacion');
    console.log('Actas marcadas como retirado después de certificado:', actas.filter(a=>String(a.escritura)==='88').every(a=>String(a.estado).toLowerCase()==='retirado') ? 'OK' : 'FAIL');

    // Move first acta from validacion to certificados using moveItem helper
    import('../consolidado.js').then(m=>{
        const listVal = getData('validacion');
        const act = listVal && listVal[0];
        if (act){
            m.moveItem('validacion', act.id, 'certificados');
            const certs2 = getData('certificados');
            console.log('Certificado creado desde validacion:', certs2.some(c=>String(c.id) === String(act.id) || String(c.escritura) === String(act.escritura)) ? 'OK' : 'FAIL');
            const cons = getData('consolidado');
            console.log('Consolidado contiene certificado:', cons.some(c=>c.source==='certificados' && String(c.id)===String(act.id)) ? 'OK' : 'FAIL');
            const actas2 = getData('validacion');
            console.log('Acta removida de validacion:', !actas2.some(a=>String(a.id)===String(act.id)) ? 'OK' : 'FAIL');
        } else {
            console.log('No hay actas para mover desde validacion');
        }
    }).catch(console.error);

    renderPagos();
    const formPagos = document.getElementById('form-pagos');
    formPagos.querySelector('#numero').value = '';
    formPagos.querySelector('#cliente').value = '';
    formPagos.querySelector('#monto').value = '0';
    formPagos.dispatchEvent(new Event('submit', {bubbles:true, cancelable:true}));
    console.log('Pagos inline error displayed:', !!formPagos.querySelector('.error-message') ? 'OK' : 'FAIL');

    // Menu basic behavior
    const btn = document.getElementById('btn-menu');
    const menu = document.getElementById('menu');
    btn.click();
    console.log('Menu opens on click:', menu.classList.contains('show') ? 'OK' : 'FAIL');
    document.body.click();
    console.log('Menu closes on outside click:', !menu.classList.contains('show') ? 'OK' : 'FAIL');

    console.groupEnd();
}
