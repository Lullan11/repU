// ------------------------------------------------------------------
// 1. CONFIGURACIÓN DE FIREBASE (TUS DATOS REALES)
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCk5XknbZinI_-QaXkR6g22-HDuSvhYFRc",
  authDomain: "repou-f3d37.firebaseapp.com",
  projectId: "repou-f3d37",
  storageBucket: "repou-f3d37.firebasestorage.app",
  messagingSenderId: "212576901079",
  appId: "1:212576901079:web:9e5ad2f2d857d5635d1d92"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ------------------------------------------------------------------
// 2. ELEMENTOS DEL DOM
// ------------------------------------------------------------------
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorDiv = document.getElementById('errorMessage');

// ------------------------------------------------------------------
// 3. FUNCIONES AUXILIARES
// ------------------------------------------------------------------
function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
  setTimeout(() => {
    errorDiv.classList.remove('show');
  }, 5000);
}

function hideError() {
  errorDiv.classList.remove('show');
}

// ------------------------------------------------------------------
// 4. MANEJO DEL INICIO DE SESIÓN
// ------------------------------------------------------------------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError('Por favor, completa todos los campos.');
    return;
  }

  loginBtn.classList.add('loading');
  loginBtn.disabled = true;

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    // ✅ Redirigir al panel
    window.location.href = 'panel.html';
  } catch (error) {
    let mensaje = 'Error al iniciar sesión. Verifica tus credenciales.';
    switch (error.code) {
      case 'auth/user-not-found':
        mensaje = 'No existe una cuenta con este correo.';
        break;
      case 'auth/wrong-password':
        mensaje = 'Contraseña incorrecta.';
        break;
      case 'auth/invalid-email':
        mensaje = 'El correo no es válido.';
        break;
      case 'auth/too-many-requests':
        mensaje = 'Demasiados intentos fallidos. Intenta más tarde.';
        break;
      default:
        mensaje = error.message || mensaje;
    }
    showError(mensaje);
    passwordInput.value = '';
  } finally {
    loginBtn.classList.remove('loading');
    loginBtn.disabled = false;
  }
});

// ------------------------------------------------------------------
// 5. SESIÓN ACTIVA → REDIRIGIR AL PANEL
// ------------------------------------------------------------------
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = 'panel.html';
  }
});