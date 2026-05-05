const GROUPS = [
  {id:"A",teams:[["México","MEX",20,"🇲🇽"],["África do Sul","RSA",20,"🇿🇦"],["Coréia do Sul","KOR",20,"🇰🇷"],["Rep. Tcheca","CZE",20,"🇨🇿"]]},
  {id:"B",teams:[["Canadá","CAN",20,"🇨🇦"],["Bósnia","BIH",20,"🇧🇦"],["Catar","QAT",20,"🇶🇦"],["Suíça","SUI",20,"🇨🇭"]]},
  {id:"C",teams:[["Brasil","BRA",20,"🇧🇷"],["Marrocos","MAR",20,"🇲🇦"],["Haiti","HAI",20,"🇭🇹"],["Escócia","SCO",20,"🏴󠁧󠁢󠁳󠁣󠁴󠁿"]]},
  {id:"D",teams:[["Estados Unidos","USA",20,"🇺🇸"],["Paraguai","PAR",20,"🇵🇾"],["Austrália","AUS",20,"🇦🇺"],["Turquia","TUR",20,"🇹🇷"]]},
  {id:"E",teams:[["Alemanha","GER",20,"🇩🇪"],["Curaçao","CUW",20,"🇨🇼"],["Costa do Marfim","CIV",20,"🇨🇮"],["Equador","ECU",20,"🇪🇨"]]},
  {id:"F",teams:[["Holanda","NED",20,"🇳🇱"],["Japão","JPN",20,"🇯🇵"],["Suécia","SWE",20,"🇸🇪"],["Tunísia","TUN",20,"🇹🇳"]]},
  {id:"G",teams:[["Bélgica","BEL",20,"🇧🇪"],["Egito","EGY",20,"🇪🇬"],["Irã","IRN",20,"🇮🇷"],["Nova Zelândia","NZL",20,"🇳🇿"]]},
  {id:"H",teams:[["Espanha","ESP",20,"🇪🇸"],["Cabo Verde","CPV",20,"🇨🇻"],["Arábia Saudita","KSA",20,"🇸🇦"],["Uruguai","URU",20,"🇺🇾"]]},
  {id:"I",teams:[["França","FRA",20,"🇫🇷"],["Senegal","SEN",20,"🇸🇳"],["Iraque","IRQ",20,"🇮🇶"],["Noruega","NOR",20,"🇳🇴"]]},
  {id:"J",teams:[["Argentina","ARG",20,"🇦🇷"],["Argélia","ALG",20,"🇩🇿"],["Áustria","AUT",20,"🇦🇹"],["Jordânia","JOR",20,"🇯🇴"]]},
  {id:"K",teams:[["Portugal","POR",20,"🇵🇹"],["Congo","COD",20,"🇨🇩"],["Uzbequistão","UZB",20,"🇺🇿"],["Colômbia","COL",20,"🇨🇴"]]},
  {id:"L",teams:[["Inglaterra","ENG",20,"🏴󠁧󠁢󠁥󠁮󠁧󠁿"],["Croácia","CRO",20,"🇭🇷"],["Gana","GHA",20,"🇬🇭"],["Panamá","PAN",20,"🇵🇦"]]},
];
// FWC: o que cada figurinha representa
const FWC_LABELS = {
  1:'🏆',2:'🌍',3:'⭐',4:'🎭',5:'⚽',6:'🦁',
  7:'🎯',8:'📅',9:'🥇',10:'🥈',11:'🥉',
  12:'🌟',13:'🎪',14:'🎨',15:'📸',16:'🏟️',
  17:'🎶',18:'🌎',19:'🔥'
};
const SPECIALS = [
  {id:"FWC",label:"FIFA World Cup History",nums:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]},
  {id:"CC", label:"Coca-Cola",             nums:[1,2,3,4,5,6,7,8,9,10,11,12,13,14]},
];

const TOTAL_STICKERS = GROUPS.reduce((a,g)=>a+g.teams.reduce((b,t)=>b+t[2],0),0)
  + SPECIALS.reduce((a,s)=>a+s.nums.length,0);

let owned = {}, repeats = {}, currentTab = 'A', currentFilter = 'all', saveTimer = null;

