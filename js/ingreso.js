import { getData,setData,addData,uuid,today,findActasByEscritura,sumActas,joinActas,addAudit } from "./data.js";
import { showSection } from "./app.js";
import { validateIngreso } from "./validation.js";

export function renderIngreso(){
    const container=document.getElementById("ingreso");
    container.innerHTML=`
    <h2>Ingreso</h2>
    <form id="form-ingreso" class="form">
        <input id="escritura" type="number" placeholder="Escritura" required>
        <input id="nir" type="number" placeholder="Nir">
        <select id="pago">
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
        </select>
        <input id="cert" type="number" placeholder="Cert">
        <input id="responsable" placeholder="Responsable">
        <textarea id="observaciones" placeholder="Observaciones"></textarea>
        <select id="estado">
            <option value="normal" selected>Normal</option>
            <option value="particular">Particular</option>
        </select>
        <button type="submit" class="btn">Guardar</button>
    </form>
    <div style="margin-bottom:8px">
        <label>Mover seleccionados a: </label>
        <select id="target-phase-ingreso">
            <option value="pagos">Pagos</option>
            <option value="particulares">Particulares</option>
            <option value="consolidado">Consolidado</option>
            <option value="certificados">Certificados</option>
        </select>
        <button id="btn-move-ingreso" class="btn">Mover</button>
    </div>
    <table class="table" id="tabla-ingreso">
        <thead><tr><th></th><th>Escritura</th><th>Nir</th><th>Pago</th><th>Responsable</th><th>Acciones</th></tr></thead>
        <tbody></tbody>
    </table>
    `;
    const form=document.getElementById("form-ingreso");
    const tbody=document.querySelector("#tabla-ingreso tbody");
    const data=getData("ingreso");


    function renderTable(){
        tbody.innerHTML=data.map((r,idx)=>`<tr data-id="${r.id}">
            <td><input type="checkbox" class="sel-ing" data-id="${r.id}"></td>
            <td>${r.escritura}</td>
            <td>${r.nir||''}</td>
            <td>${r.pago||''}</td>
            <td>${r.responsable||''}</td>
            <td>
              <button class="btn send" data-id="${r.id}">Enviar a Pagos</button>
              <button class="btn edit" data-idx="${idx}">Editar</button>
            </td>
        </tr>`).join("");
        tbody.querySelectorAll("button.send").forEach(btn=>{btn.addEventListener("click",()=>sendToPagos(btn.dataset.id));});
        tbody.querySelectorAll("button.edit").forEach(btn=>{btn.addEventListener("click",()=>editIngreso(btn.dataset.idx));});
    }

    function sendToPagos(id){
        const item=data.find(r=>r.id===id);
        if(!item)return;
        const pagos=getData("pagos");
        const sums = sumActas(item.escritura);
        const pago_cli = sums.total;
        const total = (Number(sums.vr_ben)||0) + (Number(sums.vr_reg)||0);
        const nuevoPago = {
            id: item.id,
            escritura: item.escritura,
            nir: item.nir,
            vr_ben: sums.vr_ben,
            vr_reg: sums.vr_reg,
            total: total,
            pago_cli: pago_cli,
            liquidacion: 0,
            faltante: (pago_cli >= total) ? '' : (total - pago_cli),
            sobrante: (pago_cli <= total) ? '' : (pago_cli - total),
            actas: joinActas(item.escritura),
            // preserve ingreso estado when moving to pagos
            estado: item.estado || (sums.actas.length ? 'pagado' : 'pendiente')
        };
        pagos.push(nuevoPago);
        setData("pagos",pagos);
        setData("ingreso",data.filter(r=>r.id!==id));
        // audit
        try { addAudit('create_pago','pagos', nuevoPago.id, {from:'ingreso', origen_id:item.id, escritura:item.escritura}); } catch(e){console.warn('Audit failed', e)}
        renderIngreso();
        showSection("pagos");
    }

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

    form.escritura.addEventListener('change', () => {
        const val = Number(form.escritura.value) || 0;
        const sums = sumActas(val);
        const actas = findActasByEscritura(val);
        if (sums && sums.actas && sums.actas.length) {
            form.pago.value = 'pagado';
        } else {
            form.pago.value = 'pendiente';
        }
        // if there are actas and responsable empty, map constructora -> responsable
        if (actas && actas.length && !form.responsable.value) {
            form.responsable.value = actas[0].constructora || '';
        }
    });

    form.onsubmit = (e) => {
        e.preventDefault();
        clearError(form);
        const nuevo = {
            id: uuid(),
            escritura: Number(form.escritura.value) || 0,
            nir: Number(form.nir.value) || null,
            pago: form.pago.value,
            cert: Number(form.cert.value) || null,
            responsable: String(form.responsable.value).trim(),
            observaciones: String(form.observaciones.value).trim(),
            estado: form.estado.value
        };
        // auto status based on actas
        const sums = sumActas(nuevo.escritura);
        if (sums && sums.actas && sums.actas.length) {
            // if there are actas mark as pagado by default
            nuevo.pago = 'pagado';
        }

        const err = validateIngreso(nuevo);
        if (err) {
            showError(form, err);
            return;
        }

        if (nuevo.estado === 'particular') {
            // move directly to particulares
            const parts = getData('particulares');
            parts.push(nuevo);
            setData('particulares', parts);
            try { addAudit('create_particular','particulares', nuevo.id, {escritura:nuevo.escritura}); } catch(e){}
        } else {
            data.push(nuevo);
            setData("ingreso",data);
            try { addAudit('create_ingreso','ingreso', nuevo.id, {escritura:nuevo.escritura}); } catch(e){}
        }
        renderTable();
        form.reset();
        clearError(form);
    };

    renderTable();

    // Edit handler to modify NIR and Responsable
    function editIngreso(idx){
        const item = data[idx];
        if (!item) return;
        import('./ui.js').then(mod=>{
            mod.showModal({
                title: 'Editar Ingreso',
                fields: [
                    {name:'nir', label:'Nir', type:'number'},
                    {name:'responsable', label:'Responsable'}
                ],
                values: item,
                onSave: (vals)=>{
                    item.nir = Number(vals.nir) || item.nir;
                    item.responsable = String(vals.responsable || item.responsable).trim();
                    setData('ingreso', data);
                    try { addAudit('update_ingreso','ingreso', item.id, {escritura:item.escritura}); } catch(e){}
                    renderTable();
                }
            });
        });
    }

    // Move selected from ingreso to target
    const btnMove = document.getElementById('btn-move-ingreso');
    if (btnMove){
        btnMove.addEventListener('click', ()=>{
            const target = document.getElementById('target-phase-ingreso').value;
            const checked = Array.from(document.querySelectorAll('#tabla-ingreso .sel-ing:checked'));
            if (!checked.length) return alert('Selecciona al menos un registro');
            checked.forEach(ch=>{
                const id = ch.dataset.id;
                import('./consolidado.js').then(m=>{ m.moveItem('ingreso', id, target); });
            });
            renderIngreso();
        });
    }
}
