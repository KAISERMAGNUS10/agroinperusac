// ==========================================
// MIS-PEDIDOS.JS
// ==========================================

// --- Seguridad de entrada ---
if (!localStorage.getItem('usuario_agro')) {
    window.location.href = 'login.html';
}

// ==========================================
// 1. LECTURA / ESCRITURA DEL HISTORIAL
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

function buscarIndicePorId(db, id) {
    return db.findIndex(t => t.id === id);
}

// ==========================================
// 2. REGLAS DE ESTADO (RF11, RF12, RF32/34)
// ==========================================
const ESTADOS_FINALES = ['ENTREGADO', 'CANCELADO'];

// El estado que se MUESTRA puede diferir del guardado: si sigue "VIGENTE"
// pero ya pasó su fecha de expiración (RF11: 2 días hábiles), se ve como EXPIRADO.
function calcularEstadoMostrado(ticket) {
    const estado = ticket.estado || 'VIGENTE';
    if (estado !== 'VIGENTE') return estado; // PAGADO, LISTO_PARA_RECOJO, ENTREGADO, CANCELADO
    if (ticket.fechaExpiracion && new Date() > new Date(ticket.fechaExpiracion)) return 'EXPIRADO';
    return 'VIGENTE';
}

function etiquetaEstado(estadoMostrado) {
    const etiquetas = {
        VIGENTE: 'VIGENTE',
        PAGADO: 'PAGADO',
        LISTO_PARA_RECOJO: 'LISTO PARA RECOJO',
        ENTREGADO: 'ENTREGADO',
        CANCELADO: 'CANCELADO',
        EXPIRADO: 'EXPIRADO'
    };
    return etiquetas[estadoMostrado] || estadoMostrado;
}

// RF12: cancelar solo si sigue VIGENTE (no expirado/pagado/etc.) y con menos de 24h desde la emisión
function puedeCancelar(ticket) {
    if (calcularEstadoMostrado(ticket) !== 'VIGENTE') return false;
    const horasTranscurridas = (Date.now() - new Date(ticket.fechaEmision).getTime()) / 3600000;
    return horasTranscurridas < 24;
}

// RF32/RF34: se puede asignar/editar/eliminar persona autorizada mientras no esté ENTREGADO ni CANCELADO
function puedeGestionarPersonaAutorizada(ticket) {
    const estado = ticket.estado || 'VIGENTE';
    return !ESTADOS_FINALES.includes(estado);
}

