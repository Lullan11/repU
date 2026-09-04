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

// Recuperación
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const recoveryModal = document.getElementById('recoveryModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const backToLoginBtn = document.getElementById('backToLoginBtn');
const recoveryForm = document.getElementById('recoveryForm');
const recoveryEmail = document.getElementById('recoveryEmail');
const sendResetBtn = document.getElementById('sendResetBtn');
const recoveryStatus = document.getElementById('recoveryStatus');

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

function showRecoveryStatus(message, type = 'success') {
  recoveryStatus.textContent = message;
  recoveryStatus.className = 'recovery-status ' + type;
  setTimeout(() => {
    recoveryStatus.className = 'recovery-status';
  }, 6000);
}

function clearRecoveryStatus() {
  recoveryStatus.className = 'recovery-status';
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

// ------------------------------------------------------------------
// 6. RECUPERACIÓN DE CONTRASEÑA
// ------------------------------------------------------------------

// Abrir modal
forgotPasswordBtn.addEventListener('click', () => {
  recoveryModal.classList.add('active');
  recoveryEmail.value = emailInput.value || '';
  clearRecoveryStatus();
  // Resetear botón
  sendResetBtn.disabled = false;
  sendResetBtn.classList.remove('loading');
  sendResetBtn.querySelector('.btn-text').textContent = 'Enviar enlace';
});

// Cerrar modal (botón X)
closeModalBtn.addEventListener('click', () => {
  recoveryModal.classList.remove('active');
  clearRecoveryStatus();
});

// Cerrar modal (botón Volver)
backToLoginBtn.addEventListener('click', () => {
  recoveryModal.classList.remove('active');
  clearRecoveryStatus();
});

// Cerrar modal al hacer clic fuera del contenido
recoveryModal.addEventListener('click', (e) => {
  if (e.target === recoveryModal) {
    recoveryModal.classList.remove('active');
    clearRecoveryStatus();
  }
});

// Enviar correo de restablecimiento
recoveryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearRecoveryStatus();

  const email = recoveryEmail.value.trim();

  if (!email) {
    showRecoveryStatus('Por favor, ingresa tu correo electrónico.', 'error');
    return;
  }

  // Deshabilitar botón
  sendResetBtn.disabled = true;
  sendResetBtn.classList.add('loading');
  sendResetBtn.querySelector('.btn-text').textContent = 'Enviando...';

  try {
    await auth.sendPasswordResetEmail(email);
    showRecoveryStatus(
      '✅ ¡Correo enviado! Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.',
      'success'
    );
    sendResetBtn.querySelector('.btn-text').textContent = '✅ Enviado';
  } catch (error) {
    let mensaje = 'Error al enviar el correo.';
    switch (error.code) {
      case 'auth/user-not-found':
        mensaje = 'No existe una cuenta con este correo.';
        break;
      case 'auth/invalid-email':
        mensaje = 'El correo no es válido.';
        break;
      case 'auth/too-many-requests':
        mensaje = 'Demasiados intentos. Intenta más tarde.';
        break;
      default:
        mensaje = error.message || mensaje;
    }
    showRecoveryStatus('❌ ' + mensaje, 'error');
    sendResetBtn.disabled = false;
    sendResetBtn.classList.remove('loading');
    sendResetBtn.querySelector('.btn-text').textContent = 'Enviar enlace';
  }
});

// Permitir cerrar modal con ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && recoveryModal.classList.contains('active')) {
    recoveryModal.classList.remove('active');
    clearRecoveryStatus();
  }
});