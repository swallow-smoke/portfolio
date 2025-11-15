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
      loadFragment('#header', 'pages/components/header.html'),
      loadFragment('#nav', 'pages/components/nav.html'),
      loadFragment('#footer', 'pages/components/footer.html'),
    ]);
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
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
    projects
      .filter(p=>p.featured)
      .slice(0, 6)
      .forEach(p=>{
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

  await initComponents();          // ⬅ 여기서 header/nav/footer 로드
  const data = await getPortfolio();
  renderFeatured(data);
})();