// ── STORAGE ──
function load() {
  try { owned   = JSON.parse(localStorage.getItem('copa2026')     || '{}'); } catch(e){owned={};}
  try { repeats = JSON.parse(localStorage.getItem('copa2026_rep') || '{}'); } catch(e){repeats={};}
}

function save() {
  // salva imediatamente E agenda outro save
  localStorage.setItem('copa2026',     JSON.stringify(owned));
  localStorage.setItem('copa2026_rep', JSON.stringify(repeats));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem('copa2026',     JSON.stringify(owned));
    localStorage.setItem('copa2026_rep', JSON.stringify(repeats));
    // sincroniza com Firebase se disponível
    if (window.fbSaveHook) window.fbSaveHook(owned, repeats);
  }, 600);
}

// ── STATS ──
function countOwned() { return Object.values(owned).filter(Boolean).length; }

function updateStats() {
  const have = countOwned(), miss = TOTAL_STICKERS - have, pct = Math.round(have/TOTAL_STICKERS*100);
  document.getElementById('sHave').textContent = have;
  document.getElementById('sMiss').textContent = miss;
  document.getElementById('sPct').textContent  = pct+'%';
  document.getElementById('pbar').style.width  = pct+'%';
  document.getElementById('ppct').textContent  = pct+'%';
  checkMilestone(pct);
}

// ── KEYS ──
function key(g,code,n)  { return g+'__'+code+'__'+n; }
function spKey(id,n)    { return 'SP__'+id+'__'+n; }

// ── HAPTIC ──
function vibrate() { if (navigator.vibrate) navigator.vibrate(30); }

// ── TOGGLE — toque simples incrementa, segurar 700ms limpa ──
let pressTimer = null;
let didLongPress = false;
let touchStartX = 0;
let touchStartY = 0;

function handlePress(k, el, isSp) {
  // registra posição inicial do toque
  const touch = event.touches && event.touches[0];
  touchStartX = touch ? touch.clientX : 0;
  touchStartY = touch ? touch.clientY : 0;

  didLongPress = false;
  pressTimer = setTimeout(() => {
    didLongPress = true;
    pressTimer = null;
    owned[k] = false;
    repeats[k] = 0;
    el.classList.remove('have');
    updateRepeatBadge(el, k);
    updateStats(); save(); vibrate();
    if (!isSp) { const p=k.split('__'); updateTeamCount(p[0],p[1]); updateTabBadge(p[0]); }
    setTimeout(()=>{ applyFilter(el); updateCardVisibility(el.closest('.group-card')); }, 300);
    showToast('Figurinha removida');
  }, 700);
}

function handleRelease(k, el, isSp) {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  if (didLongPress) { didLongPress = false; return; }

  // verifica se foi scroll (dedo se moveu mais de 10px)
  const touch = event.changedTouches && event.changedTouches[0];
  if (touch) {
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);
    if (dx > 10 || dy > 10) return; // foi scroll, ignora
  }

  // toque intencional: incrementa
  if (!owned[k]) {
    owned[k] = true;
    repeats[k] = 1;
  } else {
    repeats[k] = (repeats[k] || 1) + 1;
  }
  el.classList.add('have');
  updateRepeatBadge(el, k);
  updateStats(); save(); vibrate();
  if (!isSp) {
    const p=k.split('__');
    updateTeamCount(p[0],p[1]);
    checkTeamComplete(p[0],p[1]);
  }
  setTimeout(()=>{ applyFilter(el); updateCardVisibility(el.closest('.group-card')); }, 300);
  if (repeats[k] > 1) showToast('x'+repeats[k]+' repetidas');
}

function cancelPress() {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  didLongPress = false;
}

function toggle(k, el)   { /* handled by press/release */ }
function toggleSp(k, el) { /* handled by press/release */ }

function updateRepeatBadge(el, k) {
  let badge = el.querySelector('.repeat-badge');
  const r = repeats[k] || 0;
  if (owned[k] && r > 1) {
    if (!badge) { badge = document.createElement('span'); badge.className='repeat-badge'; el.appendChild(badge); }
    badge.textContent = 'x'+r;
  } else if (badge) badge.remove();
}

