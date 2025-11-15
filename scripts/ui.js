document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for internal links
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Toggle mobile navigation
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile navigation when a link is clicked
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
        });
    });

    // Initialize theme and bind theme toggle
    UI.initTheme();
    UI.bindThemeToggle();
    UI.revealOnScroll();
    UI.setActiveNav();
});

(function(){
  const STORE_KEY = 'theme';
  function setTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORE_KEY, theme);
    // 테마 변경 이벤트(파티클 등에서 사용)
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }
  function initTheme(){
    const saved = localStorage.getItem(STORE_KEY);
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(saved || (prefersLight ? 'light' : 'dark'));
  }
  function bindThemeToggle(){
    const btn = document.getElementById('themeToggle');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }
  function revealOnScroll(root=document){
    const targets = Array.from(root.querySelectorAll('.reveal'));
    if (!targets.length) return;

    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if (e.isIntersecting){
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });

    targets.forEach(el => io.observe(el));
  }
  function setActiveNav(){
    const hash = location.hash || '#intro';
    document.querySelectorAll('.header-nav a, .nav__list a').forEach(a=>{
      const href = a.getAttribute('href') || '';
      const isAnchor = href.startsWith('/index.html#') || href.startsWith('#');
      const active = isAnchor ? href.endsWith(hash) : location.pathname.endsWith(href.split('/').pop()||'');
      a.classList.toggle('is-active', active);
    });
  }

  window.addEventListener('DOMContentLoaded', ()=> revealOnScroll());
  window.UI = { initTheme, bindThemeToggle, revealOnScroll, setActiveNav };
})();