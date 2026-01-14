import { getData,setData,uuid,sumActas,joinActas,addAudit,retireActas } from "./data.js";
import { showToast } from "./ui.js";
import { showSection } from "./app.js";
import { validatePago } from "./validation.js";

export function renderPagos(){
    const container=document.getElementById("pagos");
    container.innerHTML=`
    <h2>Pagos</h2>
    <form id="form-pagos" class="form">
        <input id="escritura" type="number" placeholder="Escritura" required>
        <input id="nir" type="number" placeholder="Nir">
        <input id="actas" placeholder="Actas" readonly>
        <input id="vr_ben" type="number" step="0.01" placeholder="Vr_Ben">
        <input id="vr_reg" type="number" step="0.01" placeholder="Vr_Reg">
        <input id="total" type="text" placeholder="Total" readonly>
        <input id="pago_cli" type="text" placeholder="Pago_Cli" readonly>
        <input id="liquidacion" type="number" step="0.01" placeholder="Liquidación">
        <input id="faltante" type="text" placeholder="Faltante" readonly>
        <input id="sobrante" type="text" placeholder="Sobrante" readonly>
        <select id="estado">
            <option value="pendiente" selected>Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
        </select>
        <button type="submit" class="btn">Guardar Pago</button>
    </form>
    <div style="margin-bottom:8px">
        <label>Mover seleccionados a: </label>
        <select id="target-phase-pagos">
            <option value="ingreso">Ingreso</option>
            <option value="certificados">Certificados</option>
            <option value="consolidado">Consolidado</option>
        </select>
        <button id="btn-move-pagos" class="btn">Mover</button>
    </div>
    <table class="table" id="tabla-pagos">
        <thead><tr><th></th><th>Escritura</th><th>Nir</th><th>Actas</th><th>Total</th><th>Pago_Cli</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody></tbody>
    </table>
    `;
    const form=document.getElementById("form-pagos");
    const tbody=document.querySelector("#tabla-pagos tbody");
    const data=getData("pagos");

    function recalcFromEscritura(){
        const escritura = Number(form.escritura.value) || null;
        if (!escritura) return;
        const sums = sumActas(escritura);
        form.actas.value = joinActas(escritura);
        form.pago_cli.value = sums.total ? Number(sums.total).toFixed(2) : '';
        // if vr_ben or vr_reg empty, default to sums
        if (!form.vr_ben.value) form.vr_ben.value = sums.vr_ben || 0;
        if (!form.vr_reg.value) form.vr_reg.value = sums.vr_reg || 0;
        recalcTotals();
    }

    function recalcTotals(){
        const vr_ben = parseFloat(form.vr_ben.value) || 0;
        const vr_reg = parseFloat(form.vr_reg.value) || 0;
        const total = vr_ben + vr_reg;
        form.total.value = isNaN(total) ? '' : total.toFixed(2);
        const pago_cli = parseFloat(form.pago_cli.value) || 0;
        form.faltante.value = pago_cli >= total ? '' : (total - pago_cli).toFixed(2);
        form.sobrante.value = pago_cli <= total ? '' : (pago_cli - total).toFixed(2);
    }

    function renderTable(){
        tbody.innerHTML=data.map((r,idx)=>`<tr data-id="${r.id}">
            <td><input type="checkbox" class="sel-p" data-id="${r.id}"></td>
            <td>${r.escritura}</td>
            <td>${r.nir||''}</td>
            <td>${r.actas||''}</td>
            <td>${r.total != null ? Number(r.total).toFixed(2) : ''}</td>
            <td>${r.pago_cli != null ? Number(r.pago_cli).toFixed(2) : ''}</td>
            <td>${r.estado||''}</td>
            <td>
                <button class="btn edit" data-idx="${idx}">Editar</button>
                <button class="btn send" data-idx="${idx}">Enviar a Certificados</button>
            </td>
        </tr>`).join("");
        tbody.querySelectorAll("button.edit").forEach(btn=>btn.addEventListener('click', ()=>editPago(btn.dataset.idx)));
        tbody.querySelectorAll("button.send").forEach(btn=>btn.addEventListener('click', ()=>sendToCertificados(btn.dataset.idx)));
    }

    // Move selected pagos to target
    const btnMove = document.getElementById('btn-move-pagos');
    if (btnMove){
        btnMove.addEventListener('click', ()=>{
            const target = document.getElementById('target-phase-pagos').value;
            const checked = Array.from(document.querySelectorAll('#tabla-pagos .sel-p:checked'));
            if (!checked.length) return alert('Selecciona al menos un registro');
            checked.forEach(ch=>{
                const id = ch.dataset.id;
                import('./consolidado.js').then(m=>{ m.moveItem('pagos', id, target); });
            });
            renderTable();
        });
    }

    function editPago(idx){
        const item = data[idx];
        if (!item) return;
        // use modal for editing
        import('./ui.js').then(mod=>{
            mod.showModal({
                title: 'Editar Pago',
                fields: [
                    {name:'estado', label:'Estado'},
                    {name:'liquidacion', label:'Liquidación', type:'number', attrs:{step:'0.01'}},
                    {name:'vr_ben', label:'Vr_Ben', type:'number', attrs:{step:'0.01'}},
                    {name:'vr_reg', label:'Vr_Reg', type:'number', attrs:{step:'0.01'}},
                    {name:'observaciones', label:'Observaciones', type:'textarea'}
                ],
                values: item,
                onSave: (vals)=>{
                    item.estado = vals.estado || item.estado;
                    item.liquidacion = Number(vals.liquidacion) || item.liquidacion || 0;
                    item.vr_ben = Number(vals.vr_ben) || item.vr_ben || 0;
                    item.vr_reg = Number(vals.vr_reg) || item.vr_reg || 0;
                    item.total = (Number(item.vr_ben)||0) + (Number(item.vr_reg)||0);
                    // recalcula faltante/sobrante
                    const pago_cli = Number(item.pago_cli) || 0;
                    item.faltante = pago_cli >= item.total ? '' : (item.total - pago_cli);
                    item.sobrante = pago_cli <= item.total ? '' : (pago_cli - item.total);

                    if (item.estado === 'pagado'){
                        const certs = getData('certificados');
                        certs.push({id: item.id, escritura: item.escritura, nir: item.nir, sobrante: item.sobrante || 0, estado: 'emitido'});
                        setData('certificados', certs);
                        // retire actas asociadas a la escritura
                        try { const changed = retireActas(item.escritura); if (changed) try{ showToast('Actas marcadas como retirado',2500) } catch(e){} } catch(e){}
                        // add to consolidado if not exists
                        const cons = getData('consolidado');
                        const existsCons = cons.some(c => String(c.id) === String(item.id) && c.source === 'certificados');
                        if (!existsCons) {
                            cons.push({id: item.id, source:'certificados', escritura:item.escritura, nir:item.nir, monto:item.sobrante || 0, estado:'emitido'});
                            setData('consolidado', cons);
                            try { addAudit('add_consolidado','consolidado', item.id, {from:'pagos', escritura:item.escritura}); } catch(e){}
                            try{ showToast('Certificado añadido a Consolidado', 2500); } catch(e){}
                        }
                        data.splice(idx,1);
                        setData('pagos', data);
                        try { addAudit('create_certificado','certificados', item.id, {from:'pagos', escritura:item.escritura}); } catch(e){}
                        try { addAudit('move','pagos', item.id, {to:'certificados', escritura:item.escritura}); } catch(e){}
                    } else {
                        setData('pagos', data);
                        try { addAudit('update_pago','pagos', item.id, {escritura:item.escritura, estado:item.estado}); } catch(e){}
                    }
                    renderTable();
                }
            });
        });
    }

    function sendToCertificados(idx){
        // idx is index
        const item = data[idx];
        if (!item) return;
        const certs = getData('certificados');
        certs.push({id: item.id, escritura: item.escritura, nir: item.nir, sobrante: item.sobrante || 0});
        setData('certificados', certs);
        try { addAudit('create_certificado','certificados', item.id, {from:'pagos', escritura:item.escritura}); } catch(e){}
        // retire actas asociadas a la escritura
        try { const changed = retireActas(item.escritura); if (changed) try{ showToast('Actas marcadas como retirado',2500) } catch(e){} } catch(e){}
        // also add to consolidado (avoid duplicates)
        const cons = getData('consolidado');
        const existsCons = cons.some(c => String(c.id) === String(item.id) && c.source === 'certificados');
        if (!existsCons) {
            cons.push({id: item.id, source: 'certificados', escritura: item.escritura, nir: item.nir, monto: item.sobrante || 0, estado: 'emitido'});
            setData('consolidado', cons);
            try { addAudit('add_consolidado','consolidado', item.id, {from:'pagos', escritura:item.escritura}); } catch(e){}
            try{ showToast('Certificado añadido a Consolidado', 2500); } catch(e){}
        }
        // remove from pagos
        data.splice(idx,1);
        setData('pagos', data);
        try { addAudit('move','pagos', item.id, {to:'certificados', escritura:item.escritura}); } catch(e){}
        renderTable();
        showSection('certificados');
    }

    form.escritura.addEventListener('change', recalcFromEscritura);
    form.vr_ben.addEventListener('input', recalcTotals);
    form.vr_reg.addEventListener('input', recalcTotals);

    function showError(form, msg) {
        let el = form.querySelector('.error-message');
        if (!el) {
            el = document.createElement('div');
            el.className = 'error-message';
            form.prepend(el);
        }
        el.textContent = msg;
    }

    function clearError(form) {
        const el = form.querySelector('.error-message');
        if (el) el.remove();
    }

    form.onsubmit = (e) => {
        e.preventDefault();
        clearError(form);
        const nuevo = {
            id: uuid(),
            escritura: Number(form.escritura.value) || 0,
            nir: Number(form.nir.value) || null,
            actas: form.actas.value,
            vr_ben: parseFloat(form.vr_ben.value) || 0,
            vr_reg: parseFloat(form.vr_reg.value) || 0,
            total: parseFloat(form.total.value) || 0,
            pago_cli: parseFloat(form.pago_cli.value) || 0,
            liquidacion: parseFloat(form.liquidacion.value) || 0,
            faltante: form.faltante.value || '',
            sobrante: form.sobrante.value || '',
            estado: form.estado.value
        };
        const err = validatePago(nuevo);
        if (err) {
            showError(form, err);
            return;
        }
        data.push(nuevo);
        setData("pagos",data);
        try { addAudit('create_pago','pagos', nuevo.id, {escritura:nuevo.escritura}); } catch(e){}
        renderTable();
        form.reset();
        clearError(form);
    };

    renderTable();
}
