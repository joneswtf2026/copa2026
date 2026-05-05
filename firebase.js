// ── FIREBASE SYNC (opcional) ──
// Para remover: apague este arquivo e remova o <script> do firebase.js no index.html
// O app continua funcionando só com localStorage

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBL1pwX4uwRUpScGPmgT_JaFsZmgeNvz9Q",
  authDomain: "copa2026-ca9d0.firebaseapp.com",
  projectId: "copa2026-ca9d0",
  storageBucket: "copa2026-ca9d0.firebasestorage.app",
  messagingSenderId: "568769612647",
  appId: "1:568769612647:web:f2d2464009979064fb3dc2"
};

const fbApp  = initializeApp(firebaseConfig);
const auth   = getAuth(fbApp);
const db     = getFirestore(fbApp);
const provider = new GoogleAuthProvider();

let currentUser = null;
let unsubscribeSnapshot = null;
let syncEnabled = false;

// ── LOGIN / LOGOUT ──
async function fbLogin() {
  try {
    await signInWithPopup(auth, provider);
  } catch(e) {
    console.error('Login error', e);
    showToast('Erro ao fazer login');
  }
}

async function fbLogout() {
  if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
  await signOut(auth);
  currentUser = null;
  syncEnabled = false;
  updateAuthUI(null);
  showToast('Desconectado');
}

// ── SALVA NO FIRESTORE ──
async function fbSave(ownedData, repeatsData) {
  if (!currentUser || !syncEnabled) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'album', 'data'), {
      owned:   JSON.stringify(ownedData),
      repeats: JSON.stringify(repeatsData),
      updatedAt: new Date().toISOString()
    });
  } catch(e) {
    console.error('Save error', e);
  }
}

// ── CARREGA DO FIRESTORE ──
async function fbLoad() {
  if (!currentUser) return null;
  try {
    const snap = await getDoc(doc(db, 'users', currentUser.uid, 'album', 'data'));
    if (snap.exists()) {
      const data = snap.data();
      return {
        owned:   JSON.parse(data.owned   || '{}'),
        repeats: JSON.parse(data.repeats || '{}')
      };
    }
  } catch(e) {
    console.error('Load error', e);
  }
  return null;
}

// ── ESCUTA MUDANÇAS EM TEMPO REAL ──
function fbSubscribe() {
  if (!currentUser) return;
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  unsubscribeSnapshot = onSnapshot(
    doc(db, 'users', currentUser.uid, 'album', 'data'),
    (snap) => {
      if (!snap.exists() || !syncEnabled) return;
      // só aplica se veio de outro dispositivo
      const data = snap.data();
      const remoteOwned   = JSON.parse(data.owned   || '{}');
      const remoteRepeats = JSON.parse(data.repeats || '{}');
      const localStr  = JSON.stringify(owned);
      const remoteStr = JSON.stringify(remoteOwned);
      if (localStr !== remoteStr) {
        owned   = remoteOwned;
        repeats = remoteRepeats;
        localStorage.setItem('copa2026',     JSON.stringify(owned));
        localStorage.setItem('copa2026_rep', JSON.stringify(repeats));
        renderTabs();
        renderContent();
        updateStats();
        showToast('☁️ Álbum sincronizado!');
      }
    },
    (err) => console.error('Snapshot error', err)
  );
}

// ── UI DO AUTH ──
function updateAuthUI(user) {
  const btn = document.getElementById('fbAuthBtn');
  const info = document.getElementById('fbUserInfo');
  if (!btn) return;
  if (user) {
    btn.textContent = 'Sair';
    btn.onclick = fbLogout;
    if (info) info.textContent = user.displayName || user.email;
  } else {
    btn.textContent = '☁️ Sincronizar';
    btn.onclick = fbLogin;
    if (info) info.textContent = '';
  }
}

// ── OBSERVER DE AUTH ──
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  updateAuthUI(user);
  if (user) {
    showToast('☁️ Conectado como ' + (user.displayName || user.email));
    // carrega dados da nuvem e mescla com local
    const remote = await fbLoad();
    if (remote) {
      const localCount  = Object.values(owned).filter(Boolean).length;
      const remoteCount = Object.values(remote.owned).filter(Boolean).length;
      // usa o que tiver mais dados
      if (remoteCount >= localCount) {
        owned   = remote.owned;
        repeats = remote.repeats;
        localStorage.setItem('copa2026',     JSON.stringify(owned));
        localStorage.setItem('copa2026_rep', JSON.stringify(repeats));
        renderTabs();
        renderContent();
        updateStats();
      } else {
        // local tem mais dados — sobe para a nuvem
        await fbSave(owned, repeats);
      }
    } else {
      // primeira vez — sobe dados locais
      await fbSave(owned, repeats);
    }
    syncEnabled = true;
    fbSubscribe();
  }
});

// ── HOOK NO SAVE DO APP ──
// Sobrescreve a função save() para também salvar no Firebase
const _originalSave = window._fbOriginalSave || null;
window.fbSaveHook = function(ownedData, repeatsData) {
  fbSave(ownedData, repeatsData);
};

console.log('Firebase sync module loaded');
