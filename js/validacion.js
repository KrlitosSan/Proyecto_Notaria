import { getData, addActa, setActas, findActasByEscritura, sumActas, joinActas, addAudit } from "./data.js";

export function renderValidacion(){
    const container = document.getElementById('validacion');
    const actas = getData('validacion');

    container.innerHTML = `
        <h2>Validación de Actas</h2>
        <div class="validacion-controls">
            <form id="form-validacion" class="form">
                <input id="acta" placeholder="Acta" required>
                <input id="fecha_acta" type="date" placeholder="Fecha Acta">
                <input id="tipo_deposito" placeholder="Tipo Deposito (BEN/REG)">
                <input id="cliente" placeholder="Cliente">
                <input id="documento" placeholder="Documento">
                <input id="radicado" placeholder="Radicado">
                <input id="escritura" placeholder="Escritura">
                <input id="ano" placeholder="Año">
                <input id="valor_acta" type="number" step="0.01" placeholder="Valor Acta">
                <input id="constructora" placeholder="Constructora">
                <input id="estado" placeholder="Estado">
                <textarea id="observaciones" placeholder="Observaciones"></textarea>
                <button type="submit" class="btn">Agregar Acta</button>
            </form>
            <div style="margin-top:8px">
                <input id="csv-file" type="file" accept=".csv">
                <button id="btn-import" class="btn">Importar CSV</button>
            </div>
        </div>
        <div style="margin-bottom:8px">
            <label>Mover seleccionados a: </label>
            <select id="target-phase-validacion">
                <option value="consolidado">Consolidado</option>
                <option value="ingreso">Ingreso</option>
                <option value="pagos">Pagos</option>
                <option value="certificados">Certificados</option>
            </select>
            <button id="btn-move-validacion" class="btn">Mover</button>
        </div>
        <table class="table" id="tabla-validacion">
            <thead><tr><th></th><th>Acta</th><th>Fecha</th><th>Tipo</th><th>Cliente</th><th>Escritura</th><th>Año</th><th>Valor</th><th>Constructora</th><th>Estado</th><th>Obs</th><th>Acciones</th></tr></thead>
            <tbody></tbody>
        </table>
    `;

    const form = document.getElementById('form-validacion');
    const tbody = document.querySelector('#tabla-validacion tbody');
    const fileInput = document.getElementById('csv-file');

    function renderTable(){
        const list = getData('validacion');
        tbody.innerHTML = list.map((r, idx) => `
            <tr data-id="${r.id || ''}" data-idx="${idx}">
                <td><input type="checkbox" class="sel-acta" data-id="${r.id || ''}"></td>
                <td>${r.acta || ''}</td>
                <td>${r.fecha_acta || ''}</td>
                <td>${r.tipo_deposito || ''}</td>
                <td>${r.cliente || ''}</td>
                <td>${r.escritura || ''}</td>
                <td>${r.ano || ''}</td>
                <td>${r.valor_acta != null ? Number(r.valor_acta).toFixed(2) : ''}</td>
                <td>${r.constructora || ''}</td>
                <td>${r.estado || ''}</td>
                <td>${r.observaciones || ''}</td>
                <td>
                    <button class="btn edit" data-idx="${idx}">Editar</button>
                    <button class="btn del" data-idx="${idx}">Borrar</button>
                </td>
            </tr>
        `).join('');
        tbody.querySelectorAll('button.edit').forEach(btn=>btn.addEventListener('click', ()=>editActa(btn.dataset.idx)));
        tbody.querySelectorAll('button.del').forEach(btn=>{btn.addEventListener('click', ()=>deleteActa(btn.dataset.idx))});
    }

    // Move handler
    const btnMoveVal = document.getElementById('btn-move-validacion');
    if (btnMoveVal){
        btnMoveVal.addEventListener('click', ()=>{
            const target = document.getElementById('target-phase-validacion').value;
            const checked = Array.from(document.querySelectorAll('#tabla-validacion .sel-acta:checked'));
            if (!checked.length) return alert('Selecciona al menos un registro');
            checked.forEach(ch=>{
                const id = ch.dataset.id;
                import('./consolidado.js').then(m=>{ m.moveItem('validacion', id, target); });
            });
            renderTable();
        });
    }

    function editActa(idx){
        const list = getData('validacion');
        const a = list[idx];
        if (!a) return;
        // Use modal for friendly editing
        import('./ui.js').then(mod => {
            mod.showModal({
                title: 'Editar Acta',
                fields: [
                    {name:'acta', label:'Acta'},
                    {name:'fecha_acta', label:'Fecha Acta', type:'date'},
                    {name:'tipo_deposito', label:'Tipo Deposito'},
                    {name:'cliente', label:'Cliente'},
                    {name:'documento', label:'Documento'},
                    {name:'radicado', label:'Radicado'},
                    {name:'escritura', label:'Escritura'},
                    {name:'ano', label:'Año'},
                    {name:'valor_acta', label:'Valor Acta', type:'number', attrs:{step:'0.01'}},
                    {name:'constructora', label:'Constructora'},
                    {name:'estado', label:'Estado'},
                    {name:'observaciones', label:'Observaciones', type:'textarea'}
                ],
                values: a,
                onSave: (vals)=>{
                    const updated = Object.assign({}, a, vals);
                    updated.valor_acta = Number(updated.valor_acta)||0;
                    list[idx] = updated;
                    setActas(list);
                    try { addAudit('update_acta','validacion', updated.acta || null, {escritura: updated.escritura}); } catch(e){}
                    renderTable();
                }
            });
        });
    }

    function deleteActa(idx){
        const list = getData('validacion');
        const removed = list.splice(idx,1)[0];
        setActas(list);
        try { addAudit('delete_acta','validacion', removed ? removed.acta : null, {escritura: removed ? removed.escritura : null}); } catch(e){}
        renderTable();
    }

    form.onsubmit = (e) => {
        e.preventDefault();
        const item = {
            acta: form.acta.value.trim(),
            fecha_acta: form.fecha_acta.value,
            tipo_deposito: form.tipo_deposito.value.trim(),
            cliente: form.cliente.value.trim(),
            documento: form.documento.value.trim(),
            radicado: form.radicado.value.trim(),
            escritura: form.escritura.value.trim(),
            ano: form.ano.value.trim(),
            valor_acta: parseFloat(form.valor_acta.value) || 0,
            constructora: form.constructora.value.trim(),
            estado: form.estado.value.trim(),
            observaciones: form.observaciones.value.trim()
        };
        addActa(item);
        renderTable();
        form.reset();
    };

    // improved import with report and robust CSV parser
    document.getElementById('btn-import').addEventListener('click', ()=>{
        const file = fileInput.files[0];
        const reportElId = 'import-report';
        let reportEl = document.getElementById(reportElId);
        if (!reportEl) {
            reportEl = document.createElement('div');
            reportEl.id = reportElId;
            reportEl.className = 'import-report';
            fileInput.parentNode.appendChild(reportEl);
        }
        reportEl.textContent = 'Importando...';
        if (!file) { reportEl.textContent = 'Selecciona un archivo CSV primero'; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            let rows, errors = [];
            try {
                rows = parseCSVRobust(text);
            } catch (err) {
                reportEl.textContent = 'Error parseando CSV: ' + err.message;
                return;
            }
            const existing = getData('validacion');
            let added = 0, skipped = 0, parsed = rows.length;
            for (const r of rows) {
                // normalize keys (headers are normalized by parser)
                const item = {
                    acta: r['acta'] || '',
                    fecha_acta: r['fecha_acta'] || '',
                    tipo_deposito: r['tipo_deposito'] || '',
                    cliente: r['cliente'] || '',
                    documento: r['documento'] || '',
                    radicado: r['radicado'] || '',
                    escritura: r['escritura'] || '',
                    ano: r['ano'] || '',
                    valor_acta: Number(r['valor_acta']) || 0,
                    constructora: r['constructora'] || '',
                    estado: r['estado'] || '',
                    observaciones: r['observaciones'] || ''
                };
                // simple duplicate check: acta+escritura+tipo
                const dup = existing.some(e => String(e.acta) === String(item.acta) && String(e.escritura) === String(item.escritura) && String(e.tipo_deposito) === String(item.tipo_deposito));
                if (dup) { skipped++; continue; }
                existing.push(item);
                added++;
            }
            setActas(existing);
            try { addAudit('import_actas','validacion', null, {parsed, added, skipped}); } catch(e){}
            reportEl.innerHTML = `Import complete: <strong>parsed=${parsed}</strong>, <strong>added=${added}</strong>, <strong>skipped=${skipped}</strong>`;
            renderTable();
        };
        reader.readAsText(file, 'utf-8');
    });

    // Robust CSV parser: autodetect separator, handle quoted fields and header normalization
    function parseCSVRobust(text){
        const lines = text.split(/\r?\n/).filter(l=>l.trim());
        if (!lines.length) return [];
        // detect separator from header line
        const headerLine = lines[0];
        const sep = headerLine.includes(';') && !headerLine.includes(',') ? ';' : ',';

        function splitLine(line){
            const res = [];
            let cur = '';
            let inQuotes = false;
            for (let i=0;i<line.length;i++){
                const ch = line[i];
                if (ch === '"') {
                    if (inQuotes && line[i+1] === '"') { cur += '"'; i++; continue; }
                    inQuotes = !inQuotes; continue;
                }
                if (ch === sep && !inQuotes){ res.push(cur); cur = ''; continue; }
                cur += ch;
            }
            res.push(cur);
            return res;
        }

        const headers = splitLine(lines[0]).map(h=>h.trim().toLowerCase().replace(/\s+/g,'_'));
        const rows = [];
        for (let i=1;i<lines.length;i++){
            const cols = splitLine(lines[i]);
            const obj = {};
            for (let j=0;j<headers.length;j++) obj[headers[j]] = cols[j] ? cols[j].trim() : '';
            rows.push(obj);
        }
        return rows;
    }

    function parseCSV(text) {
        // basic CSV parser: split lines, handle quoted values
        const lines = text.split(/\r?\n/).filter(l=>l.trim());
        if (!lines.length) return [];
        const headers = splitCSVLine(lines[0]);
        const rows = [];
        for (let i=1;i<lines.length;i++){
            const cols = splitCSVLine(lines[i]);
            const obj = {};
            for (let j=0;j<headers.length;j++) obj[headers[j].trim()] = cols[j] ? cols[j].trim() : '';
            rows.push(obj);
        }
        return rows;
    }

    function splitCSVLine(line){
        const res = [];
        let cur = '', inQuotes = false;
        for (let i=0;i<line.length;i++){
            const ch = line[i];
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === ',' && !inQuotes) { res.push(cur); cur = ''; continue; }
            cur += ch;
        }
        res.push(cur);
        return res;
    }

    renderTable();
}