// ==========================================
// 3. RENDER DE LA LISTA
// ==========================================
function formatearFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function renderizarPedidos() {
    const db = leerTickets();
    const contenedor = document.getElementById('lista-pedidos');
    const emptyState = document.getElementById('pedidos-empty-state');

    if (db.length === 0) {
        contenedor.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    // Más reciente primero
    const pedidos = [...db].reverse();

    contenedor.innerHTML = pedidos.map(ticket => {
        const estadoMostrado = calcularEstadoMostrado(ticket);
        const persona = ticket.personaAutorizada;

        return `
        <div class="pedido-card" data-ticket-id="${ticket.id}">
            <div class="pedido-card-top">
                <div>
                    <div class="pedido-id">${ticket.id}</div>
                    <div class="pedido-fecha">Emitido: ${formatearFecha(ticket.fechaEmision)}</div>
                </div>
                <div>
                    <span class="estado-badge estado-${estadoMostrado}">${etiquetaEstado(estadoMostrado)}</span>
                    <div class="pedido-total">S/ ${parseFloat(ticket.total || 0).toFixed(2)}</div>
                </div>
            </div>

            ${persona ? `
                <div class="pedido-persona-autorizada">
                    🧾 Autorizado para recoger: <strong>${persona.nombre}</strong> — DNI ${persona.dni}
                </div>` : ''}

            <div class="pedido-actions">
                <button class="btn-pedido btn-pedido-primary" data-action="ver" data-id="${ticket.id}">Ver detalle / Ticket</button>

                ${puedeCancelar(ticket) ? `
                    <button class="btn-pedido btn-pedido-danger" data-action="cancelar" data-id="${ticket.id}">Cancelar Pedido</button>
                ` : ''}

                ${puedeGestionarPersonaAutorizada(ticket) ? `
                    <button class="btn-pedido btn-pedido-secondary" data-action="persona" data-id="${ticket.id}">
                        ${persona ? 'Editar persona autorizada' : 'Asignar Persona Autorizada para Recojo'}
                    </button>
                ` : ''}
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// 4. ACCIÓN: VER DETALLE / TICKET (RF13)
// ==========================================
function verDetalle(id) {
    const db = leerTickets();
    const ticket = db.find(t => t.id === id);
    if (!ticket) return;

    // ticket.html siempre lee el ticket completo desde 'agro_ticket_actual'
    localStorage.setItem('agro_ticket_actual', JSON.stringify(ticket));
    window.location.href = 'ticket.html';
}

// ==========================================
// 5. ACCIÓN: CANCELAR PEDIDO (RF12)
// ==========================================
function cancelarPedido(id) {
    const confirmado = confirm('¿Seguro que deseas cancelar este pedido? Esta acción no se puede deshacer.');
    if (!confirmado) return;

    const db = leerTickets();
    const idx = buscarIndicePorId(db, id);
    if (idx === -1) return;

    db[idx].estado = 'CANCELADO';
    guardarTickets(db);
    renderizarPedidos();
}

// ==========================================
// 6. MODAL: PERSONA AUTORIZADA (RF32 / RF34)
// ==========================================
const modalOverlay = document.getElementById('modal-overlay');
const modalNombre = document.getElementById('modal-nombre');
const modalDni = document.getElementById('modal-dni');
const modalErrNombre = document.getElementById('modal-err-nombre');
const modalErrDni = document.getElementById('modal-err-dni');
const modalBtnGuardar = document.getElementById('modal-btn-guardar');
const modalBtnCancelar = document.getElementById('modal-btn-cancelar');
const modalBtnQuitar = document.getElementById('modal-btn-quitar');

let idTicketEnEdicion = null;

function abrirModalPersona(id) {
    const db = leerTickets();
    const ticket = db.find(t => t.id === id);
    if (!ticket) return;

    idTicketEnEdicion = id;
    modalErrNombre.textContent = '';
    modalErrDni.textContent = '';

    const persona = ticket.personaAutorizada;
    modalNombre.value = persona ? persona.nombre : '';
    modalDni.value = persona ? persona.dni : '';
    modalBtnQuitar.style.display = persona ? 'inline-block' : 'none';

    modalOverlay.classList.add('active');
    modalNombre.focus();
}

function cerrarModalPersona() {
    modalOverlay.classList.remove('active');
    idTicketEnEdicion = null;
}

function guardarPersonaAutorizada() {
    const nombre = modalNombre.value.trim();
    const dni = modalDni.value.trim();
    modalErrNombre.textContent = '';
    modalErrDni.textContent = '';

    let valido = true;
    if (nombre.length < 3) {
        modalErrNombre.textContent = 'Ingresa nombres y apellidos completos.';
        valido = false;
    }
    if (!/^\d{8}$/.test(dni)) {
        modalErrDni.textContent = 'El DNI debe tener exactamente 8 dígitos.';
        valido = false;
    }
    if (!valido) return;

    const db = leerTickets();
    const idx = buscarIndicePorId(db, idTicketEnEdicion);
    if (idx === -1) return;

    db[idx].personaAutorizada = { nombre, dni };
    guardarTickets(db);
    cerrarModalPersona();
    renderizarPedidos();
}

function quitarPersonaAutorizada() {
    const db = leerTickets();
    const idx = buscarIndicePorId(db, idTicketEnEdicion);
    if (idx === -1) return;

    db[idx].personaAutorizada = null;
    guardarTickets(db);
    cerrarModalPersona();
    renderizarPedidos();
}

modalBtnGuardar.addEventListener('click', guardarPersonaAutorizada);
modalBtnCancelar.addEventListener('click', cerrarModalPersona);
modalBtnQuitar.addEventListener('click', quitarPersonaAutorizada);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) cerrarModalPersona();
});

// ==========================================
// 7. DELEGACIÓN DE EVENTOS DE LA LISTA
// ==========================================
document.getElementById('lista-pedidos').addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-action]');
    if (!boton) return;

    const id = boton.getAttribute('data-id');
    const accion = boton.getAttribute('data-action');

    if (accion === 'ver') verDetalle(id);
    if (accion === 'cancelar') cancelarPedido(id);
    if (accion === 'persona') abrirModalPersona(id);
});

// ==========================================
// 8. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', renderizarPedidos);
