// ==========================================
// CAJA.JS — Búsqueda de pedidos y registro de cobro (CU05)
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
const inputBusqueda = document.getElementById('input-busqueda');
const btnBuscar = document.getElementById('btn-buscar');
const estadoInicial = document.getElementById('estado-inicial');
const ticketNoEncontrado = document.getElementById('ticket-no-encontrado');
const ticketResultado = document.getElementById('ticket-resultado');
const resultadosMultiples = document.getElementById('resultados-multiples');

function ocultarTodosLosPaneles() {
    estadoInicial.style.display = 'none';
    ticketNoEncontrado.style.display = 'none';
    ticketResultado.style.display = 'none';
    resultadosMultiples.style.display = 'none';
}

// ==========================================
// 3. BÚSQUEDA (RF22)
// ==========================================
function buscarPedido() {
    const query = inputBusqueda.value.trim();
    if (!query) return;

    const db = leerTickets();
    ocultarTodosLosPaneles();

    // 1° intento: coincidencia exacta por N° de Ticket (no distingue mayúsculas)
    const porTicket = db.find(t => (t.id || '').toLowerCase() === query.toLowerCase());
    if (porTicket) {
        mostrarTicket(porTicket);
        return;
    }

    // 2° intento: coincidencia por DNI / RUC del cliente
    const porDocumento = db.filter(t => (t.documentoNumero || '').trim() === query);

    if (porDocumento.length === 0) {
        ticketNoEncontrado.style.display = 'block';
        return;
    }

    if (porDocumento.length === 1) {
        mostrarTicket(porDocumento[0]);
        return;
    }

    // Varios pedidos con el mismo documento: se listan para elegir cuál cobrar
    mostrarListaMultiple(porDocumento);
}

function mostrarListaMultiple(tickets) {
    // Más reciente primero
    const ordenados = [...tickets].sort((a, b) => new Date(b.fechaEmision) - new Date(a.fechaEmision));

    resultadosMultiples.innerHTML = `
        <h4>Se encontraron ${ordenados.length} pedidos con ese documento — elige uno:</h4>
        ${ordenados.map(t => `
            <div class="resultado-item">
                <span>${t.id} — ${formatearFecha(t.fechaEmision)} — S/ ${parseFloat(t.total || 0).toFixed(2)}</span>
                <button data-id="${t.id}">Ver</button>
            </div>
        `).join('')}
    `;
    resultadosMultiples.style.display = 'block';

    resultadosMultiples.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            const db = leerTickets();
            const ticket = db.find(t => t.id === btn.getAttribute('data-id'));
            if (ticket) {
                resultadosMultiples.style.display = 'none';
                mostrarTicket(ticket);
            }
        });
    });
}

btnBuscar.addEventListener('click', buscarPedido);
inputBusqueda.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buscarPedido();
});

// ==========================================
// 4. RENDER DE LA TARJETA DEL PEDIDO
// ==========================================
function formatearFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

const ETIQUETAS_ESTADO = {
    VIGENTE: 'VIGENTE',
    PAGADO: 'PAGADO',
    CANCELADO: 'CANCELADO',
    EXPIRADO: 'EXPIRADO',
    LISTO_PARA_RECOJO: 'LISTO PARA RECOJO',
    ENTREGADO: 'ENTREGADO'
};

// El ticket puede seguir con estado guardado "VIGENTE" o "LISTO_PARA_RECOJO"
// pero ya haber pasado su fecha de expiración (RF11: 2 días) — en ese caso
// tampoco se puede cobrar, igual que CANCELADO. PAGADO/CANCELADO/ENTREGADO
// son estados finales que no dependen de la fecha.
function calcularEstadoOperativo(ticket) {
    const estado = ticket.estado || 'VIGENTE';
    if (estado === 'PAGADO' || estado === 'CANCELADO' || estado === 'ENTREGADO') return estado;
    if (ticket.fechaExpiracion && new Date() > new Date(ticket.fechaExpiracion)) return 'EXPIRADO';
    return estado; // VIGENTE (en preparación) o LISTO_PARA_RECOJO (cobrable)
}

