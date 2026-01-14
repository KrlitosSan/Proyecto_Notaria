import { getData, setData, addAudit } from "./data.js";

export function renderConsolidado(){
    const container=document.getElementById("consolidado");
    const pagos=getData("pagos");
    const certs=getData("certificados");

    const consolidadoList = getData('consolidado') || [];
    const rows = [
        ...pagos.map(p=>({source:'pagos', id:p.id, escritura:p.escritura || p.numero, nir:p.nir, monto:p.total || 0, estado:p.estado||''})),
        ...certs.map(c=>({source:'certificados', id:c.id, escritura:c.escritura || c.numero, nir:c.nir, monto:c.sobrante||0, estado:c.estado||''})),
        ...consolidadoList.map(c=>({source:c.source || 'consolidado', id:c.id, escritura:c.escritura || '', nir:c.nir || '', monto:c.monto || 0, estado:c.estado || ''}))
    ];

    container.innerHTML=`
    <h2>Consolidado</h2>
    <div style="margin-bottom:8px">
        <label>Mover seleccionados a: </label>
        <select id="target-phase">
            <option value="ingreso">Ingreso</option>
            <option value="pagos">Pagos</option>
            <option value="certificados">Certificados</option>
            <option value="particulares">Particulares</option>
            <option value="consolidado">Consolidado</option>
        </select>
        <button id="btn-move" class="btn">Mover</button>
    </div>
    <table class="table" id="tabla-consolidado">
        <thead><tr><th></th><th>Origen</th><th>Escritura</th><th>Nir</th><th>Monto</th><th>Estado</th></tr></thead>
        <tbody>
        ${rows.map((r,idx)=>`<tr data-idx="${idx}" data-source="${r.source}" data-id="${r.id}"><td><input type="checkbox" class="sel"></td><td>${r.source}</td><td>${r.escritura}</td><td>${r.nir||''}</td><td>${r.monto != null ? Number(r.monto).toFixed(2) : '0.00'}</td><td>${r.estado||''}</td></tr>`).join("")}
        </tbody>
    </table>
    `;

    document.getElementById('btn-move').addEventListener('click', ()=>{
        const target = document.getElementById('target-phase').value;
        const checked = Array.from(document.querySelectorAll('#tabla-consolidado tbody input.sel:checked'));
        if (!checked.length) return alert('Selecciona al menos un registro');
        checked.forEach(ch=>{
            const tr = ch.closest('tr');
            const source = tr.dataset.source;
            const id = tr.dataset.id;
            // use shared moveItem helper
            try { moveItem(source, id, target); } catch(e) { console.warn('Move failed', e); }
        });
        // re-render
        renderConsolidado();
    });
}

