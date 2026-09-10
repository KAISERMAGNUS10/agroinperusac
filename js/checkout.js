// ==========================================
// CHECKOUT.JS — Formulario de facturación + generación de ticket
// ==========================================

// --- 0. Seguridad de entrada a la página ---
// (se relee localStorage en cada función, nunca se guarda en una
// variable "congelada" que pueda quedar desactualizada)
function leerCarrito() {
    try {
        return JSON.parse(localStorage.getItem('agro_carrito_obj')) || {};
    } catch (e) {
        console.warn('No se pudo leer agro_carrito_obj de localStorage:', e);
        return {};
    }
}

if (!localStorage.getItem('usuario_agro')) {
    window.location.href = 'login.html';
}
if (Object.keys(leerCarrito()).length === 0) {
    window.location.href = 'carrito.html';
}

// ==========================================
// 1. VALIDADORES
// ==========================================
const Validadores = {
    minLength: (valor, min) => valor.trim().length >= min,
    dni: (valor) => /^\d{8}$/.test(valor.trim()),
    ce: (valor) => /^[a-zA-Z0-9]{6,12}$/.test(valor.trim()),
    ruc: (valor) => /^(10|15|17|20)\d{9}$/.test(valor.trim()),
    email: (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()),
    telefono: (valor) => /^9\d{8}$/.test(valor.trim())
};

// ==========================================
// 2. REFERENCIAS AL DOM
// ==========================================
const form = document.getElementById('form-checkout');
const btnConfirmar = document.getElementById('btn-confirmar');

const optBoleta = document.getElementById('opt-boleta');
const optFactura = document.getElementById('opt-factura');

const lblNombreRazon = document.getElementById('lbl-nombre-razon');
const inputNombreRazon = document.getElementById('chk-nombre-razon');

const tipoDoc = document.getElementById('chk-tipo-doc');
const lblNumDoc = document.getElementById('lbl-num-doc');
const numDoc = document.getElementById('chk-num-doc');

// ==========================================
// 3. SELECTOR DE DOCUMENTO DINÁMICO (Boleta ⇄ Factura)
// ==========================================
function actualizarCamposSegunComprobante() {
    const esBoleta = optBoleta.checked;

    if (esBoleta) {
        lblNombreRazon.textContent = 'Nombres y Apellidos completos';
        inputNombreRazon.placeholder = 'Ej. Juan Pérez Ramírez';
        tipoDoc.innerHTML = `
            <option value="dni">DNI</option>
            <option value="ce">Pasaporte / Carné de Extranjería</option>
        `;
    } else {
        lblNombreRazon.textContent = 'Razón Social';
        inputNombreRazon.placeholder = 'Ej. Distribuidora Agro E.I.R.L.';
        tipoDoc.innerHTML = `
            <option value="ruc">RUC (para empresas y pedidos al por mayor)</option>
        `;
    }

    actualizarCamposSegunTipoDoc();
    validarFormularioCompleto();
}

function actualizarCamposSegunTipoDoc() {
    const tipo = tipoDoc.value;
    if (tipo === 'dni') {
        lblNumDoc.textContent = 'N° de DNI';
        numDoc.placeholder = '8 dígitos';
        numDoc.maxLength = 8;
    } else if (tipo === 'ce') {
        lblNumDoc.textContent = 'N° de Pasaporte / CE';
        numDoc.placeholder = '6 a 12 caracteres';
        numDoc.maxLength = 12;
    } else if (tipo === 'ruc') {
        lblNumDoc.textContent = 'N° de RUC';
        numDoc.placeholder = '11 dígitos';
        numDoc.maxLength = 11;
    }
    numDoc.value = ''; // evita dejar un valor con formato del tipo anterior
    validarFormularioCompleto();
}

optBoleta.addEventListener('change', actualizarCamposSegunComprobante);
optFactura.addEventListener('change', actualizarCamposSegunComprobante);
tipoDoc.addEventListener('change', actualizarCamposSegunTipoDoc);

// ==========================================
// 4. VALIDACIÓN EN TIEMPO REAL
// ==========================================
function construirCampos() {
    const esBoleta = optBoleta.checked;
    const tipo = tipoDoc.value;

    const validarNumDoc = (v) => {
        if (tipo === 'dni') return Validadores.dni(v);
        if (tipo === 'ce') return Validadores.ce(v);
        if (tipo === 'ruc') return Validadores.ruc(v);
        return false;
    };
    const errorNumDoc = () => {
        if (tipo === 'dni') return 'El DNI debe tener exactamente 8 dígitos.';
        if (tipo === 'ce') return 'Documento inválido (6 a 12 caracteres).';
        if (tipo === 'ruc') return 'El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20.';
        return 'Documento inválido.';
    };

    return {
        'chk-nombre-razon': {
            validar: (v) => Validadores.minLength(v, 3),
            error: esBoleta ? 'Ingresa nombres y apellidos completos.' : 'Ingresa la razón social.'
        },
        'chk-num-doc': {
            validar: validarNumDoc,
            error: errorNumDoc()
        },
        'chk-email': {
            validar: (v) => Validadores.email(v),
            error: 'Ingresa un correo electrónico válido.'
        },
        'chk-telefono': {
            validar: (v) => Validadores.telefono(v),
            error: 'El teléfono debe tener 9 dígitos y empezar con 9.'
        }
    };
}

