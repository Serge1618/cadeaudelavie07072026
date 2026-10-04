// Version SANS Firebase Storage (pas besoin de carte bancaire)
// ============================================

// ---- CONFIG FIREBASE (Realtime Database seulement) ----
const firebaseConfig = {
  apiKey: "AIzaSyBSYUHncCnAyEsAFWu-x_U_KOje8SyShgU",
  authDomain: "cadeaudelavie07072026-8c2fb.firebaseapp.com",
  databaseURL: "https://cadeaudelavie07072026-8c2fb-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cadeaudelavie07072026-8c2fb",
  storageBucket: "cadeaudelavie07072026-8c2fb.firebasestorage.app",
  messagingSenderId: "440442414116",
  appId: "1:440442414116:web:b201f04b4c70b43391e4b1"
};
const SECRET_CODE = "SergeMarianne";

// ---- Initialisation ----
let db = null;
let isFirebaseReady = false;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  isFirebaseReady = true;
  console.log("Firebase Realtime Database prêt");
} catch (e) {
  console.warn("Firebase non configuré — mode local");
  isFirebaseReady = false;
}

// ---- DOM ----
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const secretInput = document.getElementById('secret-code');
const enterBtn = document.getElementById('enter-btn');
const loginError = document.getElementById('login-error');

const gallery = document.getElementById('gallery');
const chapitres = document.getElementById('chapitres');
const mediaFile = document.getElementById('media-file');
const mediaPreview = document.getElementById('media-preview');
const mediaUrlInput = document.getElementById('media-url');
const submitBtn = document.getElementById('submit-btn');
const addForm = document.getElementById('add-form');

const histoireForm = document.getElementById('histoire-form');
const histoireMedia = document.getElementById('histoire-media');
const histoirePreview = document.getElementById('histoire-preview');
const histoireUrlInput = document.getElementById('histoire-url');
const histoireSubmit = document.getElementById('histoire-submit');

let currentFilter = 'all';
let allMemories = [];
let allChapitres = [];

// ---- BANDEAU ----
const bannerItems = [
  { emoji: '🐿️', label: 'écureuil' },
  { emoji: '🧶', label: 'laine émeraude' },
  { emoji: '🧢', label: 'bonnet tricot' },
  { emoji: '🐱', label: 'chat' },
  { emoji: '🐶', label: 'chien' },
  { emoji: '🌸', label: 'fleurs roses' },
  { emoji: '🦋', label: 'papillon' },
  { emoji: '🧚', label: 'fée Marianne' },
  { emoji: '🌺', label: 'orchidée' },
  { emoji: '🐘', label: 'éléphant' },
  { emoji: '🐠', label: 'hippocampe' },
  { emoji: '🐿️', label: 'petit écureuil' },
  { emoji: '🐦', label: 'Black Robin' },
  { emoji: '🧶', label: 'Marianne tricote' },
  { emoji: '👩‍🦰', label: 'Marianne rousse' },
  { emoji: '🇫🇷', label: 'Clermont-Ferrand' },
];

function buildBanner() {
  const track = document.getElementById('banner-track');
  const items = [...bannerItems, ...bannerItems];
  track.innerHTML = items.map(item => `
    <div class="banner-item">
      <span class="emoji">${item.emoji}</span>
      <span class="label">${item.label}</span>
    </div>
  `).join('');
}

