// ==========================================
// PICKING.JS — Preparación de pedidos (CU04)
// ==========================================

// ==========================================
// 1. LECTURA / ESCRITURA DEL HISTORIAL DE TICKETS
// ==========================================
function leerTickets() {
    try {
        return JSON.parse(localStorage.getItem('agro_tickets_db')) || [];
    } catch (e) {
        console.warn('No se pudo leer agro_tickets_db:', e);
        return [];
    }
}

function guardarTickets(db) {
    localStorage.setItem('agro_tickets_db', JSON.stringify(db));
}

// ==========================================
// 2. REFERENCIAS AL DOM
// ==========================================
const listaPicking = document.getElementById('lista-picking');
const emptyState = document.getElementById('picking-empty-state');

function formatearFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// ==========================================
// 3. RENDER DE LA LISTA (RF18: solo pedidos VIGENTE = pendientes de picking)
// ==========================================
function renderizarPicking() {
    const db = leerTickets();
    const pendientes = db.filter(t => (t.estado || 'VIGENTE') === 'VIGENTE');

    if (pendientes.length === 0) {
        listaPicking.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    // Orden FIFO: el pedido más antiguo se prepara primero
    pendientes.sort((a, b) => new Date(a.fechaEmision) - new Date(b.fechaEmision));

    listaPicking.innerHTML = pendientes.map(ticket => {
        const productos = Array.isArray(ticket.productos) ? ticket.productos : [];
        return `
        <div class="picking-card" data-ticket-id="${ticket.id}">
            <div class="picking-card-header">
                <div>
                    <div class="picking-ticket-id">${ticket.id}</div>
                    <div class="picking-fecha">Emitido: ${formatearFecha(ticket.fechaEmision)}</div>
                </div>
                <div class="picking-cliente">
                    <span>Cliente</span>
                    ${ticket.cliente || '—'}
                </div>
            </div>

            <div class="picking-checklist">
                ${productos.map((item, i) => {
                    const nombre = item.nombre || item.name || 'Producto Agro';
                    const cantidad = parseInt(item.cantidad || item.qty || 1) || 1;
                    return `
                        <div class="picking-item" data-item-index="${i}">
                            <input type="checkbox" id="chk-${ticket.id}-${i}">
                            <label for="chk-${ticket.id}-${i}">
                                <span class="picking-item-cantidad">${cantidad}x</span> ${nombre}
                            </label>
                        </div>`;
                }).join('')}
            </div>

            <div class="picking-progreso" data-progreso-de="${ticket.id}">0 / ${productos.length} productos separados</div>

            <button class="btn-finalizar-picking" data-id="${ticket.id}" disabled>
                Finalizar Picking y Marcar LISTO PARA RECOJO
            </button>
        </div>`;
    }).join('');
}

// ==========================================
// 4. CHECKLIST: progreso y habilitación del botón (RF19)
// ==========================================
listaPicking.addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;

    const card = e.target.closest('.picking-card');
    const itemRow = e.target.closest('.picking-item');
    itemRow.classList.toggle('marcado', e.target.checked);

    const checkboxes = card.querySelectorAll('input[type="checkbox"]');
    const marcados = card.querySelectorAll('input[type="checkbox"]:checked');
    const total = checkboxes.length;

    const idTicket = card.getAttribute('data-ticket-id');
    const progreso = card.querySelector(`[data-progreso-de="${idTicket}"]`);
    progreso.textContent = `${marcados.length} / ${total} productos separados`;

    const btnFinalizar = card.querySelector('.btn-finalizar-picking');
    btnFinalizar.disabled = marcados.length < total;
});

// ==========================================
// 5. FINALIZAR PICKING (RF20, RF21)
// ==========================================
listaPicking.addEventListener('click', (e) => {
    const boton = e.target.closest('.btn-finalizar-picking');
    if (!boton || boton.disabled) return;

    const idTicket = boton.getAttribute('data-id');
    const db = leerTickets();
    const idx = db.findIndex(t => t.id === idTicket);
    if (idx === -1) return;

    db[idx].estado = 'LISTO_PARA_RECOJO';
    db[idx].fechaListoParaRecojo = new Date().toISOString();
    guardarTickets(db);

    // RF21: notificación de confirmación (en un sistema con backend real,
    // aquí también se dispararía el correo/SMS al cliente)
    alert('Pedido empaquetado y listo para que el cliente pase a caja/tienda.');

    // El pedido ya no es VIGENTE, así que desaparece solo al re-renderizar
    renderizarPicking();
});

// ==========================================
// 6. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', renderizarPicking);
