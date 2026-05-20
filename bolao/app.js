// ── BOLÃO COPA 2026 ──
import { firebaseConfig, ADMIN_UID } from './firebase-config.js';
import { JOGOS_GRUPOS, GRUPOS, BANDEIRAS, PONTUACAO, CUSTO_PALPITE, DISTRIBUICAO_PREMIO, CHAVEAMENTO_R32 } from './data.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, setDoc, getDoc, getDocs, collection,
  onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── INIT FIREBASE ──
const fbApp   = initializeApp(firebaseConfig);
const auth    = getAuth(fbApp);
const db      = getFirestore(fbApp);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: undefined }); // permite qualquer conta Google

// ── ESTADO GLOBAL ──
let currentUser  = null;
let isAdmin      = false;
let currentPage  = 'palpites';
let currentFase  = 'grupos';
let currentRankFase = 'geral';
let configSite   = { pixKey: '', pixNome: '', pixCidade: '' };
let jogosKnockout = {}; // jogos do mata-mata criados pelo admin
let resultados   = {}; // { jogoId: { gols1: N, gols2: N } }
let palpitesUsuario = {}; // { jogoId: { gols1: N, gols2: N, pago: bool } }
let todosUsuarios = []; // cache do ranking
let unsubListeners = [];

// ── UTILS ──
function fmt(v) { return v != null ? String(v) : ''; }
function fmtBRL(v) { return 'R$ ' + Number(v).toFixed(2).replace('.', ','); }
function fmtData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function jogoAberto(jogo) {
  const limite = new Date(jogo.data).getTime() - 60 * 60 * 1000; // 1h antes
  return Date.now() < limite;
}
function jogoEncerrado(jogo) {
  return !jogoAberto(jogo);
}
function temResultado(jogoId) {
  return resultados[jogoId] != null;
}
function flag(time) { return BANDEIRAS[time] || '🏳️'; }

// ── TOAST ──
let toastTimer;
function showToast(msg, dur = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), dur);
}

// ── AUTH ──
document.getElementById('btnLogin').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error(e);
    showToast('Erro ao fazer login. Tente novamente.');
  }
});

async function logout() {
  unsubListeners.forEach(u => u());
  unsubListeners = [];
  await signOut(auth);
}

onAuthStateChanged(auth, async (user) => {
  document.getElementById('splash').style.opacity = '0';
  setTimeout(() => document.getElementById('splash').style.display = 'none', 400);

  if (user) {
    currentUser = user;
    isAdmin = user.uid === ADMIN_UID;
    await initApp(user);
  } else {
    currentUser = null;
    isAdmin = false;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
  }
});

async function initApp(user) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // UI do usuário
  document.getElementById('userName').textContent = user.displayName?.split(' ')[0] || 'Usuário';
  if (user.photoURL) {
    const av = document.getElementById('userAvatar');
    av.src = user.photoURL;
    av.style.display = 'block';
  }
  document.getElementById('sidebarName').textContent = user.displayName || 'Usuário';
  document.getElementById('sidebarEmail').textContent = user.email || '';
  if (user.photoURL) {
    document.getElementById('sidebarAvatar').src = user.photoURL;
  }

  // Mostra botão admin se for admin
  if (isAdmin) {
    document.querySelectorAll('.admin-item').forEach(el => el.classList.remove('hidden'));
  }

  // Garante que o usuário existe no Firestore
  await ensureUserDoc(user);

  // Carrega config do site
  await loadConfig();

  // Loga o UID no console para configuração inicial do admin
  console.log('=== SEU UID ===', user.uid, '=== copie este valor ===');

  // Se ainda não tem admin configurado, mostra o UID na tela
  if (ADMIN_UID === 'SEU_UID_AQUI') {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:60px;left:0;right:0;background:#f59e0b;color:#000;padding:12px 16px;z-index:9999;font-size:13px;font-weight:700;text-align:center;word-break:break-all;';
    banner.innerHTML = '⚙️ SEU UID (copie e envie para o desenvolvedor): <span style="background:#fff;padding:2px 8px;border-radius:4px;margin-left:6px;user-select:all">' + user.uid + '</span>';
    document.body.appendChild(banner);
  }

  // Listeners em tempo real
  subscribeResultados();
  subscribePalpitesUsuario();
  subscribeKnockout();

  navTo('palpites');
}

async function ensureUserDoc(user) {
  const ref = doc(db, 'usuarios', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      nome: user.displayName || '',
      email: user.email || '',
      foto: user.photoURL || '',
      criadoEm: serverTimestamp(),
    }, { merge: true });
  } else {
    // Atualiza foto/nome se mudou
    await setDoc(ref, {
      nome: user.displayName || '',
      foto: user.photoURL || '',
    }, { merge: true });
  }
}

async function loadConfig() {
  const snap = await getDoc(doc(db, 'config', 'site'));
  if (snap.exists()) configSite = snap.data();
}

// ── LISTENERS TEMPO REAL ──
function subscribeResultados() {
  const unsub = onSnapshot(collection(db, 'resultados'), snap => {
    resultados = {};
    snap.forEach(d => { resultados[d.id] = d.data(); });
    if (currentPage === 'palpites') renderPalpites();
    if (currentPage === 'ranking') renderRanking();
    if (currentPage === 'premios') renderPremios();
    if (currentPage === 'meus-palpites') renderMeusPalpites();
    if (currentPage === 'chaveamento') renderChaveamento();
  }, err => {
    console.warn('Firestore resultados:', err.code);
  });
  unsubListeners.push(unsub);
}

function subscribePalpitesUsuario() {
  if (!currentUser) return;
  const unsub = onSnapshot(
    collection(db, 'palpites', currentUser.uid, 'jogos'),
    snap => {
      palpitesUsuario = {};
      snap.forEach(d => { palpitesUsuario[d.id] = d.data(); });
      atualizarCustoBanner();
      if (currentPage === 'palpites') renderPalpites();
      if (currentPage === 'meus-palpites') renderMeusPalpites();
    },
    err => { console.warn('Firestore palpites:', err.code); }
  );
  unsubListeners.push(unsub);
}

