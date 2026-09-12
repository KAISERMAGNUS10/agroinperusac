const inputCorreo = document.getElementById('reg-correo');
const inputNombre = document.getElementById('reg-nombre');
const inputApellidos = document.getElementById('reg-apellidos');
const selectDocTipo = document.getElementById('reg-doc-tipo');
const inputDocNumero = document.getElementById('reg-doc-numero');
const ayudaDoc = document.getElementById('ayuda-doc');
const inputCelular = document.getElementById('reg-celular');
const inputPassword = document.getElementById('reg-password');
const btnTogglePassword = document.getElementById('btn-toggle-password');
const chkTerminos = document.getElementById('chk-terminos');
const chkPrivacidad = document.getElementById('chk-privacidad');
const btnRegistrar = document.getElementById('btn-registrar');
const formRegistro = document.getElementById('form-registro');

const reqLongitud = document.getElementById('req-longitud');
const reqNumero = document.getElementById('req-numero');
const reqMayuscula = document.getElementById('req-mayuscula');
const reqMinuscula = document.getElementById('req-minuscula');

function validarEmail(valor) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

function validarDocumento(tipo, valor) {
    const limpio = valor.trim();
    if (tipo === 'DNI') return /^\d{8}$/.test(limpio);
    return /^[a-zA-Z0-9]{6,12}$/.test(limpio);
}

function validarCelular(valor) {
    return /^9\d{8}$/.test(valor.trim());
}

function evaluarPassword(valor) {
    const estado = {
        longitud: valor.length >= 8,
        numero: /\d/.test(valor),
        mayuscula: /[A-Z]/.test(valor),
        minuscula: /[a-z]/.test(valor)
    };

    marcarRequisito(reqLongitud, estado.longitud);
    marcarRequisito(reqNumero, estado.numero);
    marcarRequisito(reqMayuscula, estado.mayuscula);
    marcarRequisito(reqMinuscula, estado.minuscula);

    return estado.longitud && estado.numero && estado.mayuscula && estado.minuscula;
}

function marcarRequisito(elemento, cumplido) {
    elemento.classList.toggle('cumplido', cumplido);
    elemento.querySelector('.req-check').textContent = cumplido ? '✓' : '○';
}

selectDocTipo.addEventListener('change', () => {
    if (selectDocTipo.value === 'DNI') {
        ayudaDoc.textContent = 'DNI: 8 dígitos';
        inputDocNumero.maxLength = 8;
    } else {
        ayudaDoc.textContent = 'Carné de Extranjería: 6 a 12 caracteres';
        inputDocNumero.maxLength = 12;
    }
    inputDocNumero.value = '';
    validarFormulario();
});

btnTogglePassword.addEventListener('click', () => {
    const esPassword = inputPassword.type === 'password';
    inputPassword.type = esPassword ? 'text' : 'password';
    btnTogglePassword.textContent = esPassword ? '🙈' : '👁';
});

function validarFormulario() {
    const correoValido = validarEmail(inputCorreo.value);
    const nombreValido = inputNombre.value.trim().length >= 2;
    const apellidosValido = inputApellidos.value.trim().length >= 2;
    const docValido = validarDocumento(selectDocTipo.value, inputDocNumero.value);
    const celularValido = validarCelular(inputCelular.value);
    const passwordValida = evaluarPassword(inputPassword.value);
    const terminosOk = chkTerminos.checked && chkPrivacidad.checked;

    document.getElementById('err-correo').textContent = (!correoValido && inputCorreo.value) ? 'Ingresa un correo válido.' : '';
    document.getElementById('err-nombre').textContent = (!nombreValido && inputNombre.value) ? 'Ingresa tu nombre.' : '';
    document.getElementById('err-apellidos').textContent = (!apellidosValido && inputApellidos.value) ? 'Ingresa tus apellidos.' : '';
    document.getElementById('err-doc').textContent = (!docValido && inputDocNumero.value) ? 'Número de documento inválido.' : '';
    document.getElementById('err-celular').textContent = (!celularValido && inputCelular.value) ? 'Celular inválido (9 dígitos, empieza con 9).' : '';

    const todoValido = correoValido && nombreValido && apellidosValido && docValido && celularValido && passwordValida && terminosOk;
    btnRegistrar.disabled = !todoValido;
    return todoValido;
}

[inputCorreo, inputNombre, inputApellidos, inputDocNumero, inputCelular, inputPassword].forEach(input => {
    input.addEventListener('input', validarFormulario);
});
[chkTerminos, chkPrivacidad].forEach(chk => {
    chk.addEventListener('change', validarFormulario);
});

formRegistro.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const nombre = inputNombre.value.trim();
    const apellidos = inputApellidos.value.trim();
    const correo = inputCorreo.value.trim();

    const usuarios = JSON.parse(localStorage.getItem('agro_users')) || [];
    if (usuarios.find(u => u.email === correo)) {
        document.getElementById('err-correo').textContent = 'Este correo ya está registrado.';
        return;
    }

    const nuevoUsuario = {
        email: correo,
        pass: inputPassword.value,
        name: `${nombre} ${apellidos}`,
        nombre: nombre,
        apellidos: apellidos,
        documentoTipo: selectDocTipo.value,
        documentoNumero: inputDocNumero.value.trim(),
        celular: '+51' + inputCelular.value.trim()
    };

    usuarios.push(nuevoUsuario);
    localStorage.setItem('agro_users', JSON.stringify(usuarios));

    localStorage.setItem('usuario_agro', nuevoUsuario.name);
    localStorage.setItem('agro_sesion_usuario', JSON.stringify({
        Nombre: nuevoUsuario.nombre,
        Apellidos: nuevoUsuario.apellidos,
        Correo: nuevoUsuario.email
    }));

    window.location.href = 'index.html';
});
