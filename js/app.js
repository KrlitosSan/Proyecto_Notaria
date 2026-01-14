import { initData } from "./data.js";
import { renderIngreso } from "./ingreso.js";
import { renderPagos } from "./pagos.js";
import { renderParticulares } from "./particulares.js";
import { renderConsolidado } from "./consolidado.js";
import { renderCertificados } from "./certificados.js";
import { renderValidacion } from "./validacion.js";
import { renderAuditoria } from "./auditoria.js";

const sections = ["ingreso","pagos","particulares","consolidado","certificados","validacion","auditoria"];

window.addEventListener("DOMContentLoaded",()=>{
    initData();
    setupMenu();
    setupUser();
    showSection("ingreso");
});

export function showSection(id){
    sections.forEach(sec=>{
        const s=document.getElementById(sec);
        if(!s) return;
        s.classList.remove("visible");
        if(sec===id) s.classList.add("visible");
    });
    render(id);
}

function render(id){
    if(id==="ingreso")return renderIngreso();
    if(id==="pagos")return renderPagos();
    if(id==="particulares")return renderParticulares();
    if(id==="consolidado")return renderConsolidado();
    if(id==="certificados")return renderCertificados();
    if(id==="validacion")return renderValidacion();
    if(id==="auditoria")return renderAuditoria();
}

function setupMenu(){
    const btn = document.getElementById("btn-menu");
    const menu = document.getElementById("menu");
    const links = document.querySelectorAll(".menu-link");

    if (!btn || !menu) return; // seguridad si cambia el DOM

    // Accesibilidad: atributos iniciales
    btn.setAttribute('aria-controls', 'menu');
    btn.setAttribute('aria-expanded', menu.classList.contains('show') ? 'true' : 'false');
    menu.setAttribute('aria-hidden', menu.classList.contains('show') ? 'false' : 'true');

    const toggleMenu = (open) => {
        if (typeof open === 'boolean') {
            if (open) menu.classList.add('show');
            else menu.classList.remove('show');
        } else {
            menu.classList.toggle('show');
        }
        const expanded = menu.classList.contains('show') ? 'true' : 'false';
        btn.setAttribute('aria-expanded', expanded);
        menu.setAttribute('aria-hidden', expanded === 'true' ? 'false' : 'true');
    };

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    links.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.dataset.target;
            if (target) showSection(target);
            toggleMenu(false);
        });
    });

    // Cerrar menu al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (menu.classList.contains('show') && !menu.contains(e.target) && e.target !== btn) {
            toggleMenu(false);
        }
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('show')) {
            toggleMenu(false);
        }
    });
}

function setupUser(){
    const input = document.getElementById('usuario_actual');
    const btn = document.getElementById('btn-guardar-usuario');
    if (!input || !btn) return;
    input.value = localStorage.getItem('app_user') || '';
    btn.addEventListener('click', ()=>{
        const val = String(input.value||'').trim();
        localStorage.setItem('app_user', val);
        // small feedback
        const prev = document.createElement('div');
        prev.className = 'toast';
        prev.textContent = 'Usuario guardado: ' + (val||'--');
        document.body.appendChild(prev);
        setTimeout(()=>prev.remove(), 2000);
        // record audit event for user change
        import('./data.js').then(m=>{ try { m.addAudit('set_user','system', null, {user: val}); } catch(e){} }).catch(()=>{});
    });
}
