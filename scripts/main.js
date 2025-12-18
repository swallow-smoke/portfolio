// This file contains the main functionality for the portfolio website.
(async function () {
  const SITE_BASE = (location.pathname === '/portfolio' || location.pathname.startsWith('/portfolio/')) ? '/portfolio' : '';

  const withBase = (path) => `${SITE_BASE}${path}`;

  function rewritePortfolioLinks(root=document){
    if (SITE_BASE) return; // GitHub Pages(/portfolio)에서는 그대로 사용
    root.querySelectorAll('a[href^="/portfolio/"]').forEach(a=>{
      a.setAttribute('href', a.getAttribute('href').replace(/^\/portfolio\//, '/'));
    });
  }

  async function loadFragment(selector, url) {
    const host = document.querySelector(selector);
    if (!host) return;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      host.innerHTML = await res.text();
      // 로컬(/)에서 /portfolio/... 링크가 깨지는 것 방지
      rewritePortfolioLinks(host);
    } catch (e) {
      console.warn('fragment load 실패:', url, e);
    }
  }

  async function initComponents() {
    await Promise.all([
      loadFragment('#header', withBase('/pages/components/header.html')),
      loadFragment('#nav',    withBase('/pages/components/nav.html')),
      loadFragment('#footer', withBase('/pages/components/footer.html')),
    ]);

    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    window.UI?.initTheme();
    window.UI?.bindThemeToggle();
    window.UI?.setActiveNav();
  }

  async function getPortfolio() {
    try {
      const res = await fetch(withBase('/assets/data/portfolio.json'));
      const data = await res.json();
      return normalize(data);
    } catch (e) {
      console.warn('portfolio.json을 불러오지 못했습니다.', e);
      return [];
    }
  }

  function normalize(data) {
    const list = Array.isArray(data) ? data : (data?.projects || data?.portfolio || []);
    return list.map(p => ({
      title:    p.title || p.name || 'Untitled',
      desc:     p.description || p.desc || '',
      image:    p.image || p.thumbnail || '',
      url:      (Array.isArray(p.demo) && p.demo[0]?.url) ? p.demo[0].url
             : (p.links?.demo || p.url || p.link || '#'),
      tags:     p.tags || p.stack || [],
      featured: p.featured ?? true
    }));
  }

  // index.html 기준 이미지/링크 보정
  function resolveImageHome(p){
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    const cleaned = String(p).replace(/^\.\//, '').replace(/^\/+/, '');
    if (/^images\/projects\//i.test(cleaned)) return cleaned;
    const file = cleaned.split('/').pop();
    return `images/projects/${file}`;
  }
  function resolveLinkHome(u){
    if (!u) return '#';
    if (/^https?:\/\//i.test(u)) return u;
    const cleaned = String(u).replace(/^\.\//, '').replace(/^\/+/, '');
    return cleaned;
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function renderFeatured(projects) {
    const wrap = document.getElementById('featured-projects');
    if (!wrap) return;
    wrap.innerHTML = '';

    projects
      .filter(p => p.featured)
      .slice(0, 6)
      .forEach(p => {
        const card = el(`
          <article class="card reveal">
            <a href="${resolveLinkHome(p.url)}">
              <div class="card__thumb">
                ${p.image ? `<img src="${resolveImageHome(p.image)}" alt="${p.title}" loading="lazy">` : ''}
              </div>
              <div class="card__body">
                <h3 class="card__title">${p.title}</h3>
                <p class="card__desc">${p.desc || ''}</p>
                <div class="tags">
                  ${(p.tags || []).slice(0, 5).map(t => `<span class="tag">${t}</span>`).join('')}
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