// ------------------------------------------------------------------
// 1. CONFIGURACIONES (TUS DATOS REALES)
// ------------------------------------------------------------------

// --- Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCk5XknbZinI_-QaXkR6g22-HDuSvhYFRc",
  authDomain: "repou-f3d37.firebaseapp.com",
  projectId: "repou-f3d37",
  storageBucket: "repou-f3d37.firebasestorage.app",
  messagingSenderId: "212576901079",
  appId: "1:212576901079:web:9e5ad2f2d857d5635d1d92"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Cloudinary ---
const CLOUDINARY_CLOUD_NAME = "rqdxjrky";
const CLOUDINARY_UPLOAD_PRESET = "repUsystem";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

// ------------------------------------------------------------------
// 2. ELEMENTOS DEL DOM
// ------------------------------------------------------------------
const postForm = document.getElementById('postForm');
const postIdInput = document.getElementById('postId');
const postTitle = document.getElementById('postTitle');
const postText = document.getElementById('postText');
const fileInput = document.getElementById('fileInput');
const fileListDiv = document.getElementById('fileList');
const uploadFilesBtn = document.getElementById('uploadFilesBtn');
const savePostBtn = document.getElementById('savePostBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const formTitle = document.getElementById('formTitle');
const postsContainer = document.getElementById('postsContainer');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeSpan = document.getElementById('welcomeMessage');

// Usuarios
const userForm = document.getElementById('userForm');
const userEmail = document.getElementById('userEmail');
const userPassword = document.getElementById('userPassword');
const userListDiv = document.getElementById('userList');

// Toast
const toast = document.getElementById('toast');

// Estado
let uploadedFiles = [];
let editingId = null;
let currentUser = null;

// ------------------------------------------------------------------
// 3. FUNCIONES AUXILIARES
// ------------------------------------------------------------------
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

function renderFileList() {
  fileListDiv.innerHTML = '';
  if (uploadedFiles.length === 0) {
    fileListDiv.innerHTML = '<span class="empty">No hay archivos subidos.</span>';
    return;
  }
  uploadedFiles.forEach((file, index) => {
    const tag = document.createElement('span');
    tag.className = 'file-tag';
    let icon = '📄';
    if (file.type && file.type.startsWith('image/')) icon = '🖼️';
    else if (file.type && file.type.startsWith('video/')) icon = '🎬';
    else if (file.type === 'application/pdf') icon = '📕';
    tag.innerHTML = `${icon} ${file.name} <span class="remove" data-index="${index}">✕</span>`;
    fileListDiv.appendChild(tag);
  });
  document.querySelectorAll('.file-tag .remove').forEach(el => {
    el.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index);
      uploadedFiles.splice(idx, 1);
      renderFileList();
    });
  });
}

async function uploadFilesToCloudinary(files) {
  console.log('🔥🔥🔥 uploadFilesToCloudinary LLAMADA con', files.length, 'archivos');
  const uploaded = [];

  for (const file of files) {
    console.log('📤 Subiendo archivo:', file.name, file.type, file.size);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('📤 Cloudinary response:', data);

      if (response.ok && data.secure_url) {
        uploaded.push({
          url: data.secure_url,
          type: file.type || 'application/octet-stream',
          name: file.name,
        });
        console.log('✅ Archivo subido:', data.secure_url);
        showToast(`✅ ${file.name} subido`, 'success');
      } else {
        console.error('❌ Cloudinary error:', data);
        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        showToast(`❌ Error al subir ${file.name}: ${errorMsg}`, 'error');
      }
    } catch (error) {
      console.error('❌ Error en fetch:', error);
      showToast(`❌ Error al subir ${file.name}: ${error.message}`, 'error');
    }
  }

  console.log('📦 Archivos subidos (resultado):', uploaded);
  return uploaded;
}