// ── FILTER ──
function applyFilter(el) {
  if (currentFilter === 'all') { el.classList.remove('hidden-filter'); return; }
  const k = el.dataset.k;
  const have = !!owned[k], rep = (repeats[k]||0) > 1;
  if      (currentFilter==='missing') el.classList.toggle('hidden-filter',  have);
  else if (currentFilter==='have')    el.classList.toggle('hidden-filter', !have);
  else if (currentFilter==='repeat')  el.classList.toggle('hidden-filter', !rep);
  el.querySelectorAll('.repeat-badge,.fwc-icon,.fwc-num').forEach(c=>c.style.display='');
  // atualiza visibilidade do card pai
  updateCardVisibility(el.closest('.group-card'));
}

function updateCardVisibility(card) {
  if (!card) return;
  const all = card.querySelectorAll('.stk');
  const visible = Array.from(all).filter(s=>!s.classList.contains('hidden-filter'));
  card.style.display = visible.length === 0 ? 'none' : '';
  const hdr = card.querySelector('.group-hdr');
  if (currentFilter !== 'all' && visible.length > 0) {
    card.style.outline = '2.5px solid var(--green-400)';
    card.style.outlineOffset = '0px';
    if (hdr && !hdr.style.background.includes('gradient')) {
      hdr.dataset.origBg = hdr.dataset.origBg || hdr.style.background || '';
      hdr.style.background = 'linear-gradient(90deg, #065f46, #047857)';
    }
  } else {
    card.style.outline = '';
    if (hdr && hdr.dataset.origBg !== undefined) {
      hdr.style.background = hdr.dataset.origBg;
      delete hdr.dataset.origBg;
    }
  }
}

function setFilter(f) {
  currentFilter = f;
  ['fAll','fMissing','fHave','fRepeat'].forEach(id=>document.getElementById(id).classList.remove('active'));
  const map = {all:'fAll',missing:'fMissing',have:'fHave',repeat:'fRepeat'};
  document.getElementById(map[f]).classList.add('active');
  document.querySelectorAll('.stk').forEach(el=>applyFilter(el));
  document.querySelectorAll('.group-card').forEach(card=>updateCardVisibility(card));
  // esconde tabs de grupos sem resultado quando filtrado
  updateTabsVisibility();
}

function updateTabsVisibility() {
  if (currentFilter === 'all') {
    document.querySelectorAll('.tab').forEach(t=>t.style.display='');
    return;
  }
  GROUPS.forEach(g=>{
    let hasResult = false;
    g.teams.forEach(tm=>{
      for(let i=1;i<=tm[2];i++){
        const k=key(g.id,tm[1],i);
        const have=!!owned[k], rep=(repeats[k]||0)>1;
        if(currentFilter==='missing' && !have){ hasResult=true; break; }
        if(currentFilter==='have'    &&  have){ hasResult=true; break; }
        if(currentFilter==='repeat'  &&  rep) { hasResult=true; break; }
      }
      if(hasResult) return;
    });
    const tab=document.getElementById('tab_'+g.id);
    if(tab) tab.style.display = hasResult ? '' : 'none';
  });
  // especiais
  ['FWC','CC'].forEach(id=>{
    const sp=SPECIALS.find(s=>s.id===id);
    let hasResult=false;
    sp.nums.forEach(n=>{
      const k=spKey(id,n);
      const have=!!owned[k], rep=(repeats[k]||0)>1;
      if(currentFilter==='missing' && !have) hasResult=true;
      if(currentFilter==='have'    &&  have) hasResult=true;
      if(currentFilter==='repeat'  &&  rep)  hasResult=true;
    });
    const tab=document.getElementById('tab_'+id);
    if(tab) tab.style.display = hasResult ? '' : 'none';
  });
}

// ── TEAM COUNT & COMPLETE ──
function updateTeamCount(gid, code) {
  const el = document.getElementById('tc_'+gid+'_'+code);
  if (!el) return;
  const g = GROUPS.find(x=>x.id===gid), tm = g && g.teams.find(t=>t[1]===code);
  if (!tm) return;
  let c=0; for(let i=1;i<=tm[2];i++) if(owned[key(gid,code,i)]) c++;
  el.textContent = c+'/'+tm[2];
}

