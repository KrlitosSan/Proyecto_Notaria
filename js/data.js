const STORAGE_KEY = "sistema_notarial_v1";

let DB = {
    ingreso: [],
    pagos: [],
    particulares: [],
    certificados: [],
    consolidado: [],
    validacion: [],
    auditoria: []
};

export function initData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                // merge to keep default keys
                DB = Object.assign(DB, parsed);
            } else {
                throw new Error('Invalid DB format');
            }
        } catch (e) {
            console.warn('LocalStorage DB corrupted or incompatible. Resetting to defaults.', e);
            DB = {
                ingreso: [],
                pagos: [],
                particulares: [],
                certificados: [],
                consolidado: [],
                validacion: []
            };
            saveDB();
        }
    } else {
        saveDB();
    }
}

export function saveDB() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
    } catch (e) {
        console.error('Failed to save DB to localStorage', e);
    }
}

export function getData(modulo) {
    const data = DB[modulo] || [];
    // return a deep clone to avoid external accidental mutations
    return JSON.parse(JSON.stringify(data));
}

export function setData(modulo, data) {
    DB[modulo] = Array.isArray(data) ? data : [];
    saveDB();
}

export function addData(modulo, item) {
    if (!Array.isArray(DB[modulo])) DB[modulo] = [];
    DB[modulo].push(item);
    saveDB();
}

export function uuid() {
    return crypto.randomUUID();
}

export function today() {
    return new Date().toISOString().split("T")[0];
}

// ---------- Validación / Actas helpers ----------
export function getActas() {
    return getData('validacion');
}

export function addActa(acta) {
    if (!DB.validacion) DB.validacion = [];
    // Normalize and push
    const a = Object.assign({}, acta);
    // ensure numeric value
    a.valor_acta = Number(a.valor_acta) || 0;
    // ensure stable id
    a.id = a.id || uuid();
    DB.validacion.push(a);
    saveDB();
}

export function setActas(list) {
    DB.validacion = Array.isArray(list) ? list.map(a => ({
        ...a,
        id: a.id || uuid(),
        valor_acta: Number(a.valor_acta) || 0
    })) : [];
    saveDB();
}

export function findActasByEscritura(escritura) {
    if (!escritura && escritura !== 0) return [];
    const val = String(escritura);
    return (DB.validacion || []).filter(a => String(a.escritura) === val);
}

export function sumActas(escritura) {
    const actas = findActasByEscritura(escritura);
    let vr_ben = 0, vr_reg = 0, total = 0;
    for (const a of actas) {
        const tipo = String(a.tipo_deposito || '').toUpperCase();
        const v = Number(a.valor_acta) || 0;
        if (tipo.includes('BEN')) vr_ben += v;
        else if (tipo.includes('REG')) vr_reg += v;
        total += v;
    }
    return {vr_ben, vr_reg, total, actas};
}

export function joinActas(escritura) {
    const actas = findActasByEscritura(escritura).map(a => String(a.acta).trim()).filter(Boolean);
    // unique
    const uniq = [...new Set(actas)];
    return uniq.join('-');
}

// ---------- Auditoría ----------
export function addAudit(action, moduleName, itemId = null, details = {}) {
    const entry = {
        id: uuid(),
        timestamp: new Date().toISOString(),
        action: String(action),
        module: String(moduleName || ''),
        itemId: itemId || null,
        details: details || {},
        user: localStorage.getItem('app_user') || 'unknown'
    };
    if (!DB.auditoria) DB.auditoria = [];
    DB.auditoria.push(entry);
    saveDB();
    return entry;
}

export function getAudit() {
    return getData('auditoria');
}

export function clearAudit() {
    DB.auditoria = [];
    saveDB();
}

export function exportAuditCSV() {
    const rows = getAudit();
    if (!rows.length) return '';
    const headers = ['id','timestamp','action','module','itemId','user','details'];
    const lines = [headers.join(',')];
    for (const r of rows) {
        const details = JSON.stringify(r.details || {});
        const vals = [r.id, r.timestamp, r.action, r.module, r.itemId || '', r.user || '', '"' + String(details).replace(/"/g,'""') + '"'];
        lines.push(vals.join(','));
    }
    return lines.join('\n');
}

export function retireActas(escritura){
    if (!DB.validacion) DB.validacion = [];
    let changed = 0;
    for (const a of DB.validacion){
        if (String(a.escritura) === String(escritura)){
            if (String(a.estado || '').toLowerCase() !== 'retirado'){
                a.estado = 'retirado';
                changed++;
            }
        }
    }
    if (changed) saveDB();
    try { addAudit('retire_actas','validacion', null, {escritura, changed}); } catch(e){}
    return changed;
}

