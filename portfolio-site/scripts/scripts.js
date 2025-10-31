/* ========== State ========== */
const state = {
  projects: [],
  query: '',
  category: '전체',
  visibleLimit: (() => {
    const v = parseInt(localStorage.getItem('visibleLimit') || '', 10);
    return Number.isFinite(v) ? Math.min(60, Math.max(1, v)) : 6;
  })(),
  perfMode: (localStorage.getItem('perfMode') || 'auto').toLowerCase()
};

/* ========== DOM ========== */
const els = {};
function cacheEls() {
  // list
  els.list = document.getElementById('project-list');
  els.empty = document.getElementById('empty');

  // topbar
  els.search = document.getElementById('search');
  els.catSelect = document.getElementById('filter-category');
  els.visibleLimit = document.getElementById('visible-limit');
  els.perfMode = document.getElementById('perf-mode');

  // modal
  els.modal = document.getElementById('modal');
  els.modalClose = document.getElementById('modal-close');
  els.modalTitle = document.getElementById('modal-title');
  els.modalDesc = document.getElementById('modal-desc');
  els.modalCover = document.getElementById('modal-cover');
  els.modalTags = document.getElementById('modal-tags');
  els.modalLinks = document.getElementById('modal-links');

  // authors
  els.authWrap = document.querySelector('.authors-wrap');
  els.authSummary = document.getElementById('authors-summary');
  els.authFull = document.getElementById('authors-full');
  els.authToggle = document.getElementById('authors-toggle');
}