function checkTeamComplete(gid, code) {
  const g = GROUPS.find(x=>x.id===gid), tm = g && g.teams.find(t=>t[1]===code);
  if (!tm) return;
  let c=0; for(let i=1;i<=tm[2];i++) if(owned[key(gid,code,i)]) c++;
  if (c === tm[2]) {
    const card = document.getElementById('card_'+gid+'_'+code);
    if (card) { card.classList.add('complete','just-completed'); setTimeout(()=>card.classList.remove('just-completed'),600); }
    launchConfetti();
    showToast('🎉 '+tm[0]+' completa!');
  }
  updateTabBadge(gid);
}

function updateTabBadge(gid) {
  const g = GROUPS.find(x=>x.id===gid); if (!g) return;
  let tot=0, hv=0;
  g.teams.forEach(tm=>{ for(let i=1;i<=tm[2];i++){tot++;if(owned[key(gid,tm[1],i)])hv++;} });
  const tab = document.getElementById('tab_'+gid); if (!tab) return;
  tab.innerHTML = 'Grupo '+gid+'<span class="tab-pct">'+Math.round(hv/tot*100)+'%</span>';
  tab.classList.toggle('done', hv===tot);
}

// ── GROUP STATS MODAL ──
function showGroupStats(gid) {
  const g = GROUPS.find(x=>x.id===gid); if(!g) return;
  let total=0, have=0;
  g.teams.forEach(tm=>{for(let i=1;i<=tm[2];i++){total++;if(owned[key(gid,tm[1],i)])have++;}});
  const pct=Math.round(have/total*100);

  const rows = g.teams.map(tm=>{
    const [name,code,count,flag]=tm;
    let hv=0; for(let i=1;i<=count;i++) if(owned[key(gid,code,i)]) hv++;
    const tp=Math.round(hv/count*100);
    const done=hv===count;
    return '<div class="modal-stat-row'+(done?' modal-complete':'')+'">'+
      '<div class="modal-team">'+(flag?'<span>'+flag+'</span>':'')+name+'</div>'+
      '<div style="display:flex;align-items:center;gap:6px">'+
        '<div class="modal-mini-bar"><div class="modal-mini-fill" style="width:'+tp+'%"></div></div>'+
        '<span class="modal-pct">'+hv+'/'+count+(done?' ✅':'')+'</span>'+
      '</div>'+
    '</div>';
  }).join('');

  const overlay = document.createElement('div');
  overlay.className='modal-overlay';
  overlay.innerHTML='<div class="modal">'+
    '<div class="modal-title">'+
      'Grupo '+gid+' — '+pct+'% completo'+
      '<button class="modal-close" onclick="closeModal(this)">✕</button>'+
    '</div>'+
    rows+
  '</div>';
  overlay.addEventListener('click', e=>{ if(e.target===overlay) closeModal(overlay); });
  document.body.appendChild(overlay);
}

function closeModal(el) {
  const overlay = el.closest ? el.closest('.modal-overlay') : el;
  overlay.classList.add('hide');
  setTimeout(()=>overlay.remove(), 200);
}

// ── MILESTONE ANIMATION ──
let lastMilestonePct = 0;
function checkMilestone(pct) {
  const milestones = [25,50,75,100];
  for(const m of milestones){
    if(pct>=m && lastMilestonePct<m){
      lastMilestonePct=m;
      showMilestone(m);
      break;
    }
  }
}

function showMilestone(pct) {
  const msgs = {
    25:  {emoji:'🌟', text:'25% completo!',  sub:'Bom começo!'},
    50:  {emoji:'🔥', text:'Metade do álbum!', sub:'Você está no meio do caminho!'},
    75:  {emoji:'💪', text:'75% completo!',  sub:'Quase lá!'},
    100: {emoji:'🏆', text:'Álbum completo!', sub:'Parabéns, colecionador!'},
  };
  const m = msgs[pct];
  launchConfetti();
  const el = document.createElement('div');
  el.className='milestone-toast';
  el.innerHTML='<div class="milestone-inner">'+m.emoji+' '+m.text+'<small>'+m.sub+'</small></div>';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 2800);
}
function launchConfetti() {
  const colors=['#f59e0b','#34d399','#064e3b','#fff','#dc2626','#3b82f6'];
  for(let i=0;i<28;i++){
    const el=document.createElement('div'); el.className='confetti-piece';
    el.style.cssText='left:'+Math.random()*100+'vw;top:20%;background:'+colors[Math.floor(Math.random()*colors.length)]+';animation-delay:'+Math.random()*.4+'s;animation-duration:'+(1+Math.random()*.6)+'s;transform:rotate('+Math.random()*360+'deg)';
    document.body.appendChild(el); setTimeout(()=>el.remove(),2000);
  }
}

