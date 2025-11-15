// This file contains the main functionality for the portfolio website.
(async function () {
  async function loadFragment(selector, url) {
    const host = document.querySelector(selector);
    if (!host) return;

    try {
      const res = await fetch(url); // index.html 기준 상대경로
      if (!res.ok) throw new Error(res.statusText);
      host.innerHTML = await res.text();
    } catch (e) {
      console.warn('fragment load 실패:', url, e);
    }
  }

  async function initComponents() {
    await Promise.all([
      loadFragment('#header', '/portfolio/pages/components/header.html'),
      loadFragment('#nav',    '/portfolio/pages/components/nav.html'),
      loadFragment('#footer', '/portfolio/pages/components/footer.html'),
    ]);

    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    window.UI?.initTheme();
    window.UI?.bindThemeToggle();
    window.UI?.setActiveNav();
  }

  async function getPortfolio() {
    try {
      // index.html 기준 → /assets/data/portfolio.json
      const res = await fetch('assets/data/portfolio.json');
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
      url:      p.url || p.link || '#',
      tags:     p.tags || p.stack || [],
      featured: p.featured ?? true
    }));
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
            <a href="${p.url}">
              <div class="card__thumb">
                ${p.image ? `<img src="${p.image}" alt="${p.title}" loading="lazy">` : ''}
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