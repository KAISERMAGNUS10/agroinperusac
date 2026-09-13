function leerTickets() {
    try {
        return JSON.parse(localStorage.getItem('agro_tickets_db')) || [];
    } catch (e) {
        return [];
    }
}

function guardarTickets(db) {
    localStorage.setItem('agro_tickets_db', JSON.stringify(db));
}

function formatearFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-PE', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
}

function mostrarToast(mensaje, tipo) {
    const contenedor = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast' + (tipo === 'exito' ? ' exito' : '');
    toast.textContent = mensaje;
    contenedor.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('mostrar'));

    setTimeout(() => {
        toast.classList.remove('mostrar');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const listaPicking = document.getElementById('lista-picking');
const emptyState = document.getElementById('wms-empty-state');
const contador = document.getElementById('wms-contador');

function renderizarPicking() {
    const db = leerTickets();
    const pendientes = db.filter(t => (t.estado || 'VIGENTE') === 'VIGENTE');
    pendientes.sort((a, b) => new Date(a.fechaEmision) - new Date(b.fechaEmision));

    contador.textContent = pendientes.length;

    if (pendientes.length === 0) {
        listaPicking.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    listaPicking.innerHTML = pendientes.map((ticket, index) => {
        const productos = Array.isArray(ticket.productos) ? ticket.productos : [];
        const esPrioridad = index === 0;

        return `
        <div class="wms-card" data-ticket-id="${ticket.id}">
            <div class="wms-card-header">
                <span class="wms-ticket-id">${ticket.id}</span>
                <span class="wms-separador">|</span>
                <span class="wms-fecha">${formatearFecha(ticket.fechaEmision)}</span>
                <span class="badge-pill badge-vigente">VIGENTE</span>
                ${esPrioridad ? '<span class="badge-pill badge-prioridad">🔥 MÁS ANTIGUO / PRIORIDAD</span>' : ''}
            </div>
            <div class="wms-card-body">
                <div class="wms-cliente">Cliente: <strong>${ticket.nombreFacturacion || ticket.cliente || '—'}</strong></div>
                <div class="wms-checklist">
                    ${productos.map((item, i) => {
                        const nombre = item.nombre || item.name || 'Producto Agro';
                        const cantidad = parseInt(item.cantidad || item.qty || 1) || 1;
                        return `
                            <div class="wms-item" data-item-index="${i}">
                                <input type="checkbox" id="chk-${ticket.id}-${i}">
                                <label for="chk-${ticket.id}-${i}">${cantidad}x ${nombre}</label>
                            </div>`;
                    }).join('')}
                </div>
                <div class="wms-progreso" data-progreso-de="${ticket.id}">0 / ${productos.length} ítems separados</div>
                <div class="wms-acciones">
                    <button class="btn-marcar-todos" data-id="${ticket.id}">Marcar todos</button>
                    <button class="btn-finalizar" data-id="${ticket.id}" disabled>LISTO PARA RECOJO</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function actualizarProgreso(card) {
    const checkboxes = card.querySelectorAll('input[type="checkbox"]');
    const marcados = card.querySelectorAll('input[type="checkbox"]:checked');
    const idTicket = card.getAttribute('data-ticket-id');
    const progreso = card.querySelector(`[data-progreso-de="${idTicket}"]`);
    progreso.textContent = `${marcados.length} / ${checkboxes.length} ítems separados`;

    const btnFinalizar = card.querySelector('.btn-finalizar');
    btnFinalizar.disabled = marcados.length < checkboxes.length;

    checkboxes.forEach(chk => {
        const fila = chk.closest('.wms-item');
        fila.classList.toggle('marcado', chk.checked);
    });
}

listaPicking.addEventListener('click', (e) => {
    const btnMarcarTodos = e.target.closest('.btn-marcar-todos');
    if (btnMarcarTodos) {
        const card = btnMarcarTodos.closest('.wms-card');
        card.querySelectorAll('input[type="checkbox"]').forEach(chk => chk.checked = true);
        actualizarProgreso(card);
        return;
    }

    const btnFinalizar = e.target.closest('.btn-finalizar');
    if (btnFinalizar && !btnFinalizar.disabled) {
        const idTicket = btnFinalizar.getAttribute('data-id');
        const db = leerTickets();
        const idx = db.findIndex(t => t.id === idTicket);
        if (idx === -1) return;

        db[idx].estado = 'LISTO_PARA_RECOJO';
        db[idx].fechaListoParaRecojo = new Date().toISOString();
        guardarTickets(db);

        mostrarToast('Pedido empaquetado y listo para que el cliente pase a caja/tienda.', 'exito');

        const card = btnFinalizar.closest('.wms-card');
        card.classList.add('saliendo');

        setTimeout(() => {
            card.remove();
            contador.textContent = listaPicking.children.length;
            if (listaPicking.children.length === 0) {
                emptyState.style.display = 'block';
            }
        }, 350);
    }
});

listaPicking.addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    const card = e.target.closest('.wms-card');
    actualizarProgreso(card);
});

document.addEventListener('DOMContentLoaded', renderizarPicking);
