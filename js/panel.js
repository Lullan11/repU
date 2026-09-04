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

// Estadísticas
const statPosts = document.getElementById('statPosts');
const statUsers = document.getElementById('statUsers');
const postsCount = document.getElementById('postsCount');
const usersCount = document.getElementById('usersCount');

// Toast
const toast = document.getElementById('toast');

// Estado
let pendingFiles = [];
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
  if (!fileListDiv) return;
  fileListDiv.innerHTML = '';

  if (pendingFiles.length > 0) {
    pendingFiles.forEach((file, index) => {
      const tag = document.createElement('span');
      tag.className = 'file-tag';
      tag.style.borderColor = '#f59e0b';
      tag.style.backgroundColor = '#fef3c7';
      let icon = '📄';
      if (file.type && file.type.startsWith('image/')) icon = '🖼️';
      else if (file.type && file.type.startsWith('video/')) icon = '🎬';
      else if (file.type === 'application/pdf') icon = '📕';
      const size = (file.size / 1024).toFixed(1);
      tag.innerHTML = `${icon} ${file.name} <span style="font-size:0.7rem; color:#d97706;">(${size}KB pendiente)</span> <span class="remove" data-pending="${index}">✕</span>`;
      fileListDiv.appendChild(tag);
    });
  }

  if (uploadedFiles.length > 0) {
    uploadedFiles.forEach((file, index) => {
      const tag = document.createElement('span');
      tag.className = 'file-tag';
      tag.style.borderColor = '#10b981';
      tag.style.backgroundColor = '#d1fae5';
      let icon = '📄';
      if (file.type && file.type.startsWith('image/')) icon = '🖼️';
      else if (file.type && file.type.startsWith('video/')) icon = '🎬';
      else if (file.type === 'application/pdf') icon = '📕';
      tag.innerHTML = `${icon} ${file.name} <span style="font-size:0.7rem; color:#059669;">✅ subido</span> <span class="remove" data-uploaded="${index}">✕</span>`;
      fileListDiv.appendChild(tag);
    });
  }

  if (pendingFiles.length === 0 && uploadedFiles.length === 0) {
    fileListDiv.innerHTML = '<span class="empty">No hay archivos seleccionados.</span>';
  }

  document.querySelectorAll('.remove[data-pending]').forEach(el => {
    el.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.pending);
      pendingFiles.splice(idx, 1);
      renderFileList();
    });
  });

  document.querySelectorAll('.remove[data-uploaded]').forEach(el => {
    el.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.uploaded);
      uploadedFiles.splice(idx, 1);
      renderFileList();
    });
  });
}

