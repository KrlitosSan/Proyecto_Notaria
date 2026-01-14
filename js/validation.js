// js/validation.js

export function validateIngreso(data) {
    if (!data.escritura || Number(data.escritura) <= 0) {
        return "Es necesario indicar la Escritura.";
    }
    // responsable not mandatory but can be validated if needed
    return null;
}

export function validatePago(data) {
    if (!data.escritura || Number(data.escritura) <= 0) {
        return "Debe indicar la Escritura para el pago.";
    }
    if (isNaN(Number(data.total)) || Number(data.total) < 0) {
        return "Total inválido.";
    }
    return null;
}