// ── MARK ALL ──
function markAll(gid, code, btn) {
  const g = GROUPS.find(x=>x.id===gid), tm = g.teams.find(t=>t[1]===code);
  let allHave = true;
  for(let i=1;i<=tm[2];i++) if(!owned[key(gid,code,i)]){allHave=false;break;}
  for(let i=1;i<=tm[2];i++){
    const k=key(gid,code,i); owned[k]=!allHave;
    const el=document.querySelector('[data-k="'+k+'"]');
    if(el){el.classList.toggle('have',!allHave);applyFilter(el);}
  }
  updateTeamCount(gid,code); updateStats(); save(); vibrate();
  btn.classList.toggle('all-done',!allHave);
  btn.textContent = !allHave?'✓ Todas marcadas':'Marcar todas';
  if(!allHave){launchConfetti();showToast('🎉 '+tm[0]+' completa!');updateTabBadge(gid);}
}

// ── TABS ──
function isDoneTab(t) {
  if(t==='FWC'||t==='CC'){const sp=SPECIALS.find(s=>s.id===t);return sp.nums.every(n=>owned[spKey(t,n)]);}
  const g=GROUPS.find(x=>x.id===t);
  return g.teams.every(tm=>{for(let i=1;i<=tm[2];i++)if(!owned[key(t,tm[1],i)])return false;return true;});
}

function renderTabs() {
  const list = GROUPS.map(g=>g.id).concat(['FWC','CC']);
  document.getElementById('tabs').innerHTML = list.map(t=>{
    const label = t==='FWC'?'História':t==='CC'?'Coca-Cola':'Grupo '+t;
    let pct='';
    if(t!=='FWC'&&t!=='CC'){
      const g=GROUPS.find(x=>x.id===t); let tot=0,hv=0;
      g.teams.forEach(tm=>{for(let i=1;i<=tm[2];i++){tot++;if(owned[key(t,tm[1],i)])hv++;}});
      pct='<span class="tab-pct">'+Math.round(hv/tot*100)+'%</span>';
    }
    const done=isDoneTab(t);
    return '<div class="tab'+(t===currentTab?' active':'')+(done?' done':'')+'" id="tab_'+t+'" onclick="switchTab(\''+t+'\')">'+label+pct+'</div>';
  }).join('');
}

function switchTab(t) {
  currentTab=t; renderTabs(); renderContent(); window.scrollTo({top:0,behavior:'smooth'});
}

// ── RENDER ──
function renderContent() {
  const el=document.getElementById('content');
  document.getElementById('searchResults').style.display='none';
  el.style.display='block';
  if(currentTab==='FWC'||currentTab==='CC'){renderSpecial(el,currentTab);return;}
  const g=GROUPS.find(x=>x.id===currentTab); if(!g) return;
  el.innerHTML=g.teams.map(tm=>renderTeam(g,tm)).join('');
  document.querySelectorAll('.stk').forEach(el=>applyFilter(el));
}

