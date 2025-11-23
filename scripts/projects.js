(function () {
  // ---------- Utils ----------
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const escape = (s)=>String(s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const br = (s)=> String(s||'').split(/\n{2,}/).map(p=>`<p>${escape(p).replace(/\n/g,'<br>')}</p>`).join('');
  const debounce = (fn, ms=160)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

  // 이미지: images/projects/<파일명> 강제
  const resolveImage = (p) => {
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    const cleaned = String(p).replace(/^\.\//, '').replace(/^\/+/, '');
    if (/images\/projects\//i.test(cleaned)) return `../${cleaned}`;
    const file = cleaned.split('/').pop();
    return `../images/projects/${file}`;
  };
  // 링크 보정
  const resolveLink = (u) => {
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    const cleaned = String(u).replace(/^\.\//, '').replace(/^\/+/, '');
    return cleaned.startsWith('..') ? cleaned : `../${cleaned}`;
  };

  // ---------- Data normalize ----------
  function normalizeAny(data) {
    const list = Array.isArray(data) ? data : (data?.projects || data?.portfolio || []);
    return list.map((p, i) => {
      const id = p.id || `p-${i}`;
      const title = p.title || p.name || 'Untitled';
      const subtitle = p.subtitle || '';
      const year = p.year || '';
      const category = Array.isArray(p.category) ? p.category : (p.category ? [p.category] : []);
      const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : []);
      const image = p.image || p.thumbnail || '';
      const color = p.color || '';
      const description = p.description || p.desc || '';

      let demos = [];
      if (Array.isArray(p.demo)) demos = p.demo;
      else if (p.links?.demo) demos = [{ label: 'Demo', url: p.links.demo }];
      else if (p.url || p.link) demos = [{ label: 'Open', url: p.url || p.link }];

      let authors = [];
      if (typeof p.authors === 'string') authors = [{ name: p.authors }];
      else if (Array.isArray(p.authors)) authors = p.authors.map(a => typeof a === 'string' ? ({ name: a }) : a);

      return { id, title, subtitle, year, category, tags, image, color, description, demos, authors, raw: p };
    });
  }

  async function fetchJSON(url) {
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  async function loadData() {
    const sources = [ '../assets/data/portfolio.json' ];
    const merged = [];
    for (const src of sources) {
      try { merged.push(...normalizeAny(await fetchJSON(src))); } catch (e) { console.warn('데이터 로드 실패:', src, e); }
    }
    const seen = new Set();
    return merged.filter(p => { const k = p.id || p.title; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  // ---------- DOM refs ----------
  const els = {
    grid: null,
    empty: null,
    count: null,
    q: null,
    clear: null,
    filters: null,
    clearTags: null,   // 🔥 추가
    selectedTags: null,
  };

  // ---------- Modal ----------
  const modal = { root:null, title:null, subtitle:null, chips:null, desc:null, authors:null, actions:null, thumb:null, closeBtn:null, overlay:null };
  function ensureModal() {
    if (document.getElementById('project-modal')) return;
    document.body.appendChild(h(`
      <div id="project-modal" class="modal" aria-hidden="true">
        <div class="modal__overlay" data-close="overlay"></div>
        <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="pm-title">
          <button class="modal__close" aria-label="닫기" data-close="btn">✕</button>
          <header class="modal__header">
            <div class="modal__thumb" id="pm-thumb" aria-hidden="true"></div>
            <div class="modal__meta">
              <h3 id="pm-title"></h3>
              <p id="pm-subtitle" class="muted"></p>
              <div id="pm-chips" class="chips"></div>
            </div>
          </header>
          <section class="modal__body">
            <div id="pm-desc" class="pm-desc"></div>
            <div id="pm-authors" class="pm-authors"></div>
            <div id="pm-videos" class="pm-videos"></div> <!-- 🔥 추가 -->
          </section>
          <footer class="modal__footer" id="pm-actions"></footer>
        </div>
      </div>
    `));
  }
  function bindModalDom() {
    modal.root = document.getElementById('project-modal');
    modal.title = document.getElementById('pm-title');
    modal.subtitle = document.getElementById('pm-subtitle');
    modal.chips = document.getElementById('pm-chips');
    modal.desc = document.getElementById('pm-desc');
    modal.authors = document.getElementById('pm-authors');
    modal.actions = document.getElementById('pm-actions');
    modal.thumb = document.getElementById('pm-thumb');
    modal.closeBtn = modal.root.querySelector('[data-close="btn"]');
    modal.overlay = modal.root.querySelector('[data-close="overlay"]');

    modal.overlay.addEventListener('click', closeModal);
    modal.closeBtn.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.root.getAttribute('aria-hidden')!=='true') closeModal(); });

    // 제작자 더보기 토글
    modal.authors.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-more-authors]');
      if (!btn) return;
      const list = modal.authors.querySelector('#pm-authors-list');
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      list.querySelectorAll('.is-hidden').forEach(li => { li.style.display = expanded ? 'none' : ''; });
      btn.setAttribute('aria-expanded', String(!expanded));
      btn.textContent = expanded ? btn.dataset.moreLabel : '접기';
    });
  }
  function openModal(p) {
    modal.title.textContent = p.title || '';
    modal.subtitle.textContent = [p.subtitle, p.year ? `(${p.year})` : ''].filter(Boolean).join(' ');
    modal.chips.innerHTML = [...(p.category || []), ...(p.tags || [])].slice(0,12).map(t=>`<span class="chip">${escape(t)}</span>`).join('');
    modal.desc.innerHTML = p.description ? br(p.description) : '<p class="muted">설명이 존재하지 않습니다.</p>';
    modal.thumb.innerHTML = p.image ? `<img src="${resolveImage(p.image)}" alt="${escape(p.title)} 이미지">` : '';

    renderAuthors(p);
    renderVideos(p); // 🔥 추가

    modal.actions.innerHTML = '';
    (Array.isArray(p.demos) ? p.demos : p.demo || []).forEach(d=>{
      if (!d?.url) return;
      const a = h(`<a class="btn btn-primary" target="_blank" rel="noreferrer">${escape(d.label || 'Open')}</a>`);
      a.href = resolveLink(d.url);
      modal.actions.appendChild(a);
    });

    modal.root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.closeBtn?.focus();
  }
  function closeModal(){ modal.root.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  function renderAuthors(p){
    const MAX = 2;
    const authors = Array.isArray(p.authors) ? p.authors : [];
    if (!authors.length){ modal.authors.innerHTML=''; return; }
    const toItem = (a)=> {
      const name = escape(a?.name ?? a);
      const role = a?.role ? ` - ${escape(a.role)}` : '';
      let extra = '';
      if (a?.github) extra = typeof a.github === 'string' ? ` <a href="${resolveLink(a.github)}" target="_blank" rel="noreferrer">GitHub</a>` : '';
      return `${name}${role}${extra}`;
    };
    const hiddenCount = Math.max(0, authors.length - MAX);
    modal.authors.innerHTML = `
      <h4>Authors</h4>
      <ul id="pm-authors-list">
        ${authors.map((a, i)=>`<li${i>=MAX?' class="is-hidden" style="display:none"':''}>${toItem(a)}</li>`).join('')}
      </ul>
      ${hiddenCount ? `<button class="btn btn-ghost btn-sm" data-more-authors="1" data-more-label="+ ${hiddenCount}명 더 보기" aria-expanded="false">+ ${hiddenCount}명 더 보기</button>` : ''}
    `;
  }

  function renderVideos(p) {
    const container = document.getElementById('pm-videos');
    if (!container) return;

    // 비디오 배열이 없거나 비어 있으면 숨김 처리
    if (!p.videos || !Array.isArray(p.videos) || p.videos.length === 0) {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }

    // 비디오 배열 렌더링
    container.hidden = false;
    container.innerHTML = p.videos
      .map(video => `
        <video controls>
          <source src="${escape(video)}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      `)
      .join('');
  }

  // ---------- Grid + Filters ----------
  let DATA = [];
  let MAP = new Map();
  let TAGS = [];
  const selected = new Set();

  function computeTags(list){
    const set = new Set();
    list.forEach(p => (p.tags||[]).forEach(t => set.add(String(t))));
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }

  function buildChips(){
    if (!els.filters) return;
    els.filters.innerHTML = '';
    if (!TAGS.length){ els.filters.hidden = true; return; }
    els.filters.hidden = false;
    TAGS.forEach(tag=>{
      const chip = h(`<button type="button" class="chip${selected.has(tag)?' is-active':''}" data-tag="${escape(tag)}">${escape(tag)}</button>`);
      chip.addEventListener('click', ()=>{
        selected.has(tag) ? selected.delete(tag) : selected.add(tag);
        filterAndRender(els.q?.value || '');
        writeURL();
        renderSelectedTags();      // 🔥 추가
      });
      els.filters.appendChild(chip);
    });
  }

  function renderGrid(items){
    els.grid.innerHTML = '';
    items.forEach((p, idx)=>{
      const img = p.image ? `<img src="${resolveImage(p.image)}" alt="${escape(p.title)}" loading="lazy">` : '';
      const card = h(`
        <article class="card reveal" style="--stagger:${idx}" data-id="${escape(p.id)}" data-role="open-modal" tabindex="0" aria-label="${escape(p.title)} 상세 보기">
          <div class="card__thumb">${img}</div>
          <div class="card__body">
            <h3 class="card__title">${escape(p.title)}</h3>
            ${p.subtitle ? `<p class="card__desc">${escape(p.subtitle)}</p>` : ''}
            <div class="tags">${(p.tags||[]).slice(0,6).map(t=>`<span class="tag">${escape(t)}</span>`).join('')}</div>
          </div>
        </article>
      `);
      els.grid.appendChild(card);
    });
    // 스크롤 리빌 트리거
    window.UI?.revealOnScroll?.(els.grid);
  }

  function filterAndRender(qRaw){
    const q = (qRaw||'').trim().toLowerCase();
    const items = DATA.filter(p=>{
      const qHit = !q || [p.title,p.subtitle,p.description,(p.tags||[]).join(' ')].join(' ').toLowerCase().includes(q);
      const tHit = !selected.size || (p.tags||[]).some(t=>selected.has(t));
      return qHit && tHit;
    }).sort((a,b)=> (b.year||0)-(a.year||0) || a.title.localeCompare(b.title));

    els.count && (els.count.textContent = String(items.length));
    els.empty && (els.empty.hidden = items.length !== 0);
    renderGrid(items);
  }

  function readURL(){
    const sp = new URLSearchParams(location.search);
    const q = sp.get('q') || '';
    const tags = (sp.get('tags') || '').split(',').filter(Boolean);
    selected.clear(); tags.forEach(t=>selected.add(t));
    if (els.q) els.q.value = q;
    renderSelectedTags();          // 🔥 추가
  }
  function writeURL(){
    const sp = new URLSearchParams();
    if (els.q?.value) sp.set('q', els.q.value);
    if (selected.size) sp.set('tags', Array.from(selected).join(','));
    history.replaceState(null,'', `${location.pathname}?${sp.toString()}`);
  }

  function bindGridClicks(){
    els.grid.addEventListener('click', (e)=>{
      const card = e.target.closest('[data-role="open-modal"]');
      if (!card) return;
      openModal(MAP.get(card.getAttribute('data-id')));
    });
    els.grid.addEventListener('keydown', (e)=>{
      if (e.key !== 'Enter') return;
      const card = e.target.closest('[data-role="open-modal"]');
      if (!card) return;
      openModal(MAP.get(card.getAttribute('data-id')));
    });
  }

  function bindToolbar(){
    if (els.q){
      const onInput = debounce(()=>{ writeURL(); filterAndRender(els.q.value); }, 150);
      els.q.addEventListener('input', onInput);
    }
    if (els.clear){
      els.clear.addEventListener('click', ()=> {
        if (!els.q) return;
        els.q.value = '';
        writeURL();
        filterAndRender('');
        els.q.focus();
      });
    }

    // 🔥 태그 전체 해제 버튼
    if (els.clearTags) {
      els.clearTags.addEventListener('click', () => {
        selected.clear();                // 선택된 태그 모두 제거
        buildChips();                    // chips UI 다시 그림 (is-active 제거)
        writeURL();                      // URL 파라미터 갱신
        filterAndRender(els.q?.value || ''); // 현재 검색어 기준으로 목록 다시 필터링
        renderSelectedTags();      // 🔥 추가
      });
    }
  }

  function renderSelectedTags(){
    if (!els.selectedTags) return;
    if (!selected.size){
      els.selectedTags.textContent = '';  // 아무 것도 선택 안 했을 때는 숨기거나 비우기
      return;
    }
    const tags = Array.from(selected).sort((a,b)=>a.localeCompare(b));
    els.selectedTags.innerHTML =
      `선택된 태그: ` +
      tags.map(t => `<span class="tag">${escape(t)}</span>`).join(' ');
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', async ()=> {
    els.grid   = document.getElementById('project-grid') || document.querySelector('#projects .grid');
    els.empty  = document.getElementById('empty');
    els.count  = document.getElementById('count');
    els.filters= document.getElementById('filters');
    els.q      = document.getElementById('q');
    els.clear  = document.getElementById('clear');
    els.clearTags = document.getElementById('clear-tags'); // 🔥 추가
    els.selectedTags= document.getElementById('selected-tags'); // 🔥 추가

    ensureModal(); bindModalDom();

    try{
      DATA = await loadData();
      MAP = new Map(DATA.map(p=>[p.id,p]));
      TAGS = computeTags(DATA);

      buildChips();
      bindToolbar();
      readURL();
      filterAndRender(els.q?.value || '');

      bindGridClicks();
    } catch(e){
      console.error('프로젝트 데이터를 불러오지 못했습니다.', e);
      if (els.grid) els.grid.innerHTML = '<p class="muted">데이터를 불러오지 못했습니다.</p>';
    }
  });
})();