function renderTablaProductos(productos) {
    if (!Array.isArray(productos) || productos.length === 0) {
        return `<tr><td colspan="4" style="text-align:center; color:#999; padding:14px 0;">Sin productos</td></tr>`;
    }
    return productos.map(item => {
        const nombre = item.nombre || item.name || 'Producto Agro';
        const precio = parseFloat(item.precio || item.price || 0) || 0;
        const cantidad = parseInt(item.cantidad || item.qty || 1) || 1;
        return `
            <tr>
                <td>${nombre}</td>
                <td>${cantidad}</td>
                <td>S/ ${precio.toFixed(2)}</td>
                <td>S/ ${(precio * cantidad).toFixed(2)}</td>
            </tr>`;
    }).join('');
}

// Arma la sección inferior de cobro según el estado operativo (RF24, RF26)
function renderSeccionCobro(ticket, estadoOperativo) {
    if (estadoOperativo === 'PAGADO') {
        return `<div class="caja-mensaje caja-mensaje-neutro">✅ Este pedido ya fue pagado previamente.</div>`;
    }
    if (estadoOperativo === 'CANCELADO') {
        return `<div class="caja-mensaje caja-mensaje-alerta">🚫 Este pedido fue cancelado por el cliente.</div>`;
    }
    if (estadoOperativo === 'EXPIRADO') {
        return `<div class="caja-mensaje caja-mensaje-alerta">⏰ Este ticket venció (superó las 48 horas) y ya no puede cobrarse.</div>`;
    }
    if (estadoOperativo === 'VIGENTE') {
        return `<div class="caja-mensaje caja-mensaje-neutro">📦 El pedido aún está en proceso de preparación en almacén. Por favor, aguarde la notificación de Listo para Recojo.</div>`;
    }
    if (estadoOperativo !== 'LISTO_PARA_RECOJO') {
        return `<div class="caja-mensaje caja-mensaje-neutro">Este pedido está en estado "${ETIQUETAS_ESTADO[estadoOperativo] || estadoOperativo}" y no requiere cobro en caja.</div>`;
    }

    // LISTO_PARA_RECOJO: habilitar cobro
    const total = parseFloat(ticket.total || 0);
    return `
        <div class="caja-cobro-section">
            <h4>Método de pago</h4>
            <div class="metodo-pago-opciones">
                <label class="metodo-pago-opcion">
                    <input type="radio" name="metodo-pago" value="Efectivo"> Efectivo
                </label>
                <label class="metodo-pago-opcion">
                    <input type="radio" name="metodo-pago" value="Tarjeta"> Tarjeta de Crédito/Débito
                </label>
                <label class="metodo-pago-opcion">
                    <input type="radio" name="metodo-pago" value="Yape/Plin"> Billetera Digital (Yape / Plin)
                </label>
            </div>

            <!-- Solo para Efectivo -->
            <div id="campos-efectivo" class="campos-metodo" style="display:none;">
                <div class="input-group">
                    <label>Efectivo Recibido (S/)</label>
                    <input type="number" id="input-efectivo-recibido" min="0" step="0.10" placeholder="0.00">
                </div>
                <div class="input-group">
                    <label>Vuelto a entregar (S/)</label>
                    <input type="text" id="input-vuelto" value="S/ 0.00" readonly>
                </div>
                <span class="input-error" id="err-efectivo"></span>
            </div>

            <!-- Solo para Tarjeta / Yape-Plin -->
            <div id="campos-electronico" class="campos-metodo" style="display:none;">
                <div class="input-group">
                    <label>N° de Operación / Transacción (opcional)</label>
                    <input type="text" id="input-num-operacion" placeholder="Ej. 000123456">
                </div>
            </div>

            <button id="btn-procesar-pago" class="btn-procesar-pago" data-id="${ticket.id}" data-total="${total}" disabled>
                Procesar Pago y Registrar
            </button>
        </div>
    `;
}