function renderTeam(g, tm) {
  const [name,code,count,flag]=tm; let have=0;
  for(let i=1;i<=count;i++) if(owned[key(g.id,code,i)]) have++;
  const allDone=have===count;
  const stickers=Array.from({length:count},(_,i)=>{
    const n=i+1,k=key(g.id,code,n),h=owned[k]?' have':'';
    const r=(repeats[k]||0)>1?'<span class="repeat-badge">x'+repeats[k]+'</span>':'';
    let extraClass='', label=String(n);
    if(n===1) { extraClass=' stk-shield'; }
    else if(n===13) { extraClass=' stk-team'; }
    return '<div class="stk'+extraClass+h+'" data-k="'+k+'" ontouchstart="event.preventDefault();handlePress(\''+k+'\',this,false)" ontouchend="event.preventDefault();handleRelease(\''+k+'\',this,false)" ontouchcancel="cancelPress()" title="'+code+' '+n+(n===1?' - Escudo':n===13?' - Foto seleção':'')+'">'+label+r+'</div>';
  }).join('');
  return '<div class="group-card'+(allDone?' complete':'')+'" id="card_'+g.id+'_'+code+'">'+
    '<div class="group-hdr">'+
      '<div class="group-hdr-left">'+
        '<div class="group-badge" onclick="showGroupStats(\''+g.id+'\')">'+g.id+'</div>'+
        '<div><div class="group-name">'+(flag?flag+' ':'')+name+'</div><div class="group-prog" id="tc_'+g.id+'_'+code+'">'+have+'/'+count+'</div></div>'+
      '</div>'+
      '<div style="background:rgba(255,255,255,.15);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#fff">'+code+'</div>'+
    '</div>'+
    '<div class="team-row">'+
      '<div class="team-hdr"><div></div><div class="team-right">'+
        '<button class="mark-all-btn'+(allDone?' all-done':'')+'" onclick="markAll(\''+g.id+'\',\''+code+'\',this)">'+(allDone?'✓ Todas marcadas':'Marcar todas')+'</button>'+
      '</div></div>'+
      '<div class="stickers">'+stickers+'</div>'+
    '</div>'+
  '</div>';
}

function renderSpecial(el, id) {
  const sp=SPECIALS.find(s=>s.id===id),isCC=id==='CC';
  const have=sp.nums.filter(n=>owned[spKey(id,n)]).length;
  const stickers=sp.nums.map(n=>{
    const k=spKey(id,n),h=owned[k]?' have':'',lbl=isCC?'CC'+n:'FWC'+n;
    const icon=(!isCC && FWC_LABELS[n])?FWC_LABELS[n]:'';
    const inner=lbl;
    const r=(repeats[k]||0)>1?'<span class="repeat-badge">x'+repeats[k]+'</span>':'';
    return '<div class="stk special'+h+'" data-k="'+k+'" ontouchstart="event.preventDefault();handlePress(\''+k+'\',this,true)" ontouchend="event.preventDefault();handleRelease(\''+k+'\',this,true)" ontouchcancel="cancelPress()" title="'+lbl+'">'+inner+r+'</div>';
  }).join('');
  const color=isCC?'#b91c1c':'#1e40af';
  el.innerHTML='<div class="group-card'+(have===sp.nums.length?' complete':'')+'">'+
    '<div class="group-hdr" style="background:'+color+'">'+
      '<div class="group-hdr-left">'+
        '<div class="group-badge">'+(isCC?'🥤':'🏆')+'</div>'+
        '<div><div class="group-name">'+sp.label+'</div><div class="group-prog">'+have+'/'+sp.nums.length+' figurinhas</div></div>'+
      '</div>'+
    '</div>'+
    '<div class="team-row"><div class="stickers">'+stickers+'</div></div>'+
  '</div>';
  document.querySelectorAll('.stk').forEach(el=>applyFilter(el));
}

// ── SEARCH ──
function toggleSearch() {
  const wrap=document.getElementById('searchWrap');
  wrap.classList.toggle('visible');
  if(wrap.classList.contains('visible')){document.getElementById('searchInput').focus();}
  else{document.getElementById('searchInput').value='';onSearch('');}
  adjustBodyPadding();
}