function validarCampo(id, definicion) {
    const input = document.getElementById(id);
    const errorSpan = document.getElementById('err-' + id.replace('chk-', ''));
    if (!input) return true;

    const valido = definicion.validar(input.value);
    if (errorSpan) errorSpan.textContent = valido ? '' : definicion.error;
    input.classList.toggle('input-invalid', !valido && input.value.trim().length > 0);
    return valido;
}

function validarFormularioCompleto() {
    const campos = construirCampos();
    let todoValido = true;

    Object.entries(campos).forEach(([id, definicion]) => {
        if (!validarCampo(id, definicion)) todoValido = false;
    });

    // El total debe ser mayor a 0 (carrito con productos reales) para poder confirmar
    const total = calcularTotal(obtenerItemsCarrito());
    if (total <= 0) todoValido = false;

    btnConfirmar.disabled = !todoValido;
    return todoValido;
}

['chk-nombre-razon', 'chk-num-doc', 'chk-email', 'chk-telefono'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', validarFormularioCompleto);
});

// ==========================================
// 5. RESUMEN DEL PEDIDO (lee el carrito SIEMPRE fresco)
// ==========================================
function obtenerItemsCarrito() {
    const carritoLocal = leerCarrito();
    return Object.values(carritoLocal).map(item => ({
        nombre: item.nombre || item.name || 'Producto Agro',
        precio: parseFloat(item.precio || item.price || 0) || 0,
        cantidad: parseInt(item.cantidad || item.qty || 1) || 1
    }));
}

function calcularTotal(items) {
    return items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
}

function renderizarResumenCheckout() {
    const items = obtenerItemsCarrito();
    const itemsList = document.getElementById('checkout-items-list');
    const totalEl = document.getElementById('checkout-total');

    if (items.length === 0) {
        itemsList.innerHTML = `<p style="color:#888; font-size:13px;">Tu carrito está vacío.</p>`;
        totalEl.textContent = 'S/ 0.00';
        return;
    }

    itemsList.innerHTML = items.map(item => `
        <div class="summary-row">
            <span>${item.nombre} × ${item.cantidad}</span>
            <span>S/ ${(item.precio * item.cantidad).toFixed(2)}</span>
        </div>
    `).join('');

    totalEl.textContent = `S/ ${calcularTotal(items).toFixed(2)}`;
}

// ==========================================
// 6. GENERACIÓN Y PERSISTENCIA DEL TICKET
// ==========================================
function generarIdTicket() {
    const year = new Date().getFullYear();
    const numero = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `TK-${year}-${numero}`;
}

function recolectarDatosCliente() {
    const esBoleta = optBoleta.checked;
    const tipo = tipoDoc.value;
    const etiquetasDoc = { dni: 'DNI', ce: 'CE/Pasaporte', ruc: 'RUC' };

    return {
        tipoComprobante: esBoleta ? 'boleta' : 'factura',
        cliente: document.getElementById('chk-nombre-razon').value.trim(),
        documentoTipo: etiquetasDoc[tipo] || tipo.toUpperCase(),
        documentoNumero: document.getElementById('chk-num-doc').value.trim(),
        correo: document.getElementById('chk-email').value.trim(),
        telefono: document.getElementById('chk-telefono').value.trim()
    };
}

function generarYGuardarTicket() {
    const productos = obtenerItemsCarrito();
    const total = calcularTotal(productos);
    const ahora = new Date();
    const expiracion = new Date(ahora.getTime() + 48 * 60 * 60 * 1000); // +48 horas
    const datosCliente = recolectarDatosCliente();

    // Estructura PLANA: así la espera ticket.js, sin anidar en "datosCliente"
    const ticket = {
        id: generarIdTicket(),
        fechaEmision: ahora.toISOString(),
        fechaExpiracion: expiracion.toISOString(),
        cliente: datosCliente.cliente,
        documentoTipo: datosCliente.documentoTipo,
        documentoNumero: datosCliente.documentoNumero,
        correo: datosCliente.correo,
        telefono: datosCliente.telefono,
        tipoComprobante: datosCliente.tipoComprobante,
        productos: productos,
        total: total,
        estado: 'VIGENTE',           // VIGENTE | PAGADO | LISTO_PARA_RECOJO | ENTREGADO | CANCELADO
        personaAutorizada: null      // { nombre, dni } — se completa desde Mis Pedidos
    };

    const db = JSON.parse(localStorage.getItem('agro_tickets_db')) || [];
    db.push(ticket);
    localStorage.setItem('agro_tickets_db', JSON.stringify(db));
    localStorage.setItem('agro_ticket_actual', JSON.stringify(ticket));

    // El pedido ya quedó registrado: se vacía el carrito
    localStorage.removeItem('agro_carrito_obj');

    return ticket;
}

// ==========================================
// 7. ENVÍO DEL FORMULARIO
// ==========================================
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validarFormularioCompleto()) return;

    generarYGuardarTicket();
    window.location.href = 'ticket.html';
});

// ==========================================
// 8. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    renderizarResumenCheckout();
    actualizarCamposSegunComprobante(); // deja las opciones de documento correctas desde el inicio
});
