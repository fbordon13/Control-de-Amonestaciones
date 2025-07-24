// --- Manejo de autenticación y roles ---
let currentUser = null;
let currentRole = null;

// Referencias a elementos del DOM
const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userRoleDiv = document.getElementById('user-role');
const amonestacionForm = document.getElementById('amonestacion-form');
const formError = document.getElementById('form-error');
const historialTable = document.getElementById('historial-table').querySelector('tbody');
const buscarNombre = document.getElementById('buscar-nombre');
const buscarGrado = document.getElementById('buscar-grado');
const buscarFecha = document.getElementById('buscar-fecha');

// --- Mostrar/ocultar formularios de login y registro ---
const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');
const showRegisterBtn = document.getElementById('show-register-btn');
const showLoginLink = document.getElementById('show-login-link');

showRegisterBtn.addEventListener('click', () => {
  loginForm.style.display = 'none';
  registerForm.style.display = 'block';
  showRegisterBtn.style.display = 'none';
  showLoginLink.style.display = 'block';
  loginError.textContent = '';
});
showLoginLink.querySelector('button').addEventListener('click', () => {
  loginForm.style.display = 'block';
  registerForm.style.display = 'none';
  showRegisterBtn.style.display = 'block';
  showLoginLink.style.display = 'none';
  registerError.textContent = '';
});

// --- Registro de usuario ---
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.textContent = '';
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const password2 = document.getElementById('register-password2').value;
  // Validar dominio
  if (!email.endsWith('@meduca.edu.pa')) {
    registerError.textContent = 'Solo se permite el registro con correos educativos (@meduca.edu.pa).';
    return;
  }
  // Validar contraseñas
  if (password.length < 6) {
    registerError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }
  if (password !== password2) {
    registerError.textContent = 'Las contraseñas no coinciden.';
    return;
  }
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    // Crear documento de usuario en Firestore con rol docente por defecto
    await db.collection('usuarios').doc(cred.user.uid).set({
      rol: 'docente',
      email: email
    });
    registerForm.reset();
    registerError.textContent = 'Cuenta creada. Ahora puedes iniciar sesión.';
    setTimeout(() => {
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      showRegisterBtn.style.display = 'block';
      showLoginLink.style.display = 'none';
      registerError.textContent = '';
    }, 1500);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      registerError.textContent = 'Este correo ya está registrado.';
    } else {
      registerError.textContent = 'Error al crear la cuenta.';
    }
  }
});

// --- Login ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  // Validar dominio del correo
  if (!email.endsWith('@meduca.edu.pa')) {
    loginError.textContent = 'Solo se permite el acceso con correos educativos (@meduca.edu.pa).';
    return;
  }
  try {
    await auth.signInWithEmailAndPassword(email, password);
    // El listener onAuthStateChanged se encargará del resto
  } catch (err) {
    loginError.textContent = 'Correo o contraseña incorrectos.';
  }
});

// --- Logout ---
logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

// --- Listener de autenticación ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    await cargarRolUsuario(user.uid);
    mostrarApp();
    cargarHistorial();
  } else {
    currentUser = null;
    currentRole = null;
    mostrarLogin();
  }
});

// --- Cargar rol desde Firestore ---
async function cargarRolUsuario(uid) {
  try {
    const doc = await db.collection('usuarios').doc(uid).get();
    if (doc.exists) {
      currentRole = doc.data().rol;
    } else {
      currentRole = 'docente'; // Por defecto
    }
  } catch (e) {
    currentRole = 'docente';
  }
}

// --- Mostrar/Ocultar secciones ---
function mostrarApp() {
  loginSection.style.display = 'none';
  mainSection.style.display = 'block';
  userRoleDiv.textContent = `Rol: ${currentRole}`;
  document.getElementById('docente').value = currentUser.displayName || currentUser.email;
  document.getElementById('docente').disabled = true;
}
function mostrarLogin() {
  loginSection.style.display = 'block';
  mainSection.style.display = 'none';
  loginForm.reset();
}

// --- Registrar amonestación ---
amonestacionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';
  // Validación básica
  const nombre = document.getElementById('nombre-estudiante').value.trim();
  const grado = document.getElementById('grado-grupo').value.trim();
  const fecha = document.getElementById('fecha-amonestacion').value;
  const motivo = document.getElementById('motivo').value.trim();
  const docente = document.getElementById('docente').value.trim();
  if (!nombre || !grado || !fecha || !motivo || !docente) {
    formError.textContent = 'Completa todos los campos.';
    return;
  }
  try {
    await db.collection('amonestaciones').add({
      nombre,
      grado,
      fecha,
      motivo,
      docente,
      docenteUid: currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    amonestacionForm.reset();
    cargarHistorial();
  } catch (e) {
    formError.textContent = 'Error al guardar. Intenta de nuevo.';
  }
});

// --- Cargar historial de amonestaciones ---
async function cargarHistorial() {
  historialTable.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
  let query = db.collection('amonestaciones');
  if (currentRole !== 'directora') {
    query = query.where('docenteUid', '==', currentUser.uid);
  }
  // Filtros de búsqueda
  const nombreFiltro = buscarNombre.value.trim().toLowerCase();
  const gradoFiltro = buscarGrado.value.trim().toLowerCase();
  const fechaFiltro = buscarFecha.value;
  try {
    const snapshot = await query.orderBy('timestamp', 'desc').get();
    let datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (nombreFiltro) datos = datos.filter(d => d.nombre.toLowerCase().includes(nombreFiltro));
    if (gradoFiltro) datos = datos.filter(d => d.grado.toLowerCase().includes(gradoFiltro));
    if (fechaFiltro) datos = datos.filter(d => d.fecha === fechaFiltro);
    mostrarHistorial(datos);
  } catch (e) {
    historialTable.innerHTML = '<tr><td colspan="6">Error al cargar datos.</td></tr>';
  }
}

// --- Mostrar historial en tabla ---
function mostrarHistorial(datos) {
  if (!datos.length) {
    historialTable.innerHTML = '<tr><td colspan="6">Sin registros.</td></tr>';
    return;
  }
  historialTable.innerHTML = '';
  datos.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.nombre}</td>
      <td>${d.grado}</td>
      <td>${d.fecha}</td>
      <td>${d.motivo}</td>
      <td>${d.docente}</td>
      <td>
        <button onclick="editarAmonestacion('${d.id}')">Editar</button>
        <button onclick="eliminarAmonestacion('${d.id}')">Eliminar</button>
      </td>
    `;
    historialTable.appendChild(tr);
  });
}

// --- Búsqueda reactiva ---
[buscarNombre, buscarGrado, buscarFecha].forEach(input => {
  input.addEventListener('input', cargarHistorial);
});

// --- Editar amonestación (placeholder) ---
window.editarAmonestacion = function(id) {
  alert('Función de edición en desarrollo.');
  // Aquí puedes abrir un modal o formulario para editar el registro
};

// --- Eliminar amonestación ---
window.eliminarAmonestacion = async function(id) {
  if (!confirm('¿Eliminar este registro?')) return;
  try {
    await db.collection('amonestaciones').doc(id).delete();
    cargarHistorial();
  } catch (e) {
    alert('Error al eliminar.');
  }
};

// --- Comentarios ---
// El código está comentado para facilitar el mantenimiento y la extensión.
// Puedes mejorar la función de edición implementando un modal y actualizando el registro en Firestore. 