function subscribeKnockout() {
  const unsub = onSnapshot(collection(db, 'jogos_knockout'), snap => {
    jogosKnockout = {};
    snap.forEach(d => { jogosKnockout[d.id] = d.data(); });
    if (currentPage === 'palpites') renderPalpites();
    if (currentPage === 'chaveamento') renderChaveamento();
  }, err => {
    console.warn('Firestore knockout:', err.code);
  });
  unsubListeners.push(unsub);
}

// ── NAVEGAÇÃO ──
function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('menuOverlay').classList.toggle('hidden');
}
window.toggleMenu = toggleMenu;

function navTo(page) {
  currentPage = page;
  // Fecha menu
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menuOverlay').classList.add('hidden');
  // Atualiza menu ativo
  document.querySelectorAll('.menu-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // Mostra página
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  // Renderiza
  switch (page) {
    case 'palpites':      renderPalpites(); break;
    case 'ranking':       renderRanking(); break;
    case 'chaveamento':   renderChaveamento(); break;
    case 'premios':       renderPremios(); break;
    case 'meus-palpites': renderMeusPalpites(); break;
    case 'admin':         renderAdmin(); break;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.navTo = navTo;

function setFase(fase) {
  currentFase = fase;
  document.querySelectorAll('.fase-tab[data-fase]').forEach(el => {
    el.classList.toggle('active', el.dataset.fase === fase);
  });
  // Mostra/esconde abas de grupo
  const grupoWrap = document.getElementById('grupoTabsWrap');
  if (grupoWrap) grupoWrap.style.display = fase === 'grupos' ? '' : 'none';
  renderPalpites();
}
window.setFase = setFase;

function setRankFase(fase) {
  currentRankFase = fase;
  document.querySelectorAll('.rank-filter-btn[data-rank]').forEach(el => {
    el.classList.toggle('active', el.dataset.rank === fase);
  });
  renderRanking();
}
window.setRankFase = setRankFase;

// ── RENDER PALPITES ──
let currentGrupoTab = 'A';

function renderGrupoTabs() {
  const el = document.getElementById('grupoTabs');
  if (!el) return;
  const grupos = Object.keys(GRUPOS);
  el.innerHTML = grupos.map(g => {
    const times = GRUPOS[g].times;
    const flags = times.slice(0, 4).map(t => flag(t)).join('');
    // Conta palpites pagos neste grupo
    const temPal = JOGOS_GRUPOS.filter(j => j.grupo === g)
      .some(j => palpitesUsuario[j.id]?.pago);
    return `
      <button class="grupo-tab ${g === currentGrupoTab ? 'active' : ''} ${temPal ? 'tem-palpite' : ''}"
        onclick="setGrupoTab('${g}')">
        <span class="gt-letra">Grupo ${g}</span>
        <span class="gt-flags">${flags}</span>
      </button>`;
  }).join('');
}

function setGrupoTab(g) {
  currentGrupoTab = g;
  renderGrupoTabs();
  renderPalpites();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.setGrupoTab = setGrupoTab;

function renderPalpites() {
  const container = document.getElementById('jogosContainer');
  if (!container) return;

  const grupoWrap = document.getElementById('grupoTabsWrap');

  if (currentFase === 'grupos') {
    if (grupoWrap) grupoWrap.style.display = '';
    renderGrupoTabs();
    // Mostra só os jogos do grupo selecionado
    const jogos = JOGOS_GRUPOS.filter(j => j.grupo === currentGrupoTab);
    const times = GRUPOS[currentGrupoTab].times;
    container.innerHTML = `
      <div class="grupo-times-header">
        <div class="grupo-times-lista">
          ${times.map(t => `<span class="grupo-time-chip">${flag(t)} ${t}</span>`).join('')}
        </div>
      </div>
      ${jogos.map(j => renderJogoCard(j)).join('')}`;
  } else {
    if (grupoWrap) grupoWrap.style.display = 'none';
    const jogos = Object.values(jogosKnockout).filter(j => j.fase === currentFase);
    if (jogos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⏳</div>
          <div class="empty-state-titulo">Jogos ainda não disponíveis</div>
          <div class="empty-state-desc">Os jogos desta fase serão liberados após o encerramento da fase anterior.</div>
        </div>`;
      return;
    }
    container.innerHTML = jogos.map(j => renderJogoCard(j)).join('');
  }

  // Listeners nos inputs
  container.querySelectorAll('.palpite-input').forEach(input => {
    input.addEventListener('change', onPalpiteChange);
    input.addEventListener('input', onPalpiteInput);
  });
}

function renderJogoCard(jogo) {
  const aberto = jogoAberto(jogo);
  const res = resultados[jogo.id];
  const pal = palpitesUsuario[jogo.id];
  const pago = pal?.pago === true;
  const fase = jogo.fase || 'grupos';
  const custo = CUSTO_PALPITE[fase] || CUSTO_PALPITE.grupos;

  const statusTxt = res ? 'Encerrado' : aberto ? 'Aberto' : 'Fechado';
  const statusCls = res ? 'encerrado' : aberto ? 'aberto' : 'encerrado';

  let palpiteArea = '';
  if (res) {
    // Jogo com resultado — mostra resultado e pontuação
    const pts = calcularPontos(jogo, pal, res);
    const acertou = pts > 0;
    palpiteArea = `
      <div class="palpite-area">
        <div class="resultado-oficial">
          <span>${flag(jogo.time1)}</span>
          <span class="placar">${res.gols1} × ${res.gols2}</span>
          <span>${flag(jogo.time2)}</span>
        </div>
        ${pal ? `
          <div class="palpite-pontos ${acertou ? 'pontos-acertou' : 'pontos-errou'}">
            ${acertou ? '✅' : '❌'} Seu palpite: ${pal.gols1} × ${pal.gols2}
            ${pago ? ` — <strong>${pts} pts</strong>` : ' (não pago)'}
          </div>` : '<div class="palpite-label">Você não palpitou neste jogo</div>'}
      </div>`;
  } else if (!aberto) {
    // Fechado sem resultado
    palpiteArea = `
      <div class="palpite-area">
        <div class="palpite-label">⏰ Palpites encerrados</div>
        ${pal ? `<div class="palpite-salvo">✅ Seu palpite: ${pal.gols1} × ${pal.gols2} ${pago ? '(pago)' : '(aguardando pagamento)'}</div>` : ''}
      </div>`;
  } else {
    // Aberto para palpite
    const v1 = pal?.gols1 ?? '';
    const v2 = pal?.gols2 ?? '';
    // Pago = input liberado para edição (só muda o placar, não cobra de novo)
    // Não pago = input liberado normalmente
    palpiteArea = `
      <div class="palpite-area">
        ${pago
          ? `<div class="palpite-label pago-label">✅ Jogo pago — edite o placar à vontade até 1h antes</div>`
          : `<div class="palpite-label">Seu palpite <span class="palpite-custo-inline">${fmtBRL(custo)}</span></div>`
        }
        <div class="palpite-grid">
          <input class="palpite-input ${pago ? 'pago' : ''}" type="number" min="0" max="20" placeholder="0"
            value="${v1}" data-jogo="${jogo.id}" data-campo="gols1">
          <div class="palpite-x">×</div>
          <input class="palpite-input ${pago ? 'pago' : ''}" type="number" min="0" max="20" placeholder="0"
            value="${v2}" data-jogo="${jogo.id}" data-campo="gols2">
        </div>
        ${!pago && pal
          ? `<div class="palpite-salvo">💾 Salvo — confirme o pagamento</div>`
          : ''
        }
      </div>`;
  }

  const cardCls = [
    'jogo-card',
    pal ? 'palpitado' : '',
    res ? 'com-resultado' : '',
    !aberto && !res ? 'encerrado' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${cardCls}" id="jogo-${jogo.id}">
      <div class="jogo-meta">
        <div class="jogo-meta-left">
          <span class="jogo-fase-badge">${faseLbl(fase)} ${jogo.grupo ? '· Grupo ' + jogo.grupo : ''}</span>
          <span>${fmtData(jogo.data)}</span>
          <span>📍 ${jogo.local || ''}</span>
        </div>
        <span class="jogo-status ${statusCls}">${statusTxt}</span>
      </div>
      <div class="jogo-times">
        <div class="jogo-time">
          <div class="time-bandeira">${flag(jogo.time1)}</div>
          <div class="time-nome">${jogo.time1}</div>
        </div>
        <div class="jogo-vs">VS</div>
        <div class="jogo-time time-direita">
          <div class="time-bandeira">${flag(jogo.time2)}</div>
          <div class="time-nome">${jogo.time2}</div>
        </div>
      </div>
      ${palpiteArea}
    </div>`;
}

function faseLbl(fase) {
  const map = { grupos: 'Grupos', oitavas: 'Oitavas', quartas: 'Quartas', semi: 'Semi', final: 'Final' };
  return map[fase] || fase;
}

// ── PALPITE INPUT HANDLERS ──
function onPalpiteInput(e) {
  // Limita a 2 dígitos
  if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2);
  if (parseInt(e.target.value) < 0) e.target.value = '0';
}

async function onPalpiteChange(e) {
  const jogoId = e.target.dataset.jogo;
  const card   = e.target.closest('.jogo-card');
  const inputs = card.querySelectorAll('.palpite-input');
  const v1 = inputs[0].value.trim();
  const v2 = inputs[1].value.trim();

  // Se qualquer campo estiver vazio, remove o palpite (não cobra)
  if (v1 === '' || v2 === '') {
    await removerPalpite(jogoId);
    atualizarCustoBanner();
    return;
  }

  const g1 = parseInt(v1);
  const g2 = parseInt(v2);
  if (isNaN(g1) || isNaN(g2) || g1 < 0 || g2 < 0) return;

  await salvarPalpite(jogoId, g1, g2);
  atualizarCustoBanner();
}

async function removerPalpite(jogoId) {
  if (!currentUser) return;
  const pal = palpitesUsuario[jogoId];
  // Pago = não remove, só edita. Apagar o campo de um palpite pago restaura o valor salvo.
  if (pal?.pago) {
    // Restaura os valores salvos nos inputs
    const card = document.getElementById('jogo-' + jogoId);
    if (card) {
      const inputs = card.querySelectorAll('.palpite-input');
      if (inputs[0]) inputs[0].value = pal.gols1 ?? '';
      if (inputs[1]) inputs[1].value = pal.gols2 ?? '';
    }
    showToast('⚠️ Palpite pago — não pode ser removido, só editado');
    return;
  }
  try {
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    await firestoreModule.deleteDoc(doc(db, 'palpites', currentUser.uid, 'jogos', jogoId));
  } catch (e) {
    console.warn('removerPalpite:', e);
  }
}

async function salvarPalpite(jogoId, gols1, gols2) {
  if (!currentUser) return;
  const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === jogoId);
  if (!jogo || !jogoAberto(jogo)) return;
  const fase = jogo.fase || 'grupos';
  const ref = doc(db, 'palpites', currentUser.uid, 'jogos', jogoId);

  // Se já está pago, só atualiza o placar — não muda o status de pago
  const pal = palpitesUsuario[jogoId];
  if (pal?.pago) {
    await setDoc(ref, { gols1, gols2, atualizadoEm: serverTimestamp() }, { merge: true });
    showToast('✏️ Palpite atualizado!');
  } else {
    await setDoc(ref, {
      jogoId, gols1, gols2, fase,
      pago: false,
      uid: currentUser.uid,
      atualizadoEm: serverTimestamp(),
    }, { merge: true });
  }
}

// ── CUSTO BANNER ──
function atualizarCustoBanner() {
  // Só conta palpites NÃO pagos, com ambos os campos preenchidos, em jogo ainda aberto
  const naoPageos = Object.entries(palpitesUsuario).filter(([id, p]) => {
    if (p.pago) return false; // já pago = não cobra de novo
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    return jogo && jogoAberto(jogo) && p.gols1 != null && p.gols2 != null;
  });
  const total = naoPageos.reduce((acc, [id]) => {
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    return acc + (CUSTO_PALPITE[jogo?.fase || 'grupos'] || 0);
  }, 0);

  document.getElementById('qtdPalpites').textContent = naoPageos.length;
  document.getElementById('custoTotal').textContent = fmtBRL(total);
  const btn = document.getElementById('btnPagar');
  btn.disabled = naoPageos.length === 0;
}

// ── CHECKOUT / PIX ──
function abrirCheckout() {
  const naoPageos = Object.entries(palpitesUsuario).filter(([id, p]) => {
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    return jogo && jogoAberto(jogo) && !p.pago && p.gols1 != null && p.gols2 != null;
  });
  if (naoPageos.length === 0) return;

  const total = naoPageos.reduce((acc, [id, p]) => {
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    const fase = jogo?.fase || 'grupos';
    return acc + (CUSTO_PALPITE[fase] || 0);
  }, 0);

  const itens = naoPageos.map(([id, p]) => {
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    const fase = jogo?.fase || 'grupos';
    const custo = CUSTO_PALPITE[fase] || 0;
    return `
      <div class="checkout-jogo-item">
        <span class="checkout-jogo-nome">${flag(jogo.time1)} ${jogo.time1} × ${jogo.time2} ${flag(jogo.time2)}</span>
        <span class="checkout-jogo-palpite">${p.gols1}×${p.gols2}</span>
        <span class="checkout-jogo-custo">${fmtBRL(custo)}</span>
      </div>`;
  }).join('');

  const pixKey = configSite.pixKey || '(chave Pix não configurada)';
  const pixNome = configSite.pixNome || 'Administrador';
  const pixCidade = configSite.pixCidade || '';

  // Gera QR Code via API pública
  const pixPayload = gerarPixPayload(pixKey, pixNome, pixCidade, total);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`;

  document.getElementById('checkoutContent').innerHTML = `
    <div class="modal-body">
      <div class="checkout-resumo">
        <div style="font-size:13px;font-weight:700;color:var(--texto3);margin-bottom:8px;">RESUMO DOS PALPITES</div>
        ${itens}
        <div class="checkout-total">
          <span>Total a pagar</span>
          <span class="checkout-total-val">${fmtBRL(total)}</span>
        </div>
      </div>
      <div class="pix-section">
        <div class="pix-titulo">💚 Pague via Pix</div>
        <div class="pix-qr-wrap">
          <img class="pix-qr-img" src="${qrUrl}" alt="QR Code Pix" onerror="this.style.display='none'">
          <div class="pix-chave-wrap">
            <span class="pix-chave-val">${pixKey}</span>
            <button class="btn-copiar" onclick="copiarPix('${pixKey}')">Copiar</button>
          </div>
          <div class="pix-instrucao">
            Valor: <strong>${fmtBRL(total)}</strong> para <strong>${pixNome}</strong><br>
            Após o pagamento, clique em "Já paguei" abaixo.<br>
            O administrador confirmará seu pagamento.
          </div>
        </div>
        <button class="btn-confirmar-pix" onclick="confirmarPagamento(${JSON.stringify(naoPageos.map(([id]) => id))}, ${total})">
          ✅ Já paguei — Confirmar palpites
        </button>
        <div class="aguardando-badge" id="aguardandoBadge" style="display:none">
          ⏳ Aguardando confirmação do administrador
        </div>
      </div>
    </div>`;

  document.getElementById('modalCheckout').classList.remove('hidden');
}
window.abrirCheckout = abrirCheckout;

function fecharCheckout() {
  document.getElementById('modalCheckout').classList.add('hidden');
}
window.fecharCheckout = fecharCheckout;

function copiarPix(chave) {
  navigator.clipboard.writeText(chave).then(() => showToast('Chave Pix copiada!'));
}
window.copiarPix = copiarPix;

async function confirmarPagamento(jogoIds, total) {
  if (!currentUser) return;
  // Cria registro de pagamento pendente
  const pedidoId = `${currentUser.uid}_${Date.now()}`;
  await setDoc(doc(db, 'pagamentos', pedidoId), {
    uid: currentUser.uid,
    nome: currentUser.displayName || '',
    email: currentUser.email || '',
    foto: currentUser.photoURL || '',
    jogoIds,
    total,
    status: 'pendente',
    criadoEm: serverTimestamp(),
  });

  document.getElementById('aguardandoBadge').style.display = 'flex';
  document.querySelector('.btn-confirmar-pix').disabled = true;
  showToast('Pedido enviado! Aguarde a confirmação do admin.', 4000);
}
window.confirmarPagamento = confirmarPagamento;

// Gera payload Pix simplificado (EMV)
function gerarPixPayload(chave, nome, cidade, valor) {
  function tlv(id, val) {
    const len = String(val.length).padStart(2, '0');
    return id + len + val;
  }
  const merchantAccountInfo = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave);
  const valorStr = valor.toFixed(2);
  let payload =
    tlv('00', '01') +
    tlv('26', merchantAccountInfo) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', valorStr) +
    tlv('58', 'BR') +
    tlv('59', nome.substring(0, 25)) +
    tlv('60', (cidade || 'SAO PAULO').substring(0, 15)) +
    tlv('62', tlv('05', '***'));
  // CRC16
  payload += '6304';
  const crc = crc16(payload);
  return payload + crc;
}

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return ((crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'));
}

// ── PONTUAÇÃO ──
function calcularPontos(jogo, palpite, resultado) {
  if (!palpite || !resultado || palpite.pago !== true) return 0;
  const fase = jogo.fase || 'grupos';
  const pts = PONTUACAO[fase] || PONTUACAO.grupos;
  const g1r = resultado.gols1, g2r = resultado.gols2;
  const g1p = palpite.gols1,   g2p = palpite.gols2;

  if (fase === 'grupos') {
    // Acertou placar exato
    if (g1p === g1r && g2p === g2r) return pts.acertou_placar;
    // Acertou empate
    if (g1r === g2r && g1p === g2p) return pts.acertou_empate;
    // Acertou vencedor
    const vencedorR = g1r > g2r ? 1 : g1r < g2r ? 2 : 0;
    const vencedorP = g1p > g2p ? 1 : g1p < g2p ? 2 : 0;
    if (vencedorR !== 0 && vencedorR === vencedorP) return pts.acertou_vencedor;
    return pts.errou;
  } else {
    // Mata-mata: não há empate
    if (g1p === g1r && g2p === g2r) return pts.acertou_placar;
    const vencedorR = g1r > g2r ? 1 : 2;
    const vencedorP = g1p > g2p ? 1 : 2;
    if (vencedorR === vencedorP) return pts.acertou_vencedor;
    return 0;
  }
}

async function calcularPontosUsuario(uid, fase) {
  // Busca todos os palpites do usuário
  const snap = await getDocs(collection(db, 'palpites', uid, 'jogos'));
  let total = 0;
  snap.forEach(d => {
    const p = d.data();
    if (fase && fase !== 'geral' && p.fase !== fase) return;
    const res = resultados[p.jogoId];
    if (!res) return;
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === p.jogoId);
    if (!jogo) return;
    total += calcularPontos(jogo, p, res);
  });
  return total;
}

// ── RANKING ──
async function renderRanking() {
  const container = document.getElementById('rankingContainer');
  const statsEl   = document.getElementById('rankingStats');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Calculando ranking...</div>';

  // Busca todos os usuários
  const usersSnap = await getDocs(collection(db, 'usuarios'));
  const users = [];
  usersSnap.forEach(d => users.push(d.data()));

  // Calcula pontos de cada um
  const ranking = await Promise.all(users.map(async u => {
    const pts = await calcularPontosUsuario(u.uid, currentRankFase === 'geral' ? null : currentRankFase);
    // Conta palpites pagos
    const palSnap = await getDocs(collection(db, 'palpites', u.uid, 'jogos'));
    let palpitesPagos = 0, totalGasto = 0;
    palSnap.forEach(d => {
      const p = d.data();
      if (p.pago) {
        palpitesPagos++;
        const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === p.jogoId);
        totalGasto += CUSTO_PALPITE[jogo?.fase || 'grupos'] || 0;
      }
    });
    return { ...u, pts, palpitesPagos, totalGasto };
  }));

  ranking.sort((a, b) => b.pts - a.pts);
  todosUsuarios = ranking;

  // Stats
  const totalParticipantes = ranking.filter(u => u.palpitesPagos > 0).length;
  const totalBalde = ranking.reduce((a, u) => a + u.totalGasto, 0);
  statsEl.innerHTML = `
    <div class="rank-stat-card"><div class="rank-stat-val">${totalParticipantes}</div><div class="rank-stat-lbl">Participantes</div></div>
    <div class="rank-stat-card"><div class="rank-stat-val">${fmtBRL(totalBalde)}</div><div class="rank-stat-lbl">Balde total</div></div>
    <div class="rank-stat-card"><div class="rank-stat-val">${ranking[0]?.pts || 0}</div><div class="rank-stat-lbl">Líder (pts)</div></div>
  `;

  if (ranking.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-titulo">Nenhum participante ainda</div></div>`;
    return;
  }

  container.innerHTML = `<div class="ranking-list">${ranking.map((u, i) => {
    const pos = i + 1;
    const posCls = pos === 1 ? 'pos-1' : pos === 2 ? 'pos-2' : pos === 3 ? 'pos-3' : 'pos-n';
    const posEmoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
    const euCls = u.uid === currentUser?.uid ? ' ranking-eu' : '';
    const avatar = u.foto
      ? `<img class="ranking-avatar" src="${u.foto}" alt="">`
      : `<div class="ranking-avatar-placeholder">👤</div>`;
    return `
      <div class="ranking-item${euCls}">
        <div class="ranking-pos ${posCls}">${posEmoji}</div>
        ${avatar}
        <div class="ranking-info">
          <div class="ranking-nome">${u.nome || 'Usuário'}${u.uid === currentUser?.uid ? ' (você)' : ''}</div>
          <div class="ranking-detalhe">${u.palpitesPagos} palpites · ${fmtBRL(u.totalGasto)} investidos</div>
        </div>
        <div class="ranking-pontos">
          <div class="ranking-pts-val">${u.pts}</div>
          <div class="ranking-pts-lbl">pontos</div>
        </div>
      </div>`;
  }).join('')}</div>`;
}

// ── PRÊMIOS ──
async function renderPremios() {
  const container = document.getElementById('premiosContainer');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Calculando prêmios...</div>';

  // Calcula balde total
  const usersSnap = await getDocs(collection(db, 'usuarios'));
  let totalBalde = 0;
  const usersData = [];
  for (const ud of usersSnap.docs) {
    const u = ud.data();
    const palSnap = await getDocs(collection(db, 'palpites', u.uid, 'jogos'));
    let gasto = 0;
    palSnap.forEach(d => {
      const p = d.data();
      if (p.pago) {
        const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === p.jogoId);
        gasto += CUSTO_PALPITE[jogo?.fase || 'grupos'] || 0;
      }
    });
    totalBalde += gasto;
    usersData.push({ ...u, gasto });
  }

  // Calcula líderes por fase
  async function liderFase(fase) {
    const pts = await Promise.all(usersData.map(async u => ({
      nome: u.nome,
      pts: await calcularPontosUsuario(u.uid, fase)
    })));
    pts.sort((a, b) => b.pts - a.pts);
    return pts[0]?.pts > 0 ? pts[0] : null;
  }

  const [lGeral, lGrupos, lOitavas, lQuartas, lSemi] = await Promise.all([
    liderFase(null), liderFase('grupos'), liderFase('oitavas'), liderFase('quartas'), liderFase('semi')
  ]);

  const premios = [
    { icon: '🏆', titulo: 'Campeão Geral', desc: 'Melhor pontuação total no final do torneio', pct: DISTRIBUICAO_PREMIO.campeao_geral, lider: lGeral },
    { icon: '⚽', titulo: 'Rei da Fase de Grupos', desc: 'Melhor pontuação apenas na fase de grupos', pct: DISTRIBUICAO_PREMIO.melhor_grupos, lider: lGrupos },
    { icon: '🎯', titulo: 'Rei das Oitavas', desc: 'Melhor pontuação apenas nas oitavas de final', pct: DISTRIBUICAO_PREMIO.melhor_oitavas, lider: lOitavas },
    { icon: '💎', titulo: 'Rei das Quartas', desc: 'Melhor pontuação apenas nas quartas de final', pct: DISTRIBUICAO_PREMIO.melhor_quartas, lider: lQuartas },
    { icon: '🌟', titulo: 'Rei da Semifinal', desc: 'Melhor pontuação apenas na semifinal', pct: DISTRIBUICAO_PREMIO.melhor_semi, lider: lSemi },
  ];

  const totalParticipantes = usersData.filter(u => u.gasto > 0).length;

  container.innerHTML = `
    <div class="premio-balde">
      <div class="premio-balde-titulo">💰 Balde Total</div>
      <div class="premio-balde-valor">${fmtBRL(totalBalde)}</div>
      <div class="premio-balde-sub">${totalParticipantes} participante${totalParticipantes !== 1 ? 's' : ''} · atualizado em tempo real</div>
    </div>
    <div class="premios-grid">
      ${premios.map(p => `
        <div class="premio-card">
          <div class="premio-icon">${p.icon}</div>
          <div class="premio-info">
            <div class="premio-titulo">${p.titulo}</div>
            <div class="premio-desc">${p.desc}</div>
            ${p.lider ? `<div class="premio-lider">🏅 Líder atual: ${p.lider.nome} (${p.lider.pts} pts)</div>` : '<div class="premio-lider">Sem dados ainda</div>'}
          </div>
          <div class="premio-valor">
            <div class="premio-pct">${Math.round(p.pct * 100)}%</div>
            <div class="premio-reais">${fmtBRL(totalBalde * p.pct)}</div>
          </div>
        </div>`).join('')}
    </div>
    <div class="premio-participantes">
      <div style="font-size:13px;color:var(--texto3);margin-bottom:4px;">Quanto mais palpites, maior o balde!</div>
      <strong>${totalParticipantes}</strong> participante${totalParticipantes !== 1 ? 's' : ''} · <strong>${fmtBRL(totalBalde)}</strong> no balde
    </div>`;
}

// ── CHAVEAMENTO ──
function renderChaveamento() {
  const container = document.getElementById('chaveamentoContainer');

  const fases = [
    { id: 'oitavas', label: '⚔️ Oitavas de Final (Round of 32)', jogos: CHAVEAMENTO_R32 },
    { id: 'quartas', label: '🏅 Quartas de Final', jogos: Object.values(jogosKnockout).filter(j => j.fase === 'quartas') },
    { id: 'semi',    label: '🌟 Semifinal', jogos: Object.values(jogosKnockout).filter(j => j.fase === 'semi') },
    { id: 'final',   label: '🏆 Final', jogos: Object.values(jogosKnockout).filter(j => j.fase === 'final') },
  ];

  container.innerHTML = fases.map(fase => `
    <div class="chaveamento-fase">
      <div class="chaveamento-fase-titulo">${fase.label}</div>
      ${fase.jogos.length === 0
        ? `<div class="empty-state" style="padding:20px"><div class="empty-state-desc">Aguardando resultados da fase anterior</div></div>`
        : fase.jogos.map((j, i) => {
            const res = resultados[j.id];
            const t1 = j.time1 || j.slot1;
            const t2 = j.time2 || j.slot2;
            const f1 = BANDEIRAS[t1] || '';
            const f2 = BANDEIRAS[t2] || '';
            return `
              <div class="chave-jogo">
                <div class="chave-num">${i + 1}</div>
                <div class="chave-times">
                  <div class="chave-time">${f1 ? f1 + ' ' : ''}<span class="${!BANDEIRAS[t1] ? 'chave-slot' : ''}">${t1}</span></div>
                  <div class="chave-vs">VS</div>
                  <div class="chave-time">${f2 ? f2 + ' ' : ''}<span class="${!BANDEIRAS[t2] ? 'chave-slot' : ''}">${t2}</span></div>
                </div>
                ${res ? `<div style="font-size:16px;font-weight:800;color:var(--verde)">${res.gols1}×${res.gols2}</div>` : ''}
                ${j.data ? `<div class="chave-data">${fmtData(j.data)}</div>` : ''}
              </div>`;
          }).join('')
      }
    </div>`).join('');
}

// ── MEUS PALPITES ──
async function renderMeusPalpites() {
  const container = document.getElementById('meusPalpitesContainer');
  if (!currentUser) return;

  const todos = Object.entries(palpitesUsuario);
  if (todos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-titulo">Nenhum palpite ainda</div>
        <div class="empty-state-desc">Vá para a aba Palpites e comece a apostar!</div>
      </div>`;
    return;
  }

  // Ordena por data do jogo
  const comJogo = todos.map(([id, p]) => {
    const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === id);
    return { id, p, jogo };
  }).filter(x => x.jogo).sort((a, b) => new Date(a.jogo.data) - new Date(b.jogo.data));

  let totalPago = 0, totalPontos = 0, acertos = 0;
  comJogo.forEach(({ id, p, jogo }) => {
    if (p.pago) {
      const fase = jogo.fase || 'grupos';
      totalPago += CUSTO_PALPITE[fase] || 0;
      const res = resultados[id];
      if (res) {
        const pts = calcularPontos(jogo, p, res);
        totalPontos += pts;
        if (pts > 0) acertos++;
      }
    }
  });

  container.innerHTML = `
    <div class="ranking-stats" style="margin-bottom:16px">
      <div class="rank-stat-card"><div class="rank-stat-val">${comJogo.length}</div><div class="rank-stat-lbl">Palpites</div></div>
      <div class="rank-stat-card"><div class="rank-stat-val">${fmtBRL(totalPago)}</div><div class="rank-stat-lbl">Investido</div></div>
      <div class="rank-stat-card"><div class="rank-stat-val">${totalPontos}</div><div class="rank-stat-lbl">Pontos</div></div>
    </div>
    <div class="meus-palpites-lista">
      ${comJogo.map(({ id, p, jogo }) => {
        const res = resultados[id];
        const pts = res && p.pago ? calcularPontos(jogo, p, res) : null;
        const statusCls = p.pago ? 'pago' : 'pendente';
        const statusLbl = p.pago ? 'Pago' : 'Aguardando pagamento';
        const statusBadgeCls = p.pago ? 'status-pago' : 'status-pendente';
        return `
          <div class="meu-palpite-card ${statusCls}">
            <div class="meu-palpite-header">
              <div class="meu-palpite-jogo">${flag(jogo.time1)} ${jogo.time1} × ${jogo.time2} ${flag(jogo.time2)}</div>
              <span class="meu-palpite-status ${statusBadgeCls}">${statusLbl}</span>
            </div>
            <div class="meu-palpite-detalhe">
              Palpite: <strong>${p.gols1} × ${p.gols2}</strong> · ${fmtData(jogo.data)} · ${faseLbl(jogo.fase || 'grupos')}
              ${res ? ` · Resultado: <strong>${res.gols1}×${res.gols2}</strong>` : ''}
            </div>
            ${pts !== null ? `<div class="meu-palpite-pontos ${pts > 0 ? 'pontos-acertou' : 'pontos-errou'}">${pts > 0 ? '✅ +' + pts + ' pontos' : '❌ 0 pontos'}</div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

// ── ADMIN ──
async function renderAdmin() {
  if (!isAdmin) {
    document.getElementById('adminContainer').innerHTML = `
      <div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-titulo">Acesso restrito</div></div>`;
    return;
  }
  const container = document.getElementById('adminContainer');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando...</div>';

  // Busca dados
  const [usersSnap, pagSnap] = await Promise.all([
    getDocs(collection(db, 'usuarios')),
    getDocs(collection(db, 'pagamentos')),
  ]);

  const users = [];
  usersSnap.forEach(d => users.push(d.data()));

  const pagamentos = [];
  pagSnap.forEach(d => pagamentos.push({ id: d.id, ...d.data() }));
  const pendentes = pagamentos.filter(p => p.status === 'pendente');

  let totalBalde = 0;
  const usersComStats = await Promise.all(users.map(async u => {
    const palSnap = await getDocs(collection(db, 'palpites', u.uid, 'jogos'));
    let palpitesPagos = 0, gasto = 0;
    palSnap.forEach(d => {
      const p = d.data();
      if (p.pago) {
        palpitesPagos++;
        const jogo = [...JOGOS_GRUPOS, ...Object.values(jogosKnockout)].find(j => j.id === p.jogoId);
        gasto += CUSTO_PALPITE[jogo?.fase || 'grupos'] || 0;
      }
    });
    totalBalde += gasto;
    return { ...u, palpitesPagos, gasto };
  }));

  container.innerHTML = `
    <!-- Stats -->
    <div class="admin-stats-grid">
      <div class="admin-stat"><div class="admin-stat-val">${users.length}</div><div class="admin-stat-lbl">Usuários</div></div>
      <div class="admin-stat"><div class="admin-stat-val">${fmtBRL(totalBalde)}</div><div class="admin-stat-lbl">Balde total</div></div>
      <div class="admin-stat"><div class="admin-stat-val">${pendentes.length}</div><div class="admin-stat-lbl">Pagamentos pendentes</div></div>
      <div class="admin-stat"><div class="admin-stat-val">${Object.keys(resultados).length}</div><div class="admin-stat-lbl">Resultados inseridos</div></div>
    </div>

    <!-- Config Pix -->
    <div class="admin-section">
      <div class="admin-section-titulo">💳 Configuração Pix</div>
      <div class="admin-card">
        <div class="pix-config">
          <input class="pix-input" id="pixKeyInput" type="text" placeholder="Chave Pix (CPF, email, telefone ou aleatória)" value="${configSite.pixKey || ''}">
          <input class="pix-input" id="pixNomeInput" type="text" placeholder="Nome do recebedor (ex: João Silva)" value="${configSite.pixNome || ''}">
          <input class="pix-input" id="pixCidadeInput" type="text" placeholder="Cidade (ex: SAO PAULO)" value="${configSite.pixCidade || ''}">
          <button class="btn-salvar-pix" onclick="salvarConfigPix()">💾 Salvar configuração Pix</button>
        </div>
      </div>
    </div>

    <!-- Pagamentos pendentes -->
    ${pendentes.length > 0 ? `
    <div class="admin-section">
      <div class="admin-section-titulo">⏳ Pagamentos Pendentes (${pendentes.length})</div>
      <div class="admin-card">
        ${pendentes.map(p => `
          <div class="admin-jogo-row">
            <div class="admin-jogo-info">
              <div class="admin-jogo-nome">${p.nome || p.email}</div>
              <div class="admin-jogo-meta">${p.jogoIds?.length || 0} palpites · ${fmtBRL(p.total || 0)}</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn-inserir" onclick="aprovarPagamento('${p.id}', ${JSON.stringify(p.jogoIds)}, '${p.uid}')">✅ Aprovar</button>
              <button class="btn-inserir" style="background:var(--vermelho)" onclick="rejeitarPagamento('${p.id}')">❌ Rejeitar</button>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- Inserir resultados -->
    <div class="admin-section">
      <div class="admin-section-titulo">⚽ Inserir Resultados — Fase de Grupos</div>
      ${Object.entries(
        JOGOS_GRUPOS.reduce((acc, j) => {
          if (!acc[j.grupo]) acc[j.grupo] = [];
          acc[j.grupo].push(j);
          return acc;
        }, {})
      ).map(([grupo, jogos]) => `
        <div class="admin-card" style="margin-bottom:10px">
          <div style="font-weight:700;color:var(--verde);margin-bottom:10px">Grupo ${grupo}</div>
          ${jogos.map(j => {
            const res = resultados[j.id];
            return `
              <div class="admin-jogo-row">
                <div class="admin-jogo-info">
                  <div class="admin-jogo-nome">${flag(j.time1)} ${j.time1} × ${j.time2} ${flag(j.time2)}</div>
                  <div class="admin-jogo-meta">${fmtData(j.data)}</div>
                </div>
                ${res
                  ? `<div class="admin-jogo-resultado">${res.gols1}×${res.gols2}</div>`
                  : ''
                }
                <button class="btn-inserir ${res ? 'editando' : ''}" onclick="abrirModalResultado('${j.id}', '${j.time1}', '${j.time2}')">
                  ${res ? '✏️ Editar' : '+ Resultado'}
                </button>
              </div>`;
          }).join('')}
        </div>`).join('')}
    </div>

    <!-- Usuários -->
    <div class="admin-section">
      <div class="admin-section-titulo">👥 Participantes</div>
      <div class="admin-card">
        ${usersComStats.sort((a, b) => b.gasto - a.gasto).map(u => `
          <div class="admin-user-row">
            ${u.foto ? `<img class="admin-user-avatar" src="${u.foto}" alt="">` : '<div style="width:32px;height:32px;border-radius:50%;background:var(--verde-light);display:flex;align-items:center;justify-content:center">👤</div>'}
            <div class="admin-user-info">
              <div class="admin-user-nome">${u.nome || 'Usuário'}</div>
              <div class="admin-user-email">${u.email || ''}</div>
            </div>
            <div class="admin-user-stats">
              <strong>${fmtBRL(u.gasto)}</strong>
              ${u.palpitesPagos} palpites pagos
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── ADMIN: APROVAR/REJEITAR PAGAMENTO ──
async function aprovarPagamento(pedidoId, jogoIds, uid) {
  if (!confirm(`Aprovar pagamento? Isso liberará ${jogoIds.length} palpite(s).`)) return;
  // Marca todos os palpites como pagos
  await Promise.all(jogoIds.map(jogoId =>
    setDoc(doc(db, 'palpites', uid, 'jogos', jogoId), { pago: true }, { merge: true })
  ));
  // Atualiza status do pedido
  await updateDoc(doc(db, 'pagamentos', pedidoId), { status: 'aprovado' });
  showToast('✅ Pagamento aprovado!');
  renderAdmin();
}
window.aprovarPagamento = aprovarPagamento;

async function rejeitarPagamento(pedidoId) {
  if (!confirm('Rejeitar este pagamento?')) return;
  await updateDoc(doc(db, 'pagamentos', pedidoId), { status: 'rejeitado' });
  showToast('❌ Pagamento rejeitado.');
  renderAdmin();
}
window.rejeitarPagamento = rejeitarPagamento;

// ── ADMIN: CONFIG PIX ──
async function salvarConfigPix() {
  const key    = document.getElementById('pixKeyInput').value.trim();
  const nome   = document.getElementById('pixNomeInput').value.trim();
  const cidade = document.getElementById('pixCidadeInput').value.trim();
  if (!key) { showToast('Informe a chave Pix'); return; }
  configSite = { pixKey: key, pixNome: nome, pixCidade: cidade };
  await setDoc(doc(db, 'config', 'site'), configSite, { merge: true });
  showToast('✅ Configuração Pix salva!');
}
window.salvarConfigPix = salvarConfigPix;

// ── ADMIN: MODAL RESULTADO ──
function abrirModalResultado(jogoId, time1, time2) {
  const res = resultados[jogoId];
  document.getElementById('resultadoContent').innerHTML = `
    <div class="modal-body">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:18px;font-weight:700">${flag(time1)} ${time1} × ${time2} ${flag(time2)}</div>
      </div>
      <div class="palpite-grid" style="margin-bottom:16px">
        <input class="palpite-input" type="number" min="0" max="20" id="resGols1" placeholder="0" value="${res?.gols1 ?? ''}">
        <div class="palpite-x">×</div>
        <input class="palpite-input" type="number" min="0" max="20" id="resGols2" placeholder="0" value="${res?.gols2 ?? ''}">
      </div>
      <button class="btn-confirmar-pix" onclick="salvarResultado('${jogoId}')">💾 Salvar Resultado</button>
    </div>`;
  document.getElementById('modalResultado').classList.remove('hidden');
}
window.abrirModalResultado = abrirModalResultado;

function fecharModalResultado() {
  document.getElementById('modalResultado').classList.add('hidden');
}
window.fecharModalResultado = fecharModalResultado;

async function salvarResultado(jogoId) {
  const g1 = parseInt(document.getElementById('resGols1').value);
  const g2 = parseInt(document.getElementById('resGols2').value);
  if (isNaN(g1) || isNaN(g2)) { showToast('Informe o placar completo'); return; }
  await setDoc(doc(db, 'resultados', jogoId), {
    jogoId, gols1: g1, gols2: g2,
    atualizadoEm: serverTimestamp(),
  });
  fecharModalResultado();
  showToast('✅ Resultado salvo!');
}
window.salvarResultado = salvarResultado;

// ── INIT ──
window.logout = logout;
