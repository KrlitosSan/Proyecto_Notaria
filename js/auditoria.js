import { getAudit, exportAuditCSV, clearAudit, addAudit } from "./data.js";

export function renderAuditoria(){
    const container = document.getElementById('auditoria');
    const logs = getAudit();
    container.innerHTML = `
        <h2>Auditoría</h2>
        <div style="margin-bottom:8px">
            <button id="btn-export-audit" class="btn">Exportar CSV</button>
            <button id="btn-clear-audit" class="btn">Limpiar Auditoría</button>
        </div>
        <table class="table" id="tabla-auditoria">
            <thead><tr><th>Fecha</th><th>Acción</th><th>Módulo</th><th>Item</th><th>Usuario</th><th>Detalles</th></tr></thead>
            <tbody>
                ${logs.map(l=>`<tr><td>${l.timestamp}</td><td>${l.action}</td><td>${l.module}</td><td>${l.itemId||''}</td><td>${l.user||''}</td><td>${JSON.stringify(l.details)||''}</td></tr>`).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('btn-export-audit').addEventListener('click', ()=>{
        const csv = exportAuditCSV();
        const blob = new Blob([csv], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });

    document.getElementById('btn-clear-audit').addEventListener('click', ()=>{
        if (!confirm('¿Limpiar todos los registros de auditoría?')) return;
        clearAudit();
        addAudit('clear_audit','auditoria', null, {note: 'user_cleared'});
        renderAuditoria();
    });
}
