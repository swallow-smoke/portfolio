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

      // images: string | {src|url|path, alt} | array
      const rawImages = p.images ?? p.gallery ?? p.photos;
      const imagesArr = Array.isArray(rawImages) ? rawImages : (typeof rawImages === 'string' ? [rawImages] : []);
      const images = imagesArr
        .map(img => {
          if (typeof img === 'string') return { src: img, alt: '' };
          if (!img || typeof img !== 'object') return null;
          return { src: img.src || img.url || img.path || '', alt: img.alt || img.title || '' };
        })
        .filter(img => img && img.src);

      // videos: string | {src|url|path, title|label, poster, type} | array
      const rawVideos = p.videos ?? p.video;
      const videosArr = Array.isArray(rawVideos) ? rawVideos : (typeof rawVideos === 'string' ? [rawVideos] : []);
      const videos = videosArr
        .map(v => {
          if (typeof v === 'string') return { src: v };
          if (!v || typeof v !== 'object') return null;
          return {
            src: v.src || v.url || v.path || '',
            title: v.title || v.label || '',
            poster: v.poster || '',
            type: v.type || '',
          };
        })
        .filter(v => v && v.src);

      return { id, title, subtitle, year, category, tags, image, color, description, demos, authors, images, videos, raw: p };
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
    counts: null,
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
            <div id="pm-gallery" class="pm-gallery" hidden></div>
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
    renderGallery(p);
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
    if (!authors.length){
      modal.authors.innerHTML='';
      return;
    }

    // DOM으로 새로 구성 (문자열 innerHTML 의존 제거)
    modal.authors.innerHTML = '';

    const title = document.createElement('h4');
    title.textContent = 'Authors';
    modal.authors.appendChild(title);

    const list = document.createElement('ul');
    list.id = 'pm-authors-list';
    modal.authors.appendChild(list);

    const getLinks = (author) => {
      const links = [];
      const github = author?.github;

      if (typeof github === 'string' && github.trim()) {
        links.push({ label: '프로필', url: github.trim() });
      } else if (Array.isArray(github)) {
        github.forEach((g) => {
          if (!g || !g.url) return;
          links.push({ label: g.label || '링크', url: g.url });
        });
      }

      return links;
    };

    authors.forEach((author, index) => {
      const li = document.createElement('li');
      if (index >= MAX) {
        li.classList.add('is-hidden');
        li.style.display = 'none';
      }

      const name = (author && typeof author === 'object') ? (author.name ?? '') : String(author ?? '');
      const role = (author && typeof author === 'object') ? (author.role ?? '') : '';

      // "사람 이름 - 했던 내용 (링크)" 형식
      const text = document.createElement('span');
      text.textContent = role ? `${name} - ${role}` : name;
      li.appendChild(text);

      const links = getLinks(author);
      if (links.length) {
        li.appendChild(document.createTextNode(' ('));

        links.forEach((link, linkIndex) => {
          if (linkIndex > 0) li.appendChild(document.createTextNode(' '));

          const a = document.createElement('a');
          a.className = 'author-link-btn';
          a.href = resolveLink(link.url);
          a.target = '_blank';
          a.rel = 'noreferrer';
          a.textContent = link.label;
          li.appendChild(a);
        });

        li.appendChild(document.createTextNode(')'));
      }

      list.appendChild(li);
    });

    const hiddenCount = Math.max(0, authors.length - MAX);
    if (hiddenCount) {
      const moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'btn btn-ghost btn-sm';
      moreBtn.setAttribute('data-more-authors', '1');
      moreBtn.dataset.moreLabel = `+ ${hiddenCount}명 더 보기`;
      moreBtn.setAttribute('aria-expanded', 'false');
      moreBtn.textContent = `+ ${hiddenCount}명 더 보기`;
      modal.authors.appendChild(moreBtn);
    }
  }

  function renderVideos(p) {
    const container = document.getElementById('pm-videos');
    if (!container) return;

    const list = Array.isArray(p?.videos) ? p.videos : [];
    const valid = list.filter(v => v && v.src);
    if (!valid.length) {
      container.hidden = true;
      container.textContent = '';
      return;
    }

    const guessType = (src) => {
      const clean = String(src || '').split('#')[0].split('?')[0];
      const ext = (clean.split('.').pop() || '').toLowerCase();
      if (ext === 'webm') return 'video/webm';
      if (ext === 'ogv' || ext === 'ogg') return 'video/ogg';
      if (ext === 'mov') return 'video/quicktime';
      return 'video/mp4';
    };

    container.hidden = false;
    container.textContent = '';

    const title = document.createElement('h4');
    title.textContent = 'Video';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'pm-videos__grid';
    container.appendChild(grid);

    valid.forEach((v) => {
      const src = v?.src;
      if (!src) return;

      const item = document.createElement('div');
      item.className = 'pm-video';

      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      if (v.poster) video.poster = resolveLink(v.poster);

      const source = document.createElement('source');
      source.src = resolveLink(src);
      source.type = v.type || guessType(src);
      video.appendChild(source);

      item.appendChild(video);

      if (v.title) {
        const cap = document.createElement('div');
        cap.className = 'pm-video__caption muted';
        cap.textContent = v.title;
        item.appendChild(cap);
      }

      grid.appendChild(item);
    });
  }

  function renderGallery(p){
    const container = document.getElementById('pm-gallery');
    if (!container) return;

    const imgs = Array.isArray(p?.images) ? p.images : [];
    if (imgs.length < 2) {
      container.hidden = true;
      container.textContent = '';
      return;
    }

    container.hidden = false;
    container.textContent = '';

    const wrap = document.createElement('div');
    wrap.className = 'pm-gallery__wrap';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'pm-gallery__btn pm-gallery__btn--prev';
    prev.setAttribute('aria-label', '이전 이미지');
    prev.textContent = '‹';

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'pm-gallery__btn pm-gallery__btn--next';
    next.setAttribute('aria-label', '다음 이미지');
    next.textContent = '›';

    const track = document.createElement('div');
    track.className = 'pm-gallery__track';

    const slides = imgs.map((img)=>{
      const slide = document.createElement('div');
      slide.className = 'pm-gallery__slide';

      const el = document.createElement('img');
      el.src = resolveImage(img.src);
      el.alt = img.alt || `${p.title || ''} 이미지`;
      el.loading = 'lazy';
      slide.appendChild(el);
      track.appendChild(slide);
      return slide;
    });

    const go = (dir)=>{
      const width = track.clientWidth || 1;
      const idx = Math.round(track.scrollLeft / width);
      const nextIdx = Math.min(slides.length - 1, Math.max(0, idx + dir));
      slides[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    };
    prev.addEventListener('click', ()=>go(-1));
    next.addEventListener('click', ()=>go(1));

    wrap.appendChild(prev);
    wrap.appendChild(track);
    wrap.appendChild(next);
    container.appendChild(wrap);
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

    if (els.counts) {
      els.counts.forEach((el) => { el.textContent = String(items.length); });
    }
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
    els.counts = Array.from(document.querySelectorAll('[data-count]'));
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