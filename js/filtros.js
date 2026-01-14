// js/filtros.js

export function filtrarPorFecha(lista, campo, fecha) {
    return lista.filter(item => item[campo] === fecha);
}

export function filtrarParticulares(lista) {
    return lista.filter(item => item.estado === "particular");
}

export function filtrarNoParticulares(lista) {
    return lista.filter(item => item.estado !== "particular");
}