// ------------------------------------------------------------------
// 4. CRUD DE PUBLICACIONES
// ------------------------------------------------------------------
async function loadPosts() {
  try {
    console.log('🔄 Cargando publicaciones...');
    const snapshot = await db.collection('publicaciones')
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      postsContainer.innerHTML = '<p class="empty">No hay publicaciones aún.</p>';
      return;
    }

    let html = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      const urlArchivo = data.urlArchivo || '';

      const createdAt = data.createdAt ? data.createdAt.toDate() : new Date();
      const dateStr = createdAt.toLocaleDateString('es-ES') + ' ' + createdAt.toLocaleTimeString('es-ES');

      let filesHtml = '';

      if (urlArchivo) {
        const isImage = urlArchivo.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
        const isVideo = urlArchivo.match(/\.(mp4|webm|ogg|mov)$/i);
        const isPdf = urlArchivo.match(/\.(pdf)$/i);

        if (isImage) {
          filesHtml += `
            <div style="margin-bottom:0.5rem;">
              <img src="${urlArchivo}" alt="Imagen" style="max-width:300px; max-height:300px; border-radius:8px; display:block; border:1px solid #e2e8f0;" />
              <span style="font-size:0.8rem; color:#64748b;">📷 Imagen</span>
            </div>
          `;
        } else if (isVideo) {
          filesHtml += `
            <div style="margin-bottom:0.5rem;">
              <video controls style="max-width:400px; max-height:300px; border-radius:8px;">
                <source src="${urlArchivo}" type="video/mp4">
                Tu navegador no soporta video.
              </video>
              <br><span style="font-size:0.8rem; color:#64748b;">🎬 Video</span>
            </div>
          `;
        } else if (isPdf) {
          filesHtml += `
            <a href="${urlArchivo}" target="_blank" style="display:inline-flex; align-items:center; gap:0.3rem; padding:0.2rem 0.9rem; background:#e9ecf2; border-radius:30px; text-decoration:none; color:#1e293b; font-size:0.85rem;">
              📕 Ver PDF
            </a>
          `;
        } else {
          filesHtml += `
            <a href="${urlArchivo}" target="_blank" download style="display:inline-flex; align-items:center; gap:0.3rem; padding:0.2rem 0.9rem; background:#e9ecf2; border-radius:30px; text-decoration:none; color:#1e293b; font-size:0.85rem;">
              📄 Descargar archivo
            </a>
          `;
        }
      }

      html += `
        <div class="post-item" data-id="${id}">
          <div class="post-header">
            <span class="post-title">${escapeHtml(data.titulo || 'Sin título')}</span>
            <span class="post-meta">📅 ${dateStr}</span>
          </div>
          <div class="post-body">${escapeHtml(data.texto || '')}</div>
          <div class="post-files" style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
            ${filesHtml}
          </div>
          <div class="post-actions" style="margin-top:0.8rem;">
            <button class="btn btn-primary btn-sm edit-post" data-id="${id}">✏️ Editar</button>
            <button class="btn btn-danger btn-sm delete-post" data-id="${id}">🗑️ Eliminar</button>
          </div>
        </div>
      `;
    });

    postsContainer.innerHTML = html;

    document.querySelectorAll('.edit-post').forEach(btn => {
      btn.addEventListener('click', () => editPost(btn.dataset.id));
    });
    document.querySelectorAll('.delete-post').forEach(btn => {
      btn.addEventListener('click', () => deletePost(btn.dataset.id));
    });

  } catch (error) {
    console.error('❌ Error cargando publicaciones:', error);
    showToast('Error al cargar publicaciones', 'error');
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function savePost(event) {
  event.preventDefault();

  console.log('💾💾💾 SAVEPOST LLAMADO');
  console.log('📦 uploadedFiles ANTES de guardar:', uploadedFiles);

  const titulo = postTitle.value.trim();
  const texto = postText.value.trim();

  if (!titulo) {
    showToast('El título es obligatorio', 'error');
    return;
  }

  const postData = {
    titulo: titulo,
    texto: texto,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (uploadedFiles.length > 0) {
    postData.urlArchivo = uploadedFiles[0].url;
    console.log('🔗 URL guardada:', postData.urlArchivo);
  } else {
    postData.urlArchivo = '';
    console.warn('⚠️ NO HAY ARCHIVOS SUBIDOS');
  }

  postData.archivos = uploadedFiles;

  try {
    if (editingId) {
      await db.collection('publicaciones').doc(editingId).update(postData);
      showToast('✅ Publicación actualizada', 'success');
    } else {
      postData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection('publicaciones').add(postData);
      console.log('📄 Publicación creada ID:', docRef.id);
      console.log('📄 Datos guardados:', JSON.stringify(postData));
      showToast('✅ Publicación creada', 'success');
    }
    resetForm();
    loadPosts();
  } catch (error) {
    console.error('❌ Error guardando:', error);
    showToast('Error al guardar: ' + error.message, 'error');
  }
}

async function editPost(id) {
  try {
    const doc = await db.collection('publicaciones').doc(id).get();
    if (!doc.exists) {
      showToast('Publicación no encontrada', 'error');
      return;
    }
    const data = doc.data();
    editingId = id;
    postIdInput.value = id;
    postTitle.value = data.titulo || '';
    postText.value = data.texto || '';

    if (data.archivos && data.archivos.length > 0) {
      uploadedFiles = data.archivos;
    } else if (data.urlArchivo) {
      uploadedFiles = [{
        url: data.urlArchivo,
        type: 'image/jpeg',
        name: 'Archivo'
      }];
    } else {
      uploadedFiles = [];
    }

    renderFileList();
    formTitle.textContent = '✏️ Editar publicación';
    savePostBtn.textContent = 'Actualizar publicación';
    cancelEditBtn.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    console.error('Error al cargar edición:', error);
    showToast('Error al cargar la publicación', 'error');
  }
}

async function deletePost(id) {
  if (!confirm('¿Seguro que quieres eliminar esta publicación?')) return;
  try {
    await db.collection('publicaciones').doc(id).delete();
    showToast('🗑️ Publicación eliminada', 'success');
    loadPosts();
    if (editingId === id) resetForm();
  } catch (error) {
    console.error('Error eliminando:', error);
    showToast('Error al eliminar', 'error');
  }
}

function resetForm() {
  editingId = null;
  postIdInput.value = '';
  postTitle.value = '';
  postText.value = '';
  uploadedFiles = [];
  renderFileList();
  formTitle.textContent = '✏️ Nueva publicación';
  savePostBtn.textContent = 'Guardar publicación';
  cancelEditBtn.style.display = 'none';
  fileInput.value = '';
}

// ------------------------------------------------------------------
// 5. MANEJO DE ARCHIVOS (Cloudinary)
// ------------------------------------------------------------------
uploadFilesBtn.addEventListener('click', async () => {
  console.log('🔥🔥🔥 BOTÓN SUBIR ARCHIVOS CLICKEADO');
  const files = fileInput.files;
  console.log('📂 Archivos seleccionados:', files.length);

  if (files.length === 0) {
    showToast('❌ Selecciona al menos un archivo', 'error');
    return;
  }

  for (let i = 0; i < files.length; i++) {
    console.log(`  - ${files[i].name} (${files[i].type}, ${files[i].size} bytes)`);
  }

  uploadFilesBtn.disabled = true;
  uploadFilesBtn.textContent = '⏳ Subiendo...';

  try {
    const newFiles = await uploadFilesToCloudinary(files);

    console.log('📦 newFiles devueltos:', newFiles);

    if (newFiles.length > 0) {
      uploadedFiles = uploadedFiles.concat(newFiles);
      renderFileList();
      showToast(`✅ ${newFiles.length} archivo(s) subido(s)`, 'success');
      console.log('📦 uploadedFiles AHORA:', JSON.stringify(uploadedFiles));
    } else {
      showToast('❌ No se pudo subir ningún archivo', 'error');
    }
  } catch (error) {
    console.error('❌ Error en subida:', error);
    showToast('❌ Error al subir archivos', 'error');
  }

  fileInput.value = '';
  uploadFilesBtn.disabled = false;
  uploadFilesBtn.textContent = '⬆️ Subir archivos';
});

// ------------------------------------------------------------------
// 6. GESTIÓN DE USUARIOS
// ------------------------------------------------------------------

async function createUserKeepingSession(email, password) {
  const secondaryAppName = 'Secondary-' + Date.now();
  const secondaryApp = firebase.initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = secondaryApp.auth();

  try {
    const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const newUser = userCredential.user;

    await db.collection('users').doc(newUser.uid).set({
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: currentUser ? currentUser.uid : 'unknown'
    });

    await secondaryAuth.signOut();
    return newUser;
  } finally {
    await secondaryApp.delete();
  }
}

userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = userEmail.value.trim();
  const password = userPassword.value.trim();

  if (!email || !password || password.length < 6) {
    showToast('Correo válido y contraseña de al menos 6 caracteres', 'error');
    return;
  }

  try {
    await createUserKeepingSession(email, password);
    showToast(`✅ Usuario ${email} creado`, 'success');
    userEmail.value = '';
    userPassword.value = '';
    loadUsers();
  } catch (error) {
    console.error('Error creando usuario:', error);
    let msg = 'Error al crear usuario';
    if (error.code === 'auth/email-already-in-use') msg = 'El correo ya está en uso.';
    showToast(msg, 'error');
  }
});