function onSearch(q) {
  q=q.trim().toLowerCase();
  const content=document.getElementById('content'),results=document.getElementById('searchResults');
  if(!q){results.style.display='none';content.style.display='block';renderContent();return;}
  content.style.display='none'; results.style.display='block';
  const codeMatch=q.match(/^([a-z]+)(\d+)$/);
  let html='';
  let firstGroupId=null;

  GROUPS.forEach(g=>{
    g.teams.forEach(tm=>{
      const [name,code,count]=tm;
      const nameMatch=name.toLowerCase().includes(q)||code.toLowerCase().includes(q);
      let numsToShow=[];
      if(codeMatch){const cq=codeMatch[1].toUpperCase(),nq=parseInt(codeMatch[2]);if(code===cq&&nq>=1&&nq<=count)numsToShow=[nq];}
      if(nameMatch) numsToShow=Array.from({length:count},(_,i)=>i+1);
      if(!numsToShow.length) return;
      if(!firstGroupId) firstGroupId=g.id;
      let have=0; for(let i=1;i<=count;i++) if(owned[key(g.id,code,i)]) have++;
      const stickers=numsToShow.map(n=>{
        const k=key(g.id,code,n),h=owned[k]?' have':'';
        const r=(repeats[k]||0)>1?'<span class="repeat-badge">x'+repeats[k]+'</span>':'';
        return '<div class="stk'+h+'" data-k="'+k+'" ontouchstart="event.preventDefault();handlePress(\''+k+'\',this,false)" ontouchend="event.preventDefault();handleRelease(\''+k+'\',this,false)" ontouchcancel="cancelPress()">'+n+r+'</div>';
      }).join('');
      html+='<div class="group-card"><div class="group-hdr"><div class="group-hdr-left"><div class="group-badge">'+g.id+'</div><div><div class="group-name">'+name+'</div><div class="group-prog" id="tc_'+g.id+'_'+code+'">'+have+'/'+count+'</div></div></div><div style="background:rgba(255,255,255,.15);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#fff">'+code+'</div></div><div class="team-row"><div class="stickers">'+stickers+'</div></div></div>';
    });
  });

  SPECIALS.forEach(sp=>{
    const isCC=sp.id==='CC',prefix=sp.id.toLowerCase();
    let numsToShow=[];
    if(codeMatch&&codeMatch[1]===prefix){const n=parseInt(codeMatch[2]);if(sp.nums.includes(n))numsToShow=[n];}
    if(sp.label.toLowerCase().includes(q)||prefix.includes(q)) numsToShow=sp.nums;
    if(!numsToShow.length) return;
    if(!firstGroupId) firstGroupId=sp.id;
    const color=isCC?'#b91c1c':'#1e40af';
    const have=sp.nums.filter(n=>owned[spKey(sp.id,n)]).length;
    const stickers=numsToShow.map(n=>{
      const k=spKey(sp.id,n),h=owned[k]?' have':'',lbl=isCC?'CC'+n:'FWC'+n;
      const r=(repeats[k]||0)>1?'<span class="repeat-badge">x'+repeats[k]+'</span>':'';
      return '<div class="stk special'+h+'" data-k="'+k+'" ontouchstart="event.preventDefault();handlePress(\''+k+'\',this,true)" ontouchend="event.preventDefault();handleRelease(\''+k+'\',this,true)" ontouchcancel="cancelPress()">'+lbl+r+'</div>';
    }).join('');
    html+='<div class="group-card"><div class="group-hdr" style="background:'+color+'"><div class="group-hdr-left"><div class="group-badge">'+(isCC?'🥤':'🏆')+'</div><div><div class="group-name">'+sp.label+'</div><div class="group-prog">'+have+'/'+sp.nums.length+'</div></div></div></div><div class="team-row"><div class="stickers">'+stickers+'</div></div></div>';
  });

  results.innerHTML=html||'<div class="search-empty">Nenhum resultado para "'+q+'"</div>';

  // muda tab ativa para o grupo do resultado e faz scroll até ela
  if(firstGroupId){
    currentTab=firstGroupId;
    renderTabs();
    setTimeout(()=>{
      const tab=document.getElementById('tab_'+firstGroupId);
      if(tab) tab.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    },50);
  }
}

// ── EXPORT JSON ──
function exportJSON() {
  const data={owned,repeats,exportedAt:new Date().toISOString(),version:1};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url; a.download='copa2026_backup_'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); URL.revokeObjectURL(url);
  showToast('💾 Backup exportado!');
}

// ── IMPORT JSON ──
function importJSON(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.owned) { showToast('❌ Arquivo inválido'); return; }
      if (!confirm('Isso vai substituir seus dados atuais pelo backup.\n\nContinuar?')) return;
      owned   = data.owned   || {};
      repeats = data.repeats || {};
      localStorage.setItem('copa2026',     JSON.stringify(owned));
      localStorage.setItem('copa2026_rep', JSON.stringify(repeats));
      renderTabs(); renderContent(); updateStats();
      showToast('✅ Backup importado!');
    } catch(err) { showToast('❌ Erro ao ler arquivo'); }
  };
  reader.readAsText(file);
  input.value = '';
}

