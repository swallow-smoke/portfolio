// This file contains the main functionality for the portfolio website.

document.addEventListener("DOMContentLoaded", function() {
    // Initialize the application
    initApp();

    // Set up event listeners for navigation
    setupNavigation();
});

function initApp() {
    // Load the initial content or home page
    loadPage('pages/intro.html');
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const page = this.getAttribute('href');
            loadPage(page);
        });
    });
}

function loadPage(page) {
    const contentArea = document.getElementById('content');
    fetch(page)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            contentArea.innerHTML = html;
            // Optionally, you can call a function to initialize scripts for the new page
            initPageScripts(page);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}

function initPageScripts(page) {
    // Here you can add any page-specific script initialization if needed
    if (page === 'pages/about.html') {
        // Initialize about page scripts
    }
    // Add more conditions for other pages as necessary
}

(async function(){
  async function loadFragment(selector, url){
    const host = document.querySelector(selector);
    if(!host) return;
    // 기본 경로 시도 → 실패 시 pages/components 폴백
    const tries = [url, url.replace(/^components\//, 'pages/components/')];
    for (const u of tries){
      try {
        const res = await fetch(u);
        if (!res.ok) continue;
        host.innerHTML = await res.text();
        return;
      } catch {}
    }
  }

  async function initComponents(){
    await Promise.all([
      loadFragment('#header', 'components/header.html'),
      loadFragment('#nav', 'components/nav.html'),
      loadFragment('#footer', 'components/footer.html'),
    ]);
    // Footer year
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
    // Theme toggle after components mounted
    window.UI?.initTheme();
    window.UI?.bindThemeToggle();
    window.UI?.setActiveNav();
  }

  async function getPortfolio(){
    try {
      const res = await fetch('assets/data/portfolio.json');
      const data = await res.json();
      return normalize(data);
    } catch (e){
      console.warn('portfolio.json을 불러오지 못했습니다.', e);
      return [];
    }
  }
  function normalize(data){
    // data.projects, data.portfolio, 배열 모두 허용
    const list = Array.isArray(data) ? data : (data?.projects || data?.portfolio || []);
    return list.map(p => ({
      title: p.title || p.name || 'Untitled',
      desc: p.description || p.desc || '',
      image: p.image || p.thumbnail || '',
      url: p.url || p.link || '#',
      tags: p.tags || p.stack || [],
      featured: p.featured ?? true
    }));
  }

  function el(html){
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function renderFeatured(projects){
    const wrap = document.getElementById('featured-projects');
    if(!wrap) return;
    wrap.innerHTML = '';
    projects.filter(p=>p.featured).slice(0, 6).forEach(p=>{
      const card = el(`
        <article class="card reveal">
          <a href="${p.url}">
            <div class="card__thumb">
              ${p.image ? `<img src="${p.image}" alt="${p.title}">` : ''}
            </div>
            <div class="card__body">
              <h3 class="card__title">${p.title}</h3>
              <p class="card__desc">${p.desc || ''}</p>
              <div class="tags">
                ${(p.tags||[]).slice(0,5).map(t=>`<span class="tag">${t}</span>`).join('')}
              </div>
            </div>
          </a>
        </article>
      `);
      wrap.appendChild(card);
    });
    window.UI?.revealOnScroll();
  }

  await initComponents();
  const data = await getPortfolio();
  renderFeatured(data);
})();

(function(){
  const h = (html)=>{ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; };
  const esc = (s)=>String(s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  // 이미지: images/projects/<파일명> 강제
  const resolveImage = (p)=>{
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    const cleaned = String(p).replace(/^\.\//,'').replace(/^\/+/,'');
    if (/^images\//i.test(cleaned)) return cleaned; // 루트 images/* 이미 주어진 경우 사용
    const file = cleaned.split('/').pop();
    return `images/projects/${file}`;
  };

  function normalizeAny(data){
    const list = Array.isArray(data)? data : (data?.projects || data?.portfolio || []);
    return list.map((p,i)=>({
      id: p.id || `p-${i}`,
      title: p.title || p.name || 'Untitled',
      subtitle: p.subtitle || '',
      year: p.year || 0,
      tags: Array.isArray(p.tags)? p.tags : (p.tags? [p.tags] : []),
      image: p.image || p.thumbnail || '',
      demos: Array.isArray(p.demo)? p.demo : (p.url||p.link? [{label:'Open', url:p.url||p.link}] : []),
      color: p.color || ''
    }));
  }

  async function fetchJSON(url){
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  function renderFeatured(list){
    const root = document.getElementById('featured-projects');
    if (!root) return;
    root.innerHTML = '';
    list.forEach((p, idx)=>{
      const img = p.image
        ? `<img src="${resolveImage(p.image)}" alt="${esc(p.title)}" loading="lazy">`
        : '';
      const thumb = img || `<div class="thumb-fallback" style="background: ${p.color||'var(--bg-soft)'}"></div>`;
      const card = h(`
        <article class="card reveal" style="--stagger:${idx}">
          <div class="card__thumb">${thumb}</div>
          <div class="card__body">
            <h3 class="card__title">${esc(p.title)}</h3>
            ${p.subtitle ? `<p class="card__desc">${esc(p.subtitle)}</p>` : ''}
            <div class="tags">${(p.tags||[]).slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
            ${p.demos?.[0]?.url ? `<a class="btn btn-ghost" href="${p.demos[0].url}">열어보기</a>` : ''}
          </div>
        </article>
      `);
      root.appendChild(card);
    });
    window.UI?.revealOnScroll?.(root);
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    try{
      const raw = await fetchJSON('assets/data/portfolio.json');
      const all = normalizeAny(raw)
        .sort((a,b)=> (b.year||0)-(a.year||0) || a.title.localeCompare(b.title));
      renderFeatured(all.slice(0,6)); // 최신 6개
    }catch(e){
      console.error('Featured 로드 실패', e);
    }
  });
})();