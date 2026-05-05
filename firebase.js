// ── FIREBASE SYNC (opcional) ──
// Para remover: apague este arquivo e remova o <script type="module"> do index.html

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBL1pwX4uwRUpScGPmgT_JaFsZmgeNvz9Q",
  authDomain: "copa2026-ca9d0.firebaseapp.com",
  projectId: "copa2026-ca9d0",
  storageBucket: "copa2026-ca9d0.firebasestorage.app",
  messagingSenderId: "568769612647",
  appId: "1:568769612647:web:f2d2464009979064fb3dc2"
};

const fbApp    = initializeApp(firebaseConfig);
const auth     = getAuth(fbApp);
const db       = getFirestore(fbApp);
const provider = new GoogleAuthProvider();

let currentUser      = null;
let unsubSnapshot    = null;
let syncEnabled      = false;

// ── LOGIN / LOGOUT ──
window.fbLogin = async function() {
  try {
    await signInWithPopup(auth, provider);
  } catch(e) {
    console.error('Login error', e);
    showToast('Erro ao fazer login');
  }
};

window.fbLogout = async function() {
  if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
  await signOut(auth);
  currentUser = null;
  syncEnabled = false;
  updateAuthUI(null);
  showToast('Desconectado');
};

// ── FIRESTORE ──
async function fbSave(ownedData, repeatsData) {
  if (!currentUser || !syncEnabled) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'album', 'data'), {
      owned:     JSON.stringify(ownedData),
      repeats:   JSON.stringify(repeatsData),
      updatedAt: new Date().toISOString()
    });
  } catch(e) { console.error('fbSave error', e); }
}

async function fbLoad() {
  if (!currentUser) return null;
  try {
    const snap = await getDoc(doc(db, 'users', currentUser.uid, 'album', 'data'));
    if (snap.exists()) {
      const d = snap.data();
      return { owned: JSON.parse(d.owned||'{}'), repeats: JSON.parse(d.repeats||'{}') };
    }
  } catch(e) { console.error('fbLoad error', e); }
  return null;
}

function fbSubscribe() {
  if (!currentUser) return;
  if (unsubSnapshot) unsubSnapshot();
  unsubSnapshot = onSnapshot(
    doc(db, 'users', currentUser.uid, 'album', 'data'),
    (snap) => {
      if (!snap.exists() || !syncEnabled) return;
      const d = snap.data();
      const remoteOwned   = JSON.parse(d.owned  ||'{}');
      const remoteRepeats = JSON.parse(d.repeats||'{}');
      if (JSON.stringify(owned) !== JSON.stringify(remoteOwned)) {
        owned   = remoteOwned;
        repeats = remoteRepeats;
        localStorage.setItem('copa2026',     JSON.stringify(owned));
        localStorage.setItem('copa2026_rep', JSON.stringify(repeats));
        renderTabs(); renderContent(); updateStats();
        showToast('☁️ Sincronizado!');
      }
    },
    (err) => console.error('Snapshot error', err)
  );
}

// ── UI ──
function updateAuthUI(user) {
  const btn  = document.getElementById('fbAuthBtn');
  const info = document.getElementById('fbUserInfo');
  const bar  = document.getElementById('firebaseBar');
  if (!btn) return;
  if (user) {
    btn.textContent  = 'Sair';
    btn.onclick      = window.fbLogout;
    if (info) info.textContent = user.displayName || user.email;
    if (bar)  bar.classList.add('logged');
  } else {
    btn.textContent  = '☁️ Sincronizar';
    btn.onclick      = window.fbLogin;
    if (info) info.textContent = '';
    if (bar)  bar.classList.remove('logged');
  }
}

// ── AUTH STATE ──
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  updateAuthUI(user);
  if (user) {
    const remote = await fbLoad();
    if (remote) {
      const localCount  = Object.values(owned).filter(Boolean).length;
      const remoteCount = Object.values(remote.owned).filter(Boolean).length;
      if (remoteCount >= localCount) {
        owned = remote.owned; repeats = remote.repeats;
        localStorage.setItem('copa2026',     JSON.stringify(owned));
        localStorage.setItem('copa2026_rep', JSON.stringify(repeats));
        renderTabs(); renderContent(); updateStats();
        showToast('☁️ Álbum carregado da nuvem!');
      } else {
        await fbSave(owned, repeats);
        showToast('☁️ Álbum enviado para a nuvem!');
      }
    } else {
      await fbSave(owned, repeats);
      showToast('☁️ Conectado! Álbum salvo na nuvem.');
    }
    syncEnabled = true;
    fbSubscribe();
  }
});

// ── HOOK NO SAVE ──
window.fbSaveHook = function(o, r) { fbSave(o, r); };

console.log('Firebase sync module loaded ✓');
