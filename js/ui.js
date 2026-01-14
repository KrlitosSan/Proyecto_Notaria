// UI helpers: modal component
let _modalEl = null;

export function ensureModal(){
    if (_modalEl) return _modalEl;
    _modalEl = document.createElement('div');
    _modalEl.id = 'app-modal';
    _modalEl.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop" style="display:none;">
      <div class="modal-window">
        <h3 id="modal-title"></h3>
        <div id="modal-body"></div>
        <div style="margin-top:8px;text-align:right">
          <button id="modal-cancel" class="btn">Cancelar</button>
          <button id="modal-save" class="btn">Guardar</button>
        </div>
      </div>
    </div>
    `;
    document.body.appendChild(_modalEl);
    // setup events
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    return _modalEl;
}

export function showModal({title = '', fields = [], values = {}, onSave}){
    ensureModal();
    const backdrop = document.getElementById('modal-backdrop');
    document.getElementById('modal-title').textContent = title;
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    fields.forEach(f=>{
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '8px';
        const label = document.createElement('label');
        label.textContent = f.label || f.name;
        label.style.display = 'block';
        const input = f.type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
        if (f.type !== 'textarea') input.type = f.type || 'text';
        if (f.attrs) Object.entries(f.attrs).forEach(([k,v])=>input.setAttribute(k,v));
        input.id = 'modal-field-' + f.name;
        input.value = values[f.name] != null ? values[f.name] : (f.default || '');
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        body.appendChild(wrapper);
    });
    const saveBtn = document.getElementById('modal-save');
    const handler = () => {
        const out = {};
        fields.forEach(f=>{
            const el = document.getElementById('modal-field-'+f.name);
            out[f.name] = el ? el.value : null;
        });
        if (onSave) onSave(out);
        closeModal();
    };
    saveBtn.onclick = handler;
    backdrop.style.display = 'block';
}

export function closeModal(){
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.style.display = 'none';
}

export function showToast(msg, duration = 2000){
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    el.style.position = 'fixed';
    el.style.right = '16px';
    el.style.bottom = '16px';
    el.style.zIndex = '10000';
    document.body.appendChild(el);
    setTimeout(()=>{ try{ el.remove(); } catch(e){} }, duration);
}