async function loadUsers() {
  try {
    console.log('🔄 Cargando usuarios...');
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      userListDiv.innerHTML = '<span class="empty">No hay usuarios adicionales.</span>';
      return;
    }

    let html = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;
      const isCurrentUser = (currentUser && currentUser.uid === uid);

      html += `
        <div class="user-item" data-uid="${uid}" style="display:flex; align-items:center; gap:0.8rem; background:#f1f5f9; padding:0.5rem 1rem; border-radius:30px; margin-bottom:0.5rem; flex-wrap:wrap;">
          <span style="font-weight:500;">${escapeHtml(data.email)}</span>
          ${isCurrentUser ? '<span style="background:#4a6cf7; color:white; padding:0.1rem 0.8rem; border-radius:20px; font-size:0.7rem;">tú</span>' : ''}
          <div style="margin-left:auto; display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm edit-user" data-uid="${uid}" data-email="${data.email}">✏️ Editar</button>
            <button class="btn btn-danger btn-sm delete-user" data-uid="${uid}" data-email="${data.email}" ${isCurrentUser ? 'disabled style="opacity:0.5;"' : ''}>🗑️ Eliminar</button>
          </div>
        </div>
      `;
    });
    userListDiv.innerHTML = html;

    document.querySelectorAll('.edit-user').forEach(btn => {
      btn.addEventListener('click', () => editUser(btn.dataset.uid, btn.dataset.email));
    });
    document.querySelectorAll('.delete-user').forEach(btn => {
      btn.addEventListener('click', () => deleteUser(btn.dataset.uid, btn.dataset.email));
    });
  } catch (error) {
    console.error('Error cargando usuarios:', error);
  }
}

