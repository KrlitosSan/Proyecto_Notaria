import { getData, setData } from "./data.js";

export function renderCertificados(){
    const container=document.getElementById("certificados");
    const data=getData("certificados");
    container.innerHTML=`
    <h2>Certificados Emitidos</h2>
    <div style="margin-bottom:8px">
        <label>Mover seleccionados a: </label>
        <select id="target-phase-certificados">
            <option value="ingreso">Ingreso</option>
            <option value="pagos">Pagos</option>
            <option value="consolidado">Consolidado</option>
            <option value="particulares">Particulares</option>
        </select>
        <button id="btn-move-certificados" class="btn">Mover</button>
    </div>
    <table class="table" id="tabla-certificados">
        <thead><tr><th></th><th>Escritura</th><th>Nir</th><th>Sobrante</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody></tbody>
    </table>
    `;
    const tbody = document.querySelector('#tabla-certificados tbody');
    function renderTable(){
        const list = getData('certificados');
        // ensure all certificados are present in consolidado
        const cons = getData('consolidado');
        list.forEach(item=>{
            const exists = cons.some(c=>String(c.id)===String(item.id) && c.source==='certificados');
            if (!exists){
                cons.push({id: item.id, source:'certificados', escritura:item.escritura, nir:item.nir, monto:item.sobrante || 0, estado:item.estado || 'emitido'});
            }
        });
        setData('consolidado', cons);

        tbody.innerHTML = list.map((r,idx)=>`<tr data-id="${r.id}">
            <td><input type="checkbox" class="sel-cert" data-id="${r.id}"></td>
            <td>${r.escritura}</td>
            <td>${r.nir || ''}</td>
            <td>${r.sobrante != null ? Number(r.sobrante).toFixed(2) : ''}</td>
            <td>${r.estado || ''}</td>
            <td><button class="btn edit" data-idx="${idx}">Editar</button> <button class="btn del" data-idx="${idx}">Eliminar</button></td>
        </tr>`).join('');
        tbody.querySelectorAll('button.edit').forEach(b=>b.addEventListener('click',()=>editCert(b.dataset.idx)));
        tbody.querySelectorAll('button.del').forEach(b=>b.addEventListener('click',()=>delCert(b.dataset.idx)));
    }
    function editCert(idx){
        const list = getData('certificados');
        const item = list[idx];
        if (!item) return;
        item.estado = prompt('Estado', item.estado || 'emitido') || item.estado;
        setData('certificados', list);
        renderTable();
    }
    function delCert(idx){
        const list = getData('certificados');
        const rem = list.splice(idx,1)[0];
        setData('certificados', list);
        // remove consolidated entry if exists
        if (rem){
            const cons = getData('consolidado');
            const newCons = cons.filter(c=>!(String(c.id)===String(rem.id) && c.source==='certificados'));
            setData('consolidado', newCons);
        }
        renderTable();
    }
    renderTable();

    const btnMove = document.getElementById('btn-move-certificados');
    if (btnMove){
        btnMove.addEventListener('click', ()=>{
            const target = document.getElementById('target-phase-certificados').value;
            const checked = Array.from(document.querySelectorAll('#tabla-certificados .sel-cert:checked'));
            if (!checked.length) return alert('Selecciona al menos un registro');
            checked.forEach(ch=>{
                const id = ch.dataset.id;
                import('./consolidado.js').then(m=>{ m.moveItem('certificados', id, target); });
            });
            renderTable();
        });
    }

}
