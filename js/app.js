// ==========================================
// 1. FUNCIÓN PARA FORMATEAR NOMBRE ("Apellido, Nombre")
// ==========================================
function formatearNombre(nombreCompleto) {
    if (!nombreCompleto) return "";
    const partes = nombreCompleto.trim().split(/\s+/);
    let primerNombre = partes[0]; 
    let primerApellido = "";

    if (partes.length === 2) {
        primerApellido = partes[1];
    } else if (partes.length >= 3) {
        // Toma la penúltima palabra como primer apellido
        primerApellido = partes[partes.length - 2];
    }

    let resultado = primerApellido ? `${primerApellido}, ${primerNombre}` : primerNombre;
    return resultado.replace(/\b\w/g, letra => letra.toUpperCase());
}

// ==========================================
// 2. GESTIÓN DE SESIÓN Y MENÚ DESPLEGABLE (Global)
// ==========================================
function inicializarSesion() {
    const usuarioGuardado = localStorage.getItem('usuario_agro');
    const userTrigger = document.getElementById('user-trigger');
    const userDisplayName = document.getElementById('user-display-name');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const dropdownUserFull = document.getElementById('dropdown-user-full');
    const btnLogoutTottus = document.getElementById('btn-logout-tottus');

    if (usuarioGuardado) {
        // Formatear el nombre según la regla: Apellido, Nombre
        const nombreFormateado = formatearNombre(usuarioGuardado);

        if (userDisplayName) userDisplayName.textContent = `${nombreFormateado} ⌄`;
        if (dropdownUserFull) dropdownUserFull.textContent = nombreFormateado;

        // Alternar el menú desplegable al hacer clic
        if (userTrigger && userDropdownMenu) {
            userTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdownMenu.classList.toggle('active');
            });

            // Cerrar el menú si se hace clic fuera de él
            document.addEventListener('click', () => {
                if (userDropdownMenu.classList.contains('active')) {
                    userDropdownMenu.classList.remove('active');
                }
            });
        }

        // Botón para cerrar sesión
        if (btnLogoutTottus) {
            btnLogoutTottus.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('usuario_agro');
                window.location.reload();
            });
        }
    } else {
        // Estado sin sesión iniciada
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
document.addEventListener('DOMContentLoaded', () => {
    inicializarSesion();
    actualizarContadorCarrito();
    inicializarMenuLateral();
});