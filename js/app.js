// ==========================================
// 2. GESTIÓN DE SESIÓN Y MENÚ DESPLEGABLE (Global)
// ==========================================
function obtenerSaludoUsuario(usuarioGuardado) {
    let nombre = '';
    let apellido = '';

    try {
        const sesion = JSON.parse(localStorage.getItem('agro_sesion_usuario'));
        if (sesion && typeof sesion.Nombre === 'string' && sesion.Nombre.trim()) {
            nombre = sesion.Nombre.trim().split(' ')[0];
            apellido = typeof sesion.Apellidos === 'string' && sesion.Apellidos.trim()
                ? sesion.Apellidos.trim().split(' ')[0]
                : '';
        }
    } catch (e) {
        nombre = '';
    }

    if (!nombre) {
        const partes = (usuarioGuardado || '').trim().split(' ');
        nombre = partes[0] || '';
        apellido = partes[1] || '';
    }

    return apellido ? `Hola ${nombre} ${apellido}` : `Hola ${nombre}`;
}

function inicializarSesion() {
    const usuarioGuardado = localStorage.getItem('usuario_agro');
    const userTrigger = document.getElementById('user-trigger');
    const userDisplayName = document.getElementById('user-display-name');
    const userGreetingLabel = userTrigger ? userTrigger.querySelector('.user-greeting-label') : null;
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const dropdownUserFull = document.getElementById('dropdown-user-full');
    const btnLogoutTottus = document.getElementById('btn-logout-tottus');

    if (usuarioGuardado) {
        const saludo = obtenerSaludoUsuario(usuarioGuardado);

        if (userGreetingLabel) userGreetingLabel.textContent = '';
        if (userDisplayName) userDisplayName.textContent = `${saludo} ⌄`;
        if (dropdownUserFull) dropdownUserFull.textContent = saludo.replace('Hola ', '');

        if (userTrigger && userDropdownMenu) {
            userTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdownMenu.classList.toggle('active');
            });

            document.addEventListener('click', () => {
                if (userDropdownMenu.classList.contains('active')) {
                    userDropdownMenu.classList.remove('active');
                }
            });
        }

        if (btnLogoutTottus) {
            btnLogoutTottus.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('usuario_agro');
                localStorage.removeItem('agro_sesion_usuario');
                window.location.reload();
            });
        }
    } else {
        if (userDisplayName) userDisplayName.textContent = "Inicia sesión ⌄";
        if (userTrigger) {
            userTrigger.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }
    }
}

// ==========================================
// 3. GESTIÓN DEL CARRITO Y REDIRECCIÓN A CARRITO.HTML
// ==========================================
function actualizarContadorCarrito() {
    const cartCounter = document.getElementById('cart-counter');
    if (!cartCounter) return;

    let carritoLocal = JSON.parse(localStorage.getItem('agro_carrito_obj')) || {};
    let totalItems = 0;
    
    for (let id in carritoLocal) { 
        totalItems += carritoLocal[id].qty; 
    }
    
    cartCounter.textContent = totalItems;

    // ACTIVA EL CLIC EN EL ÍCONO DEL CARRITO:
    // Busca el contenedor padre o enlace del ícono para redirigir a carrito.html
    const cartContainer = cartCounter.closest('a') || cartCounter.parentElement;
    if (cartContainer) {
        cartContainer.style.cursor = 'pointer';
        cartContainer.onclick = (e) => {
            e.preventDefault();
            window.location.href = 'carrito.html';
        };
    }
}

// ==========================================
// 4. MENÚ LATERAL (☰) — compartido por todas las páginas
// ==========================================
function inicializarMenuLateral() {
    const btnMainMenu = document.getElementById('btn-main-menu');
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const btnCloseMenu = document.getElementById('btn-close-menu');

    const toggleMenu = () => {
        if (sideMenu && menuOverlay) {
            sideMenu.classList.toggle('active');
            menuOverlay.classList.toggle('active');
        }
    };

    if (btnMainMenu) btnMainMenu.addEventListener('click', toggleMenu);
    if (btnCloseMenu) btnCloseMenu.addEventListener('click', toggleMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', toggleMenu);
}

// ==========================================
// 5. INICIALIZACIÓN
// ==========================================
function updateHeaderGreeting() {
    const destino = document.getElementById('nombre-usuario-header');
    if (!destino) return;

    let saludo = 'Hola Invitado';

    try {
        const sesion = JSON.parse(localStorage.getItem('agro_sesion_usuario'));
        if (sesion && typeof sesion.Nombre === 'string' && sesion.Nombre.trim()) {
            const primerNombre = sesion.Nombre.trim().split(' ')[0];
            const primerApellido = typeof sesion.Apellidos === 'string' && sesion.Apellidos.trim()
                ? sesion.Apellidos.trim().split(' ')[0]
                : '';
            saludo = primerApellido ? `Hola ${primerNombre} ${primerApellido}` : `Hola ${primerNombre}`;
        }
    } catch (e) {
        saludo = 'Hola Invitado';
    }

    destino.textContent = saludo;
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarSesion();
    actualizarContadorCarrito();
    inicializarMenuLateral();
    updateHeaderGreeting();
});