export function moveItem(source, id, target){
    // generic move logic used by other modules

    // helper: remove id from all known modules except those excluded
    function removeIdFromAllModules(itemId, exclude = []){
        const modules = ['ingreso','pagos','certificados','particulares','consolidado'];
        for (const mod of modules){
            if (exclude.includes(mod)) continue;
            const list = getData(mod) || [];
            const newList = list.filter(it => String(it.id) !== String(itemId));
            if (newList.length !== list.length) setData(mod, newList);
        }
    }

    const srcList = getData(source) || [];
    let item = srcList.find(it => String(it.id) === String(id));

    // if source is 'consolidado' the entry shape is different
    if (!item && source === 'consolidado'){
        const cons = getData('consolidado') || [];
        item = cons.find(c => String(c.id) === String(id));
        if(!item) return false;
        // remove consolidado entry (we will re-add as needed)
        const newCons = cons.filter(c=>String(c.id)!==String(id));
        setData('consolidado', newCons);
    }

    if (!item) return false;

    // Do not remove from source yet — perform removal after target logic to avoid losing data required to create the target (especialmente para validacion)
    let pendingRemoval = false; // will remove after target handling
    // if source is consolidado we already removed above; mark pendingRemoval false for that
    if (source !== 'consolidado') pendingRemoval = true;

    // handle target specialized logic
    if (target === 'consolidado'){
        // Before adding, ensure uniqueness across modules (except validacion and consolidado)
        removeIdFromAllModules(item.id, ['consolidado','validacion']);
        const tgt = getData('consolidado') || [];
        const exists = tgt.some(c => String(c.id) === String(item.id) && String(c.source||source) === String(source));
        if (!exists){
            const monto = item.sobrante != null ? (Number(item.sobrante)||0) : (Number(item.total)||Number(item.monto)||0);
            tgt.push({id: item.id, source: source, escritura: item.escritura || item.numero || '', nir: item.nir || '', monto: monto, estado: item.estado || ''});
            setData('consolidado', tgt);
            try { addAudit('add_consolidado','consolidado', item.id, {from:source, escritura: item.escritura}); } catch(e){}
        }
        // after adding to consolidado, remove from source (if needed)
        if (pendingRemoval){
            if (source === 'validacion'){
                const vals = getData('validacion') || [];
                const newVals = vals.filter(x=>String(x.id)!==String(id));
                import('./data.js').then(m=>{ if(m.setActas) m.setActas(newVals); }).catch(()=>{});
            } else {
                const newSrc2 = getData(source).filter(it=>String(it.id)!==String(id));
                setData(source, newSrc2);
            }
        }
    } else if (target === 'certificados'){
        // If moving from validacion -> create certificado from acta (keep acta copy)
        if (source === 'validacion'){
            const actas = getData('validacion') || [];
            const a = actas.find(x => String(x.id) === String(id));
            if (!a) return false;
            // create certificado if not exists
            const certs = getData('certificados') || [];
            const existsCert = certs.some(c => String(c.id) === String(a.id) || String(c.escritura) === String(a.escritura));
            if (!existsCert){
                const cert = { id: a.id, escritura: a.escritura, nir: a.nir || null, sobrante: 0, estado: 'emitido' };
                certs.push(cert);
                setData('certificados', certs);
                try { addAudit('create_certificado','certificados', cert.id, {from:'validacion', escritura:cert.escritura}); } catch(e){}
                // retire actas for escritura
                try { import('./data.js').then(m=>{ if (m.retireActas) m.retireActas(cert.escritura); }); } catch(e){}
                // also add to consolidado
                removeIdFromAllModules(cert.id, ['consolidado','validacion']);
                const cons = getData('consolidado') || [];
                const existsCons = cons.some(c => String(c.id) === String(cert.id) && c.source === 'certificados');
                if (!existsCons){ cons.push({id:cert.id, source:'certificados', escritura:cert.escritura, nir:cert.nir || '', monto:cert.sobrante || 0, estado:cert.estado}); setData('consolidado', cons); try{ addAudit('add_consolidado','consolidado', cert.id, {from:'validacion', escritura:cert.escritura}) }catch(e){} }
                try{ import('./ui.js').then(u=>u.showToast('Certificado creado desde Validación')) } catch(e){}
            }
            // after creating certificado, if we need to remove original acta from validacion, do it now
            if (pendingRemoval && source === 'validacion'){
                const vals2 = getData('validacion') || [];
                const newVals2 = vals2.filter(x=>String(x.id)!==String(id));
                import('./data.js').then(m=>{ if(m.setActas) m.setActas(newVals2); }).catch(()=>{});
            }
        } else {
            // general move into certificados (item already available)
            removeIdFromAllModules(item.id, ['certificados','validacion']);
            const tgt = getData('certificados') || [];
            const exists = tgt.some(c => String(c.id) === String(item.id) || String(c.escritura) === String(item.escritura));
            if (!exists) {
                const cert = { id: item.id, escritura: item.escritura, nir: item.nir || null, sobrante: item.sobrante || item.monto || 0, estado: item.estado || 'emitido' };
                tgt.push(cert);
                setData('certificados', tgt);
                try { addAudit('create_certificado','certificados', cert.id, {from:source, escritura:cert.escritura}); } catch(e){}
            }
            // after creating certificado, remove original from source if needed
            if (pendingRemoval){
                if (source === 'validacion'){
                    const vals2 = getData('validacion') || [];
                    const newVals2 = vals2.filter(x=>String(x.id)!==String(id));
                    import('./data.js').then(m=>{ if(m.setActas) m.setActas(newVals2); }).catch(()=>{});
                } else {
                    const newSrc2 = getData(source).filter(it=>String(it.id)!==String(id));
                    setData(source, newSrc2);
                }
            }
        }
    } else {
        // default: push object representation into target and remove duplicates
        removeIdFromAllModules(item.id, [target,'validacion']);
        const tgt = getData(target) || [];
        const exists = tgt.some(c => String(c.id) === String(item.id));
        if (!exists) { tgt.push(item); setData(target, tgt); }
    }

    try { addAudit('move', source, item.id || null, {to:target, escritura:item.escritura || ''}); } catch(e){}
    return true;
}