// ---- UTILITAIRES ----
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate() {
  const now = new Date();
  return now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function extractYoutubeId(text) {
  if (!text) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

function renderTextWithYoutube(text) {
  if (!text) return '';
  const ytId = extractYoutubeId(text);
  let html = escapeHtml(text);
  if (ytId) {
    const linkPattern = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)[a-zA-Z0-9_-]{11}[^\s]*/gi;
    html = html.replace(linkPattern, '').trim();
    const embed = `<div class="youtube-embed"><iframe src="https://www.youtube.com/embed/${ytId}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;
    return (html ? `<p class="memory-text">${html}</p>` : '') + embed;
  }
  return `<p class="memory-text">${html}</p>`;
}

function getMediaTypeFromUrl(url) {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.endsWith('.pdf') || lower.includes('/pdf')) return 'pdf';
  if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(lower)) return 'video';
  if (/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(lower) || lower.startsWith('data:image')) return 'image';
  return 'link';
}

function renderMedia(url, type) {
  if (!url) return '';
  if (type === 'video') {
    return `<div class="memory-media"><video src="${url}" controls playsinline preload="metadata"></video></div>`;
  }
  if (type === 'pdf') {
    return `<a class="pdf-link" href="${url}" target="_blank" rel="noopener">📄 Ouvrir / Télécharger le PDF</a>`;
  }
  if (type === 'image' || (url && url.startsWith('data:image'))) {
    return `<div class="memory-media"><img src="${url}" alt="Création" loading="lazy" onclick="window.open(this.src,'_blank')"></div>`;
  }
  return `<a class="pdf-link" href="${url}" target="_blank" rel="noopener">🔗 Ouvrir le lien</a>`;
}

// Convertit un fichier image en base64 (max ~1.2 Mo)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 1.2 * 1024 * 1024) {
      reject(new Error('Image trop lourde (max 1,2 Mo). Compresse-la ou utilise un lien (Imgur, etc.).'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('Seules les images peuvent être uploadées directement. Pour vidéo/PDF, colle un lien.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---- LOGIN ----
function checkBirthdaySurprise() {
  const now = new Date();
  const isLadyBirthday = now.getDate() === 29 && now.getMonth() === 9;
  const surprise = document.getElementById('birthday-surprise');
  if (surprise) {
    surprise.classList.toggle('hidden', !isLadyBirthday);
  }
}

function checkLogin() {
  const code = secretInput.value.trim();
  if (code === SECRET_CODE) {
    loginScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    sessionStorage.setItem('cadeau_auth', 'true');
    checkBirthdaySurprise();
    loadMemories();
    loadChapitres();
  } else {
    loginError.classList.remove('hidden');
    secretInput.value = '';
    secretInput.focus();
  }
}

enterBtn.addEventListener('click', checkLogin);
secretInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') checkLogin();
});

if (sessionStorage.getItem('cadeau_auth') === 'true') {
  loginScreen.classList.add('hidden');
  mainApp.classList.remove('hidden');
  checkBirthdaySurprise();
}

// ---- NAVIGATION ----
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const page = btn.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + page).classList.remove('hidden');
    if (page === 'heritage') prepareHeritage();
  });
});

// ---- PREVIEW ----
function setupPreview(inputEl, previewEl) {
  if (!inputEl || !previewEl) return;
  inputEl.addEventListener('change', () => {
    const file = inputEl.files[0];
    if (!file) {
      previewEl.classList.add('hidden');
      previewEl.innerHTML = '';
      return;
    }
    if (file.type.startsWith('image/')) {
      previewEl.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Aperçu">`;
      previewEl.classList.remove('hidden');
    } else {
      previewEl.innerHTML = `<span style="padding:0.8rem;display:block;">⚠️ Seules les images sont acceptées en fichier. Pour vidéo/PDF → colle un lien.</span>`;
      previewEl.classList.remove('hidden');
    }
  });
}

setupPreview(mediaFile, mediaPreview);
setupPreview(histoireMedia, histoirePreview);

// ---- AJOUT MOMENT ----
addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const author = document.getElementById('author').value;
  const text = document.getElementById('text-content').value.trim();
  const file = mediaFile ? mediaFile.files[0] : null;
  const externalUrl = mediaUrlInput ? mediaUrlInput.value.trim() : '';

  if (!author) { alert('Choisis un auteur 💚💜'); return; }
  if (!text && !file && !externalUrl) { alert('Ajoute un texte, une image ou un lien'); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Publication...';

  try {
    let mediaUrl = externalUrl || null;
    let mediaType = mediaUrl ? getMediaTypeFromUrl(mediaUrl) : null;

    if (file) {
      mediaUrl = await fileToBase64(file);
      mediaType = 'image';
    }

    const memory = {
      author,
      text: text || '',
      mediaUrl,
      mediaType,
      date: formatDate(),
      timestamp: Date.now()
    };

    if (isFirebaseReady) {
      await db.ref('memories').push(memory);
    } else {
      allMemories.unshift(memory);
      localStorage.setItem('cadeau_memories', JSON.stringify(allMemories));
      renderGallery();
    }

    addForm.reset();
    if (mediaPreview) {
      mediaPreview.classList.add('hidden');
      mediaPreview.innerHTML = '';
    }
  } catch (err) {
    console.error(err);
    alert(err.message || 'Erreur lors de la publication.');
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Publier ✨';
});