/* ========== Utils ========== */
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function stripJsonComments(s){
  return String(s||'')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
    .replace(/,\s*([}\]])/g, '$1');
}
function normalizeHref(input){
  let href = String(input||'').trim();
  if (!href) return '';
  const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (emailRe.test(href)) return 'mailto:' + href;
  if (/^mailto:/i.test(href)) return href;
  if (/^(https?:)?\/\//i.test(href)) return href.startsWith('//') ? 'https:' + href : href;
  if (/^([a-z0-9-]+\.)+[a-z]{2,}([/:].*)?$/i.test(href)
   || /^discord\.(gg|com)\//i.test(href)
   || /^github\.com\//i.test(href)
   || /^x\.com\//i.test(href) || /^twitter\.com\//i.test(href)
   || /^youtube\.com\//i.test(href) || /^youtu\.be\//i.test(href)
   || /^notion\.so\//i.test(href)){
    return 'https://' + href;
  }
  return href;
}
function labelFromHref(href){
  try{
    const u = new URL(normalizeHref(href), location.origin);
    const h = u.hostname.replace(/^www\./,'');
    if (h.includes('github.com')) return 'GitHub';
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'YouTube';
    if (h.includes('notion.so')) return 'Notion';
    if (h.includes('x.com') || h.includes('twitter.com')) return 'Twitter/X';
    if (h.includes('discord.gg') || h.includes('discord.com')) return 'Discord';
    if (h.includes('gmail.com') || h.includes('mail.')) return 'Email';
    return h || 'Link';
  }catch{ return 'Link'; }
}
function normalizeLinks(value){
  const out = [];
  const push = (href,label)=>{
    if(!href) return;
    href = normalizeHref(href);
    out.push({ href, label: label || labelFromHref(href) });
  };
  if (!value) return out;
  if (typeof value === 'string'){ push(value); return out; }
  if (Array.isArray(value)){
    value.forEach(v=>{
      if (typeof v === 'string') push(v);
      else if (v && typeof v === 'object'){
        if (v.url || v.href) push(v.url || v.href, v.label || v.name);
        else Object.entries(v).forEach(([k,val])=>{
          if (typeof val === 'string') push(val, k);
          else if (val && typeof val === 'object' && (val.url || val.href)) push(val.url || val.href, val.label || k);
        });
      }
    });
    return out;
  }
  if (value && typeof value === 'object'){
    if (value.url || value.href){ push(value.url || value.href, value.label || value.name); return out; }
    Object.entries(value).forEach(([k,val])=>{
      if (typeof val === 'string') push(val, k);
      else if (val && typeof val === 'object' && (val.url || val.href)) push(val.url || val.href, val.label || k);
    });
    return out;
  }
  return out;
}
function getProjectLinks(p){
  return normalizeLinks(p?.links || p?.link || p?.demo || p?.urls || p?.url || p?.href);
}
function getProjectCategories(p){
  const cats = Array.isArray(p?.category) ? p.category : (p?.category ? [p.category] : []);
  return cats.map(c => String(c || '').trim()).filter(Boolean);
}

/* ========== Data ========== */
function normalizeProjects(arr){
  return (Array.isArray(arr) ? arr : []).map((p, i) => ({
    id: (p?.id ?? `p-${i}`) + '',
    title: p?.title || p?.name || `Untitled #${i+1}`,
    subtitle: p?.subtitle || '',
    description: p?.description || '',
    category: Array.isArray(p?.category) ? p.category : (p?.category ? [p.category] : []),
    image: p?.image || p?.cover || '',
    links: p?.links || p?.link || p?.demo || p?.urls || p?.url || p?.href || null,
    tags: Array.isArray(p?.tags) ? p.tags : [],
    authors: p?.authors || p?.author || p?.creators || p?.makers || p?.contributors || p?.team || p?.participants || p?.credits || null
  }));
}
async function loadData(){
  const url = './asset/portfolio.json';
  const res = await fetch(url, { cache:'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const txt = await res.text();
  const clean = stripJsonComments(txt);
  let raw;
  try{ raw = JSON.parse(clean); }
  catch(e){ console.error('[portfolio.json 파싱 실패]', e); raw = []; }
  state.projects = normalizeProjects(raw);
}

/* ========== Render ========== */
function ensureList(){
  let el = document.getElementById('project-list');
  if (!el){
    const main = document.querySelector('main.portfolio') || document.querySelector('main');
    if (!main) return null;
    el = document.createElement('ul');
    el.id = 'project-list';
    el.className = 'list';
    main.prepend(el);
  }
  els.list = el;
  return el;
}
function itemHTML(p){
  const img = p.image ? `<div class="thumb"><img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async"></div>` : '';
  return `
    <li class="list-item" data-id="${escapeHtml(p.id)}">
      ${img}
      <div class="info">
        <div class="title">${escapeHtml(p.title)}</div>
        ${p.subtitle ? `<div class="sub">${escapeHtml(p.subtitle)}</div>` : ''}
      </div>
    </li>`;
}
function renderCategoryOptions(){
  if (!els.catSelect) return;
  const set = new Set();
  state.projects.forEach(p => getProjectCategories(p).forEach(c => set.add(c)));
  const cats = ['전체', ...Array.from(set)];
  if (!cats.includes(state.category)) state.category = '전체';
  els.catSelect.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  els.catSelect.value = state.category;
}
function renderList(){
  const q = (state.query || '').toLowerCase();
  const cat = state.category || '전체';
  const filtered = state.projects.filter(p => {
    const cats = getProjectCategories(p);
    const inCat = (cat === '전체') || cats.includes(cat);
    const inQuery = !q || (
      (p.title || '').toLowerCase().includes(q) ||
      (p.subtitle || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => (t || '').toLowerCase().includes(q)) ||
      cats.some(cn => (cn || '').toLowerCase().includes(q))
    );
    return inCat && inQuery;
  });

  const listEl = ensureList();
  if (!listEl) return;

  const limited = filtered.slice(0, state.visibleLimit);
  listEl.innerHTML = limited.map(itemHTML).join('');
  listEl.classList.remove('entering'); void listEl.offsetWidth; listEl.classList.add('entering');
  listEl.querySelectorAll('.list-item').forEach((li,i)=>{ li.style.setProperty('--i', i); li.classList.add('show'); });

  // 이미지 페이드인
  listEl.querySelectorAll('img').forEach(img=>{
    const on = ()=>img.classList.add('loaded');
    if (img.complete) on(); else img.addEventListener('load', on, { once:true });
  });

  if (els.empty) els.empty.classList.toggle('hidden', limited.length > 0);
}

/* ========== Authors ========== */
function pushLinkUnique(arr, href, label){
  if(!href) return;
  const norm = normalizeHref(href);
  const lab = label || labelFromHref(norm);
  if (!norm) return;
  if (!arr.some(x=>x.href===norm && x.label===lab)){
    arr.push({ href: norm, label: lab });
  }
}
function collectAuthorLinks(obj){
  const out = [];
  const map = [
    ['links',  null], ['link', null], ['urls', null], ['url', null], ['href', null],
    ['github', 'GitHub'], ['youtube', 'YouTube'], ['yt', 'YouTube'],
    ['x', 'Twitter/X'], ['twitter', 'Twitter/X'],
    ['discord', 'Discord'], ['email', 'Email'],
    ['site', 'Website'], ['homepage', 'Website'], ['portfolio', 'Portfolio'],
    ['notion', 'Notion'], ['blog', 'Blog'], ['instagram', 'Instagram'], ['facebook', 'Facebook']
  ];
  for (const [key, defaultLabel] of map){
    const v = obj[key];
    if (!v) continue;
    if (typeof v === 'string'){ pushLinkUnique(out, v, defaultLabel); continue; }
    if (Array.isArray(v)){
      v.forEach(it=>{
        if (typeof it === 'string') pushLinkUnique(out, it, defaultLabel);
        else if (it && typeof it === 'object'){
          const href = it.href || it.url || it.link;
          const lab  = it.label || it.name || it.title || defaultLabel;
          pushLinkUnique(out, href, lab);
        }
      });
      continue;
    }
    if (typeof v === 'object'){
      const href = v.href || v.url || v.link;
      const lab  = v.label || v.name || v.title || defaultLabel;
      if (href){ pushLinkUnique(out, href, lab); continue; }
      Object.entries(v).forEach(([lk, lv])=>{
        if (typeof lv === 'string') pushLinkUnique(out, lv, lk);
        else if (lv && typeof lv === 'object') pushLinkUnique(out, lv.href || lv.url || '', lv.label || lk);
      });
    }
  }
  return out;
}
function normalizeAuthors(src){
  if (!src) return [];
  const out = [];
  const push = (name, role, links)=>{
    name = String(name||'').trim();
    role = String(role||'').trim();
    const arr = Array.isArray(links) ? links : (links ? [links] : []);
    const linksOut = [];
    arr.forEach(l=>{
      if (!l) return;
      if (typeof l === 'string') pushLinkUnique(linksOut, l);
      else if (typeof l === 'object'){
        const href = l.href || l.url || l.link;
        const lab  = l.label || l.name || l.title;
        pushLinkUnique(linksOut, href, lab);
      }
    });
    if (name) out.push({ name, role, links: linksOut });
  };
  const consumeDict = (o)=>{
    Object.entries(o||{}).forEach(([k,v])=>{
      if (typeof v === 'string') push(k, v, []);
      else if (v && typeof v === 'object'){
        const links = collectAuthorLinks(v);
        push(v.name||k, v.role||v.do||v.title||'', links);
      }
    });
  };
  if (Array.isArray(src)){
    src.forEach(a=>{
      if (!a) return;
      if (typeof a === 'string') push(a,'',[]);
      else if (typeof a === 'object'){
        const links = collectAuthorLinks(a);
        if (a.name || a.role || links.length) push(a.name||'', a.role||a.do||'', links);
        else consumeDict(a);
      }
    });
    return out;
  }
  if (typeof src === 'object'){
    if (src.name || src.role || src.links || src.url || src.href){
      const links = collectAuthorLinks(src);
      push(src.name||'', src.role||src.do||'', links);
      return out;
    }
    consumeDict(src);
    return out;
  }
  if (typeof src === 'string'){ push(src,'',[]); }
  return out;
}
function renderAuthorsInModal(p){
  if (!els.authWrap || !els.authSummary || !els.authFull || !els.authToggle) return;
  const authors = normalizeAuthors(p.authors);

  if (!authors.length){
    els.authWrap.style.display = 'none';
    els.authFull.innerHTML = '';
    els.authSummary.textContent = '';
    return;
  }

  els.authWrap.style.display = '';
  els.authSummary.textContent = authors.map(a=>a.name).join(', ');
  els.authFull.innerHTML = authors.map((a,i)=>`
    <div class="author-chip" style="--i:${i}">
      <div class="author-name">${escapeHtml(a.name)}</div>
      ${a.role ? `<div class="do">${escapeHtml(a.role)}</div>` : ''}
      ${a.links?.length ? `<div class="author-links">
        ${a.links.map(l=>`<a class="btn-chip" href="${escapeHtml(l.href||'')}" target="_blank" rel="noopener">${escapeHtml(l.label||'Link')}</a>`).join('')}
      </div>` : ''}
    </div>
  `).join('');

  // 초기 접기
  els.authFull.classList.add('hidden');
  els.authFull.classList.remove('show','closing');
  els.authToggle.setAttribute('aria-expanded','false');
  els.authToggle.textContent = '제작자 전체 보기';

  // 토글 애니메이션
  els.authToggle.onclick = ()=>{
    const isHidden = els.authFull.classList.contains('hidden');
    if (isHidden){
      els.authFull.classList.remove('hidden','closing');
      // 스태거 인덱스 보장
      els.authFull.querySelectorAll('.author-chip').forEach((chip, i)=> chip.style.setProperty('--i', i));
      // 다음 프레임에 show 추가(애니메이션 트리거)
      requestAnimationFrame(()=> els.authFull.classList.add('show'));
      els.authToggle.setAttribute('aria-expanded','true');
      els.authToggle.textContent = '접기';
    }else{
      els.authFull.classList.remove('show');
      els.authFull.classList.add('closing');
      els.authToggle.setAttribute('aria-expanded','false');
      els.authToggle.textContent = '제작자 전체 보기';
      setTimeout(()=>{
        els.authFull.classList.add('hidden');
        els.authFull.classList.remove('closing');
      }, 200);
    }
  };
}

/* ========== Modal ========== */
function closeModal(){
  if (!els.modal) return;
  // 부드러운 닫기
  els.modal.classList.add('closing');
  const done = ()=>{
    els.modal.classList.add('hidden');
    els.modal.classList.remove('closing','showing');
    els.modal.removeEventListener('animationend', done);
  };
  els.modal.addEventListener('animationend', done);
  setTimeout(done, 240); // 폴백
}
function openModal(id){
  if (!els.modal) return;
  const p = state.projects.find(x => String(x.id) === String(id));
  if (!p) return;

  els.modalTitle && (els.modalTitle.textContent = p.title || '');
  els.modalDesc  && (els.modalDesc.textContent  = (p.description || p.subtitle || '').replace(/\r/g,''));
  els.modalCover && (els.modalCover.innerHTML  = p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async">` : '');
  els.modalTags  && (els.modalTags.innerHTML   = Array.isArray(p.tags) ? p.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') : '');
  if (els.modalLinks){
    const links = getProjectLinks(p);
    els.modalLinks.innerHTML = links.map(l => `<a class="btn-chip" href="${escapeHtml(l.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`).join('');
  }

  renderAuthorsInModal(p);

  // 부드러운 열기
  els.modal.classList.remove('hidden');
  els.modal.classList.add('showing');
  setTimeout(()=> els.modal && els.modal.classList.remove('showing'), 200);
}

/* ========== Events ========== */
function bindEvents(){
  // 리스트 → 모달
  const listEl = ensureList();
  if (listEl && !listEl.__modalBound){
    listEl.addEventListener('click', (e)=>{
      const item = e.target.closest('.list-item');
      if(!item) return;
      e.preventDefault();
      e.stopPropagation();
      openModal(item.dataset.id);
    });
    listEl.__modalBound = true;
  }

  // 검색
  if (els.search && !els.search.__bound){
    els.search.addEventListener('input', (e)=>{
      state.query = (e.target.value||'').trim().toLowerCase();
      renderList();
    });
    els.search.__bound = true;
  }

  // 카테고리
  if (els.catSelect && !els.catSelect.__bound){
    els.catSelect.addEventListener('change', ()=>{
      state.category = els.catSelect.value || '전체';
      renderList();
    });
    els.catSelect.__bound = true;
  }

  // 표시 개수
  if (els.visibleLimit && !els.visibleLimit.__bound){
    els.visibleLimit.value = String(state.visibleLimit);
    els.visibleLimit.addEventListener('change', ()=>{
      let v = parseInt(els.visibleLimit.value, 10);
      if (!Number.isFinite(v)) v = state.visibleLimit || 6;
      v = Math.max(1, Math.min(60, v));
      state.visibleLimit = v;
      localStorage.setItem('visibleLimit', String(v));
      els.visibleLimit.value = String(v);
      renderList();
    });
    els.visibleLimit.__bound = true;
  }

  // 모달 닫기
  if (els.modal && !els.modal.__overlayBound){
    els.modal.addEventListener('click', (e)=>{ if (e.target === els.modal) closeModal(); });
    els.modal.__overlayBound = true;
  }
  if (els.modalClose && !els.modalClose.__bound){
    els.modalClose.addEventListener('click', closeModal);
    els.modalClose.__bound = true;
  }
  window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeModal(); });
}

/* ========== Starfield ========== */
function initStarfield(count = 140){
  if (document.getElementById('starfield')) return;
  const wrap = document.createElement('div');
  wrap.id = 'starfield';
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  document.body.prepend(wrap);
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = Math.max(1, devicePixelRatio || 1), rafId = 0;
  const stars = [];
  function resize(){
    w = innerWidth; h = innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize(); addEventListener('resize', resize, { passive:true });
  for (let i=0;i<count;i++){
    const d = Math.random();
    stars.push({ x: Math.random()*w, y: Math.random()*h, r: 0.3 + d*1.7, sp: 0.15 + d*0.85, tw: 0.4 + Math.random()*0.8 });
  }
  function draw(){
    ctx.clearRect(0,0,w,h);
    const t = performance.now()/1000;
    for (const s of stars){
      const a = 0.25 + Math.abs(Math.sin(t * s.tw + s.x * 0.01)) * 0.75;
      ctx.globalAlpha = a; ctx.shadowColor = 'rgba(255,255,255,.5)'; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
      s.y += s.sp; if (s.y - s.r > h){ s.y = -s.r; s.x = Math.random() * w; }
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    rafId = requestAnimationFrame(draw);
  }
  rafId = requestAnimationFrame(draw);
  window.starfieldStop = function(){ cancelAnimationFrame(rafId); removeEventListener('resize', resize); wrap.remove(); };
}

/* ========== Performance ========== */
async function measureFPS(durationMs = 700){
  return new Promise(res=>{
    let frames = 0;
    const start = performance.now();
    function tick(){
      frames++;
      if (performance.now() - start >= durationMs){
        res(Math.round(frames * (1000/durationMs)));
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

async function detectLowPerf(){
  const nav = navigator || {};
  const ua = (nav.userAgent || '').toLowerCase();
  const weakDevice =
    (nav.deviceMemory && nav.deviceMemory <= 4) ||
    (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
    /android|iphone|ipad|ipod/.test(ua);
  let fps = 60;
  try{ fps = await measureFPS(); }catch{}
  return { low: weakDevice || fps < 50, fps };
}

async function applyPerfMode(){
  const badge = document.getElementById('perf-badge');
  const html = document.documentElement;
  let mode = (state.perfMode || 'auto').toLowerCase();
  let info = { low:false, fps:60 };

  if (mode === 'auto'){
    info = await detectLowPerf();
  }else if (mode === 'low'){
    info = { low:true, fps: 0 };
  }else{
    info = { low:false, fps: 60 };
  }

  html.classList.toggle('perf-low', !!info.low);
  html.setAttribute('data-perf-mode', mode);

  // 배경 효과 토글
  if (info.low){
    window.starfieldStop?.();
  }else{
    initStarfield( mode === 'high' ? 220 : 140 );
  }

  // 배지 표시
  if (badge){
    const mem = (navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'N/A');
    const th = (navigator.hardwareConcurrency || 'N/A');
    const fpsText = info.fps ? `${info.fps}fps` : (mode === 'low' ? 'low' : '—');
    const label = mode === 'auto' ? (info.low ? '자동·저사양' : '자동·고사양') : (mode === 'low' ? '저사양' : '고사양');
    badge.textContent = `${label} • 메모리≈${mem} • 스레드:${th} • FPS:${fpsText}`;
    badge.title = `모드:${label}\nMemory:${mem}, Threads:${th}, FPS:${fpsText}`;
  }
}

function initPerfControls(){
  els.perfMode = document.getElementById('perf-mode');
  if (els.perfMode){
    const val = ['auto','low','high'].includes(state.perfMode) ? state.perfMode : 'auto';
    els.perfMode.value = val;
    els.perfMode.addEventListener('change', async ()=>{
      state.perfMode = els.perfMode.value;
      localStorage.setItem('perfMode', state.perfMode);
      await applyPerfMode();
    });
  }
}

/* ========== Init ========== */
document.addEventListener('DOMContentLoaded', async ()=>{
  cacheEls();
  try{ await loadData(); }catch(e){ console.error(e); state.projects = []; }
  renderCategoryOptions();
  if (els.search) els.search.value = state.query;
  renderList();
  bindEvents();
  initPerfControls();
  await applyPerfMode();
});