// ── SHARE ──
function shareStats() {
  const have=countOwned(),pct=Math.round(have/TOTAL_STICKERS*100);
  let text='⚽ Álbum Copa do Mundo 2026\n';
  text+='✅ Tenho: '+have+'/'+TOTAL_STICKERS+' ('+pct+'%)\n';
  text+='❌ Faltam: '+(TOTAL_STICKERS-have)+'\n';

  // Faltantes por seleção
  let hasMissing=false;
  let missingText='';
  GROUPS.forEach(g=>{
    g.teams.forEach(tm=>{
      const [name,code,count,flag]=tm;
      const missing=[];
      for(let i=1;i<=count;i++) if(!owned[key(g.id,code,i)]) missing.push(i);
      if(missing.length>0 && missing.length<count){
        missingText+=(flag?flag+' ':'')+name+': faltam '+missing.join(', ')+'\n';
        hasMissing=true;
      }
    });
  });
  SPECIALS.forEach(sp=>{
    const isCC=sp.id==='CC';
    const missing=sp.nums.filter(n=>!owned[spKey(sp.id,n)]);
    if(missing.length>0 && missing.length<sp.nums.length){
      missingText+=sp.label+': faltam '+(isCC?missing.map(n=>'CC'+n):missing.map(n=>'FWC'+n)).join(', ')+'\n';
      hasMissing=true;
    }
  });
  if(hasMissing){ text+='\n📋 Faltantes para troca:\n'+missingText; }

  // Repetidas
  let hasRepeats=false;
  let repeatText='';
  GROUPS.forEach(g=>{
    g.teams.forEach(tm=>{
      const [name,code,count,flag]=tm;
      const reps=[];
      for(let i=1;i<=count;i++){
        const k=key(g.id,code,i);
        if(owned[k]&&(repeats[k]||0)>1) reps.push(code+i+'(x'+(repeats[k]-1)+')');
      }
      if(reps.length){ repeatText+=(flag?flag+' ':'')+name+': '+reps.join(', ')+'\n'; hasRepeats=true; }
    });
  });
  SPECIALS.forEach(sp=>{
    const isCC=sp.id==='CC';
    const reps=[];
    sp.nums.forEach(n=>{
      const k=spKey(sp.id,n);
      if(owned[k]&&(repeats[k]||0)>1) reps.push((isCC?'CC':'FWC')+n+'(x'+(repeats[k]-1)+')');
    });
    if(reps.length){ repeatText+=sp.label+': '+reps.join(', ')+'\n'; hasRepeats=true; }
  });
  if(hasRepeats){ text+='\n🔄 Tenho para trocar:\n'+repeatText; }

  if(navigator.share) {
    navigator.share({title:'Meu álbum Copa 2026',text})
      .catch(err=>{
        // só copia se o usuário não cancelou
        if(err.name !== 'AbortError'){
          navigator.clipboard && navigator.clipboard.writeText(text).then(()=>showToast('Resumo copiado!'));
        }
      });
  } else if(navigator.clipboard) {
    navigator.clipboard.writeText(text).then(()=>showToast('Resumo copiado!'));
  } else {
    showToast('Copie o texto'); alert(text);
  }
}

// ── RESET ──
function confirmReset() {
  if(confirm('Zerar TODAS as figurinhas?\n\nEssa ação não pode ser desfeita.')){
    owned={};repeats={};
    localStorage.removeItem('copa2026');localStorage.removeItem('copa2026_rep');
    renderContent();updateStats();renderTabs();showToast('Álbum zerado!');
  }
}

// ── TOAST ──
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

// ── ADJUST PADDING ──
function adjustBodyPadding() {
  setTimeout(()=>{
    const h=document.getElementById('fixedHeader').offsetHeight;
    document.getElementById('pageBody').style.paddingTop=h+'px';
  },50);
}

// ── INIT ──
load();
renderTabs();
renderContent();
updateStats();
// inicializa milestone com o pct atual para não disparar ao abrir
lastMilestonePct = Math.floor(countOwned()/TOTAL_STICKERS*100/25)*25;
adjustBodyPadding();
window.addEventListener('resize',adjustBodyPadding);

setTimeout(()=>{
  const splash=document.getElementById('splash');
  splash.classList.add('hide');
  setTimeout(()=>splash.remove(),500);
},900);

// SERVICE WORKER
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