// ---- AJOUT CHAPITRE ----
histoireForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const titre = document.getElementById('chapitre-titre').value.trim();
  const author = document.getElementById('histoire-author').value;
  const text = document.getElementById('histoire-text').value.trim();
  const file = histoireMedia ? histoireMedia.files[0] : null;
  const externalUrl = histoireUrlInput ? histoireUrlInput.value.trim() : '';

  if (!titre || !author) { alert('Titre et auteur obligatoires'); return; }
  if (!text && !file && !externalUrl) { alert('Ajoute un récit, une image ou un lien'); return; }

  histoireSubmit.disabled = true;
  histoireSubmit.textContent = 'Publication...';

  try {
    let mediaUrl = externalUrl || null;
    let mediaType = mediaUrl ? getMediaTypeFromUrl(mediaUrl) : null;

    if (file) {
      mediaUrl = await fileToBase64(file);
      mediaType = 'image';
    }

    const chapitre = {
      titre,
      author,
      text: text || '',
      mediaUrl,
      mediaType,
      date: formatDate(),
      timestamp: Date.now()
    };

    if (isFirebaseReady) {
      await db.ref('chapitres').push(chapitre);
    } else {
      allChapitres.push(chapitre);
      allChapitres.sort((a, b) => a.timestamp - b.timestamp);
      localStorage.setItem('cadeau_chapitres', JSON.stringify(allChapitres));
      renderChapitres();
    }

    histoireForm.reset();
    if (histoirePreview) {
      histoirePreview.classList.add('hidden');
      histoirePreview.innerHTML = '';
    }
  } catch (err) {
    console.error(err);
    alert(err.message || 'Erreur lors de la publication.');
  }

  histoireSubmit.disabled = false;
  histoireSubmit.textContent = 'Publier le chapitre ✨';
});

// ---- CHARGEMENT ----
function loadMemories() {
  if (isFirebaseReady) {
    db.ref('memories').orderByChild('timestamp').on('value', (snapshot) => {
      allMemories = [];
      snapshot.forEach((child) => {
        allMemories.push({ id: child.key, ...child.val() });
      });
      allMemories.reverse();
      renderGallery();
    });
  } else {
    const stored = localStorage.getItem('cadeau_memories');
    allMemories = stored ? JSON.parse(stored) : [];
    renderGallery();
  }
}

function loadChapitres() {
  if (isFirebaseReady) {
    db.ref('chapitres').orderByChild('timestamp').on('value', (snapshot) => {
      allChapitres = [];
      snapshot.forEach((child) => {
        allChapitres.push({ id: child.key, ...child.val() });
      });
      allChapitres.sort((a, b) => a.timestamp - b.timestamp);
      renderChapitres();
    });
  } else {
    const stored = localStorage.getItem('cadeau_chapitres');
    allChapitres = stored ? JSON.parse(stored) : [];
    allChapitres.sort((a, b) => a.timestamp - b.timestamp);
    renderChapitres();
  }
}