function editUser(uid, currentEmail) {
  if (!currentUser) return;
  if (currentUser.uid !== uid) {
    showToast('Solo puedes editar tu propio usuario.', 'error');
    return;
  }

  const newEmail = prompt('Nuevo correo (deja vacío para no cambiar):', currentEmail);
  if (newEmail !== null && newEmail.trim() !== '' && newEmail !== currentEmail) {
    currentUser.updateEmail(newEmail.trim())
      .then(() => {
        showToast('✅ Correo actualizado', 'success');
        db.collection('users').doc(uid).update({ email: newEmail.trim() });
        welcomeSpan.textContent = `👋 Bienvenido, ${newEmail.trim()}`;
        loadUsers();
      })
      .catch(err => {
        console.error('Error actualizando correo:', err);
        showToast('Error: ' + err.message, 'error');
      });
  }

  const newPassword = prompt('Nueva contraseña (mínimo 6 caracteres, dejar vacío para no cambiar):');
  if (newPassword !== null && newPassword.trim().length >= 6) {
    currentUser.updatePassword(newPassword.trim())
      .then(() => {
        showToast('✅ Contraseña actualizada', 'success');
      })
      .catch(err => {
        console.error('Error actualizando contraseña:', err);
        showToast('Error: ' + err.message, 'error');
      });
  }
}

async function deleteUser(uid, email) {
  if (!currentUser) return;
  if (currentUser.uid === uid) {
    showToast('No puedes eliminarte a ti mismo.', 'error');
    return;
  }
  if (!confirm(`⚠️ ¿Seguro que quieres eliminar al usuario ${email}?`)) return;

  try {
    await db.collection('users').doc(uid).delete();
    showToast(`✅ Usuario ${email} eliminado de la lista.`, 'success');
    loadUsers();
    showToast('⚠️ Para eliminarlo también de Authentication usa la consola de Firebase.', 'info');
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    showToast('Error al eliminar: ' + error.message, 'error');
  }
}

function deleteOwnAccount() {
  if (!currentUser) return;
  if (!confirm('⚠️ ¿Estás seguro de que quieres eliminar tu cuenta?\nEsta acción es irreversible.')) return;

  const password = prompt('Para confirmar, introduce tu contraseña actual:');
  if (!password) return;

  const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
  currentUser.reauthenticateWithCredential(credential)
    .then(() => {
      currentUser.delete()
        .then(() => {
          db.collection('users').doc(currentUser.uid).delete().catch(console.error);
          showToast('✅ Cuenta eliminada.', 'success');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1500);
        })
        .catch(err => {
          console.error('Error eliminando cuenta:', err);
          showToast('Error: ' + err.message, 'error');
        });
    })
    .catch(err => {
      console.error('Error en reautenticación:', err);
      showToast('Contraseña incorrecta', 'error');
    });
}

// ------------------------------------------------------------------
// 7. CERRAR SESIÓN
// ------------------------------------------------------------------
logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
  window.location.href = 'login.html';
});

// ------------------------------------------------------------------
// 8. VERIFICAR AUTENTICACIÓN Y CARGAR DATOS
// ------------------------------------------------------------------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    currentUser = user;
    const email = user.email || 'Usuario';
    welcomeSpan.textContent = `👋 Bienvenido, ${email}`;

    console.log('✅ Usuario autenticado:', email);

    await loadPosts();
    await loadUsers();

    const deleteOwnBtn = document.createElement('button');
    deleteOwnBtn.textContent = '🗑️ Eliminar mi cuenta';
    deleteOwnBtn.className = 'btn btn-danger';
    deleteOwnBtn.style.marginTop = '1rem';
    deleteOwnBtn.addEventListener('click', deleteOwnAccount);

    const userListParent = document.querySelector('#userList');
    if (userListParent) {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.justifyContent = 'flex-end';
      wrapper.appendChild(deleteOwnBtn);
      userListParent.parentNode.insertBefore(wrapper, userListParent.nextSibling);
    }
  }
});

// ------------------------------------------------------------------
// 9. EVENTOS DEL FORMULARIO DE PUBLICACIÓN
// ------------------------------------------------------------------
postForm.addEventListener('submit', savePost);
cancelEditBtn.addEventListener('click', resetForm);
renderFileList();

console.log('🚀 Panel inicializado correctamente');