async function uploadFilesToCloudinary(files) {
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
      } else {
        console.error('❌ Cloudinary error:', data);
        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        showToast(`❌ Error al subir ${file.name}: ${errorMsg}`, 'error');
        return null;
      }
    } catch (error) {
      console.error('❌ Error en fetch:', error);
      showToast(`❌ Error al subir ${file.name}: ${error.message}`, 'error');
      return null;
    }
  }

  console.log('📦 Archivos subidos:', uploaded);
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
      if (statPosts) statPosts.textContent = '0';
      if (postsCount) postsCount.textContent = '0';
      return;
    }

    let html = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      const files = data.archivos || [];
      const urlArchivo = data.urlArchivo || '';

      const createdAt = data.createdAt ? data.createdAt.toDate() : new Date();
      const dateStr = createdAt.toLocaleDateString('es-ES') + ' ' + createdAt.toLocaleTimeString('es-ES');

      // Buscar imagen destacada
      let imageUrl = '';
      let hasFiles = files.length > 0 || urlArchivo;
      let fileCount = files.length;

      if (files.length > 0) {
        for (const file of files) {
          if (file.type && file.type.startsWith('image/')) {
            imageUrl = file.url;
            break;
          }
        }
      } else if (urlArchivo) {
        if (urlArchivo.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          imageUrl = urlArchivo;
        }
      }

      let imageHtml = '';
      let badgeHtml = '';

      if (imageUrl) {
        imageHtml = `<img src="${imageUrl}" alt="${data.titulo || 'Imagen'}" loading="lazy" />`;
      } else {
        // 🔥 CORREGIDO: Si tiene archivos, mostrar con color rojo y el icono adecuado
        let icon = 'fa-file-alt';
        let label = 'Sin archivo';
        let color = '#9ca3af';
        
        if (hasFiles) {
          // Detectar si es PDF
          let isPdf = false;
          for (const file of files) {
            if (file.type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'))) {
              isPdf = true;
              break;
            }
          }
          if (isPdf) {
            icon = 'fa-file-pdf';
            label = '📕 PDF adjunto';
            color = '#e74c3c';
          } else {
            icon = 'fa-paperclip';
            label = '📎 Archivos adjuntos';
            color = '#e74c3c';
          }
        }
        
        imageHtml = `
          <div class="no-image" style="color: ${color};">
            <i class="fas ${icon}" style="font-size:2.5rem; opacity:0.6;"></i>
            <span style="font-weight:500; font-size:0.8rem; opacity:0.8;">${label}</span>
          </div>
        `;
      }

      // Badge de archivos
      if (hasFiles) {
        badgeHtml = `
          <span class="file-badge has-files">
            <i class="fas fa-paperclip"></i> ${fileCount} archivo${fileCount !== 1 ? 's' : ''}
          </span>
        `;
      } else {
        badgeHtml = `
          <span class="file-badge no-files">
            <i class="fas fa-file-alt"></i> Sin archivos
          </span>
        `;
      }

      // Miniaturas de archivos en el footer
      let filesFooterHtml = '';
      const maxThumbs = 3;
      const filesToShow = files.slice(0, maxThumbs);
      filesToShow.forEach(f => {
        if (f.type && f.type.startsWith('image/')) {
          filesFooterHtml += `<img src="${f.url}" alt="${f.name}" title="${f.name}" />`;
        } else {
          const icon = f.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file';
          filesFooterHtml += `<span class="file-icon"><i class="fas ${icon}"></i></span>`;
        }
      });
      if (files.length > maxThumbs) {
        filesFooterHtml += `<span class="more-files">+${files.length - maxThumbs}</span>`;
      }

      // Datos para el modal
      const postData = {
        titulo: data.titulo || 'Sin título',
        texto: data.texto || '',
        createdAt: data.createdAt,
        archivos: files
      };
      const postDataJSON = JSON.stringify(postData).replace(/'/g, "\\'").replace(/"/g, '&quot;');

      html += `
        <div class="post-card" data-id="${id}" data-post-data='${JSON.stringify(postData)}'>
          <div class="post-image">
            ${imageHtml}
            ${badgeHtml}
          </div>
          <div class="post-body">
            <div class="post-title">${escapeHtml(data.titulo || 'Sin título')}</div>
            <div class="post-text">${escapeHtml(data.texto || '')}</div>
            <div class="post-meta"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
          </div>
          <div class="post-footer">
            <div class="post-files">${filesFooterHtml}</div>
            <div class="post-actions">
              <button class="btn-view" data-post-id="${id}"><i class="fas fa-eye"></i> Ver</button>
              <button class="btn btn-primary btn-sm edit-post" data-id="${id}">✏️</button>
              <button class="btn btn-danger btn-sm delete-post" data-id="${id}">🗑️</button>
            </div>
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

    if (statPosts) statPosts.textContent = snapshot.size;
    if (postsCount) postsCount.textContent = snapshot.size;

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

  const titulo = postTitle.value.trim();
  const texto = postText.value.trim();

  if (!titulo) {
    showToast('El título es obligatorio', 'error');
    return;
  }

  savePostBtn.disabled = true;
  const originalText = savePostBtn.innerHTML;
  savePostBtn.innerHTML = '⏳ Subiendo archivos...';

  try {
    let finalFiles = [...uploadedFiles];

    if (pendingFiles.length > 0) {
      console.log('📤 Subiendo', pendingFiles.length, 'archivos pendientes...');
      showToast(`📤 Subiendo ${pendingFiles.length} archivo(s)...`, 'info');

      const newFiles = await uploadFilesToCloudinary(pendingFiles);

      if (newFiles === null) {
        showToast('❌ Error al subir archivos. No se guardó la publicación.', 'error');
        savePostBtn.disabled = false;
        savePostBtn.innerHTML = originalText;
        return;
      }

      finalFiles = finalFiles.concat(newFiles);
      uploadedFiles = finalFiles;
      pendingFiles = [];
      renderFileList();
    }

    const postData = {
      titulo: titulo,
      texto: texto,
      archivos: finalFiles,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (finalFiles.length > 0) {
      postData.urlArchivo = finalFiles[0].url;
    } else {
      postData.urlArchivo = '';
    }

    if (editingId) {
      await db.collection('publicaciones').doc(editingId).update(postData);
      showToast('✅ Publicación actualizada', 'success');
    } else {
      postData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection('publicaciones').add(postData);
      console.log('📄 Publicación creada ID:', docRef.id);
      showToast('✅ Publicación creada', 'success');
    }

    resetForm();
    loadPosts();

  } catch (error) {
    console.error('❌ Error guardando:', error);
    showToast('Error al guardar: ' + error.message, 'error');
  }

  savePostBtn.disabled = false;
  savePostBtn.innerHTML = originalText;
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
    if (postIdInput) postIdInput.value = id;
    if (postTitle) postTitle.value = data.titulo || '';
    if (postText) postText.value = data.texto || '';

    if (data.archivos && data.archivos.length > 0) {
      uploadedFiles = data.archivos;
      pendingFiles = [];
    } else if (data.urlArchivo) {
      uploadedFiles = [{
        url: data.urlArchivo,
        type: 'image/jpeg',
        name: 'Archivo'
      }];
      pendingFiles = [];
    } else {
      uploadedFiles = [];
      pendingFiles = [];
    }

    renderFileList();
    if (formTitle) formTitle.textContent = '✏️ Editar publicación';
    if (savePostBtn) savePostBtn.textContent = 'Actualizar publicación';
    if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';

    document.dispatchEvent(new Event('editPostTriggered'));

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
  if (postIdInput) postIdInput.value = '';
  if (postTitle) postTitle.value = '';
  if (postText) postText.value = '';
  pendingFiles = [];
  uploadedFiles = [];
  renderFileList();
  if (formTitle) formTitle.textContent = '✏️ Nueva publicación';
  if (savePostBtn) savePostBtn.textContent = 'Guardar publicación';
  if (cancelEditBtn) cancelEditBtn.style.display = 'none';
  if (fileInput) fileInput.value = '';
}

// ------------------------------------------------------------------
// 5. MANEJO DE ARCHIVOS
// ------------------------------------------------------------------
if (fileInput) {
  fileInput.addEventListener('change', function(e) {
    const files = this.files;
    if (files.length === 0) return;

    console.log('📂 Archivos seleccionados para añadir a la cola:', files.length);

    for (let i = 0; i < files.length; i++) {
      pendingFiles.push(files[i]);
      console.log(`  - ${files[i].name} (${files[i].type}, ${files[i].size} bytes)`);
    }

    this.value = '';
    renderFileList();
    showToast(`📎 ${files.length} archivo(s) añadido(s) a la cola`, 'info');
  });
}

if (uploadFilesBtn) {
  uploadFilesBtn.addEventListener('click', async function() {
    if (pendingFiles.length === 0) {
      showToast('📎 No hay archivos pendientes para subir', 'info');
      return;
    }

    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';

    const newFiles = await uploadFilesToCloudinary(pendingFiles);

    if (newFiles !== null && newFiles.length > 0) {
      uploadedFiles = uploadedFiles.concat(newFiles);
      pendingFiles = [];
      renderFileList();
      showToast(`✅ ${newFiles.length} archivo(s) subido(s) a Cloudinary`, 'success');
    } else {
      showToast('❌ Error al subir archivos', 'error');
    }

    this.disabled = false;
    this.innerHTML = '<i class="fas fa-upload"></i> Subir archivos';
  });
}

// ------------------------------------------------------------------
// 6. GESTIÓN DE USUARIOS (SIN CAMBIOS)
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

if (userForm) {
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
}

async function loadUsers() {
  try {
    console.log('🔄 Cargando usuarios...');
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      userListDiv.innerHTML = '<span class="empty">No hay usuarios adicionales.</span>';
      if (statUsers) statUsers.textContent = '0';
      if (usersCount) usersCount.textContent = '0';
      return;
    }

    let html = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;
      const isCurrentUser = (currentUser && currentUser.uid === uid);

      html += `
        <div class="user-item" data-uid="${uid}">
          <div class="user-info">
            <div class="user-avatar">${data.email.charAt(0).toUpperCase()}</div>
            <span class="user-email">${escapeHtml(data.email)}</span>
            ${isCurrentUser ? '<span class="user-badge">tú</span>' : ''}
          </div>
          <div class="user-actions">
            <button class="btn btn-primary btn-sm edit-user" data-uid="${uid}" data-email="${data.email}">✏️</button>
            <button class="btn btn-danger btn-sm delete-user" data-uid="${uid}" data-email="${data.email}" ${isCurrentUser ? 'disabled' : ''}>🗑️</button>
          </div>
        </div>
      `;
    });
    userListDiv.innerHTML = html;

    if (statUsers) statUsers.textContent = snapshot.size;
    if (usersCount) usersCount.textContent = snapshot.size;

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
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
    window.location.href = 'login.html';
  });
}

// ------------------------------------------------------------------
// 8. VERIFICAR AUTENTICACIÓN Y CARGAR DATOS
// ------------------------------------------------------------------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    currentUser = user;
    const email = user.email || 'Usuario';
    if (welcomeSpan) welcomeSpan.textContent = `👋 Bienvenido, ${email}`;

    console.log('✅ Usuario autenticado:', email);

    await loadPosts();
    await loadUsers();

    if (userListDiv) {
      const deleteOwnBtn = document.createElement('button');
      deleteOwnBtn.textContent = '🗑️ Eliminar mi cuenta';
      deleteOwnBtn.className = 'btn btn-danger';
      deleteOwnBtn.style.marginTop = '1rem';
      deleteOwnBtn.style.width = '100%';
      deleteOwnBtn.addEventListener('click', deleteOwnAccount);

      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.justifyContent = 'flex-end';
      wrapper.appendChild(deleteOwnBtn);
      userListDiv.parentNode.insertBefore(wrapper, userListDiv.nextSibling);
    }
  }
});

// ------------------------------------------------------------------
// 9. EVENTOS DEL FORMULARIO DE PUBLICACIÓN
// ------------------------------------------------------------------
if (postForm) postForm.addEventListener('submit', savePost);
if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetForm);
renderFileList();

console.log('🚀 Panel inicializado correctamente');