// ---- RENDU ----
function renderGallery() {
  let filtered = allMemories;
  if (currentFilter === 'media') {
    filtered = allMemories.filter(m => m.mediaUrl);
  } else if (currentFilter !== 'all') {
    filtered = allMemories.filter(m => m.author === currentFilter);
  }

  if (filtered.length === 0) {
    gallery.innerHTML = `<p class="empty-state">Aucun souvenir pour le moment...<br>Le premier moment attend d'être partagé 💚💜</p>`;
    return;
  }

  gallery.innerHTML = filtered.map(m => {
    const authorClass = m.author === 'Robin' ? 'Robin' : m.author === 'Lady' ? 'Lady' : 'Nous';
    const authorLabel = m.author === 'Robin' ? 'Robin Serge 💚🇧🇪' :
                        m.author === 'Lady' ? 'Lady Marianne 💜🇫🇷' : 'Nous deux';

    return `
      <article class="memory-card author-${authorClass}">
        <div class="memory-header">
          <span class="memory-author ${authorClass}">${authorLabel}</span>
          <span class="memory-date">${m.date}</span>
        </div>
        ${renderTextWithYoutube(m.text)}
        ${renderMedia(m.mediaUrl, m.mediaType)}
      </article>
    `;
  }).join('');
}

function renderChapitres() {
  if (allChapitres.length === 0) {
    chapitres.innerHTML = `<p class="empty-state">Notre histoire commence ici...<br>Écrivez le premier chapitre 💚💜</p>`;
    return;
  }

  chapitres.innerHTML = allChapitres.map((c, i) => {
    const authorLabel = c.author === 'Robin' ? 'Robin Serge 💚🇧🇪' :
                        c.author === 'Lady' ? 'Lady Marianne 💜🇫🇷' : 'Nous deux';
    return `
      <article class="chapitre-card">
        <h3>Chapitre ${i + 1} — ${escapeHtml(c.titre)}</h3>
        <div class="chapitre-meta">${authorLabel} · ${c.date}</div>
        ${renderTextWithYoutube(c.text)}
        ${renderMedia(c.mediaUrl, c.mediaType)}
      </article>
    `;
  }).join('');
}

// ---- FILTRES ----
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderGallery();
  });
});

// ---- HÉRITAGE ----
function prepareHeritage() {
  const preview = document.getElementById('heritage-preview');
  let html = '<h2 style="text-align:center;margin-bottom:1.5rem;">Cadeau de la Vie — Archive</h2>';
  html += '<p style="text-align:center;font-style:italic;margin-bottom:2rem;">Black Robin (Serge) & Lady Marianne — Une rencontre incroyable</p>';

  if (allChapitres.length) {
    html += '<h3>📖 Notre Histoire</h3>';
    allChapitres.forEach((c, i) => {
      html += `<div class="item"><strong>Chapitre ${i + 1} — ${escapeHtml(c.titre)}</strong><br>
        <em>${c.author} · ${c.date}</em><br>
        ${escapeHtml(c.text || '')}
      </div>`;
    });
  }

  if (allMemories.length) {
    html += '<h3>✨ Moments</h3>';
    allMemories.forEach(m => {
      html += `<div class="item"><em>${m.author} · ${m.date}</em><br>
        ${escapeHtml(m.text || '')}
      </div>`;
    });
  }

  if (!allChapitres.length && !allMemories.length) {
    html += '<p class="empty-state">Rien à archiver pour le moment.</p>';
  }

  preview.innerHTML = html;
}

document.getElementById('btn-print').addEventListener('click', () => {
  prepareHeritage();
  window.print();
});

document.getElementById('btn-export-text').addEventListener('click', () => {
  let text = 'CADEAU DE LA VIE\nBlack Robin (Serge) & Lady Marianne\nUne rencontre incroyable\n\n';
  text += '='.repeat(40) + '\nNOTRE HISTOIRE\n' + '='.repeat(40) + '\n\n';
  allChapitres.forEach((c, i) => {
    text += `Chapitre ${i + 1} — ${c.titre}\n${c.author} · ${c.date}\n${c.text || ''}\n\n`;
  });
  text += '='.repeat(40) + '\nMOMENTS\n' + '='.repeat(40) + '\n\n';
  allMemories.forEach(m => {
    text += `${m.author} · ${m.date}\n${m.text || ''}\n\n`;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Cadeau-de-la-Vie_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
});

// ---- INIT ----
buildBanner();
if (sessionStorage.getItem('cadeau_auth') === 'true') {
  checkBirthdaySurprise();
  loadMemories();
  loadChapitres();
}
