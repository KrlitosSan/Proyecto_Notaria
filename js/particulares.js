import { getData } from "./data.js";

export function renderParticulares(){
    const container=document.getElementById("particulares");
    const data=getData("particulares");
    container.innerHTML=`
    <h2>Particulares</h2>
    <div style="margin-bottom:8px">
        <label>Mover seleccionados a: </label>
        <select id="target-phase-particulares">
            <option value="ingreso">Ingreso</option>
            <option value="pagos">Pagos</option>
            <option value="consolidado">Consolidado</option>
            <option value="certificados">Certificados</option>
        </select>
        <button id="btn-move-particulares" class="btn">Mover</button>
    </div>
    <table class="table">
        <thead><tr><th></th><th>Escritura</th><th>Nir</th><th>Responsable</th></tr></thead>
        <tbody>${data.map(r=>`<tr data-id="${r.id || ''}"><td><input type="checkbox" class="sel-part" data-id="${r.id || ''}"></td><td>${r.escritura || r.numero || ''}</td><td>${r.nir || ''}</td><td>${r.responsable || r.cliente || ''}</td></tr>`).join("")}</tbody>
    </table>
    `;

    const btnMove = document.getElementById('btn-move-particulares');
    if (btnMove){
        btnMove.addEventListener('click', ()=>{
            const target = document.getElementById('target-phase-particulares').value;
            const checked = Array.from(document.querySelectorAll(' #particulares .sel-part:checked'));
            if (!checked.length) return alert('Selecciona al menos un registro');
            checked.forEach(ch=>{
                const id = ch.dataset.id;
                import('./consolidado.js').then(m=>{ m.moveItem('particulares', id, target); });
            });
            renderParticulares();
        });
    }
}