function mostrarTicket(ticket) {
    const estadoOperativo = calcularEstadoOperativo(ticket);
    const persona = ticket.personaAutorizada;

    ticketResultado.innerHTML = `
        <div class="caja-card-header">
            <div>
                <div class="ticket-id">${ticket.id}</div>
                <div class="ticket-fecha">Emitido: ${formatearFecha(ticket.fechaEmision)}</div>
            </div>
            <span class="estado-badge estado-${estadoOperativo}">${ETIQUETAS_ESTADO[estadoOperativo] || estadoOperativo}</span>
        </div>

        <div class="caja-datos-grid">
            <div class="caja-dato-item">
                <span>${ticket.tipoComprobante === 'factura' ? 'Razón Social' : 'Cliente'}</span>
                <strong>${ticket.cliente || '—'}</strong>
            </div>
            <div class="caja-dato-item">
                <span>${ticket.documentoTipo || 'DNI / RUC'}</span>
                <strong>${ticket.documentoNumero || '—'}</strong>
            </div>
            <div class="caja-dato-item">
                <span>Correo electrónico</span>
                <strong>${ticket.correo || '—'}</strong>
            </div>
        </div>

        ${persona ? `
            <div class="caja-persona-autorizada">
                🧾 Autorizado para recoger: <strong>${persona.nombre}</strong> — DNI <strong>${persona.dni}</strong>
            </div>
        ` : ''}

        <table class="caja-tabla">
            <thead>
                <tr><th>Producto</th><th>Cant.</th><th>Precio Unit.</th><th>Subtotal</th></tr>
            </thead>
            <tbody>${renderTablaProductos(ticket.productos)}</tbody>
        </table>

        <div class="caja-total-block">
            <span>TOTAL A COBRAR</span>
            <strong>S/ ${parseFloat(ticket.total || 0).toFixed(2)}</strong>
        </div>

        ${renderSeccionCobro(ticket, estadoOperativo)}
    `;

    ticketResultado.style.display = 'block';

    // --- Lógica dinámica según método de pago (RF24) ---
    const radios = ticketResultado.querySelectorAll('input[name="metodo-pago"]');
    const btnProcesar = document.getElementById('btn-procesar-pago');
    const camposEfectivo = document.getElementById('campos-efectivo');
    const camposElectronico = document.getElementById('campos-electronico');
    const inputRecibido = document.getElementById('input-efectivo-recibido');
    const inputVuelto = document.getElementById('input-vuelto');
    const errEfectivo = document.getElementById('err-efectivo');

    if (!radios.length || !btnProcesar) return; // pedido no VIGENTE: no hay sección de cobro

    const total = parseFloat(btnProcesar.getAttribute('data-total')) || 0;

    function validarEfectivoYActualizarBoton() {
        const recibido = parseFloat(inputRecibido.value) || 0;
        const vuelto = recibido - total;

        inputVuelto.value = `S/ ${(vuelto > 0 ? vuelto : 0).toFixed(2)}`;

        if (recibido < total) {
            errEfectivo.textContent = 'El efectivo recibido es insuficiente.';
            btnProcesar.disabled = true;
        } else {
            errEfectivo.textContent = '';
            btnProcesar.disabled = false;
        }
    }

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            const esEfectivo = radio.value === 'Efectivo';
            camposEfectivo.style.display = esEfectivo ? 'block' : 'none';
            camposElectronico.style.display = esEfectivo ? 'none' : 'block';

            if (esEfectivo) {
                inputRecibido.value = '';
                inputVuelto.value = 'S/ 0.00';
                errEfectivo.textContent = '';
                validarEfectivoYActualizarBoton(); // deja el botón deshabilitado hasta ingresar un monto
            } else {
                btnProcesar.disabled = false; // tarjeta/billetera no requieren monto para habilitar
            }
        });
    });

    inputRecibido.addEventListener('input', validarEfectivoYActualizarBoton);

    btnProcesar.addEventListener('click', () => procesarPago(ticket.id));
}

// ==========================================
// 5. PROCESAMIENTO DE PAGO (RF24, RF25)
// ==========================================
function procesarPago(idTicket) {
    const metodoSeleccionado = ticketResultado.querySelector('input[name="metodo-pago"]:checked');
    if (!metodoSeleccionado) {
        alert('Selecciona un método de pago antes de continuar.');
        return;
    }
    const metodo = metodoSeleccionado.value;

    const db = leerTickets();
    const idx = db.findIndex(t => t.id === idTicket);
    if (idx === -1) {
        alert('No se pudo encontrar el pedido para registrar el pago.');
        return;
    }

    // RF26: revalida el estado justo antes de cobrar (evita doble cobro
    // si el pedido cambió de estado entre que se buscó y se procesó)
    const estadoOperativo = calcularEstadoOperativo(db[idx]);
    if (estadoOperativo !== 'LISTO_PARA_RECOJO') {
        alert('Este pedido ya no puede cobrarse (su estado cambió). Vuelve a buscarlo.');
        mostrarTicket(db[idx]);
        return;
    }

    const total = parseFloat(db[idx].total || 0);
    let montoRecibido = total;
    let vueltoEntregado = 0;
    let numOperacion = '';

    if (metodo === 'Efectivo') {
        const inputRecibido = document.getElementById('input-efectivo-recibido');
        montoRecibido = parseFloat(inputRecibido.value) || 0;

        if (montoRecibido < total) {
            alert('El efectivo recibido es insuficiente.');
            return;
        }
        vueltoEntregado = montoRecibido - total;
    } else {
        const inputOperacion = document.getElementById('input-num-operacion');
        numOperacion = inputOperacion ? inputOperacion.value.trim() : '';
        montoRecibido = total; // tarjeta/billetera: se cobra el monto exacto
        vueltoEntregado = 0;
    }

    db[idx].estado = 'PAGADO';
    db[idx].metodoPago = metodo;
    db[idx].montoRecibido = montoRecibido;
    db[idx].vueltoEntregado = vueltoEntregado;
    db[idx].numOperacion = numOperacion;
    db[idx].fechaPago = new Date().toISOString();
    guardarTickets(db);

    mostrarVoucherConfirmacion(db[idx]);
}

// ==========================================
// 6. VOUCHER DE CONFIRMACIÓN DE COBRO
// ==========================================
const voucherOverlay = document.getElementById('voucher-overlay');
const filaRecibido = document.getElementById('v-fila-recibido');
const filaVuelto = document.getElementById('v-fila-vuelto');
const filaOperacion = document.getElementById('v-fila-operacion');

function mostrarVoucherConfirmacion(ticket) {
    document.getElementById('v-id').textContent = ticket.id;
    document.getElementById('v-total').textContent = `S/ ${parseFloat(ticket.total || 0).toFixed(2)}`;
    document.getElementById('v-metodo').textContent = ticket.metodoPago;

    if (ticket.metodoPago === 'Efectivo') {
        filaRecibido.style.display = 'flex';
        filaVuelto.style.display = 'flex';
        filaOperacion.style.display = 'none';
        document.getElementById('v-recibido').textContent = `S/ ${parseFloat(ticket.montoRecibido || 0).toFixed(2)}`;
        document.getElementById('v-vuelto').textContent = `S/ ${parseFloat(ticket.vueltoEntregado || 0).toFixed(2)}`;
    } else {
        filaRecibido.style.display = 'none';
        filaVuelto.style.display = 'none';
        filaOperacion.style.display = ticket.numOperacion ? 'flex' : 'none';
        document.getElementById('v-operacion').textContent = ticket.numOperacion || '—';
    }

    voucherOverlay.classList.add('active');
}

document.getElementById('btn-nuevo-cobro').addEventListener('click', () => {
    voucherOverlay.classList.remove('active');
    inputBusqueda.value = '';
    ocultarTodosLosPaneles();
    estadoInicial.style.display = 'block';
    inputBusqueda.focus();
});
