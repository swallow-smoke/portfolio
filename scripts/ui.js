// This file manages user interface interactions for the portfolio website.

// ── 1) 순수 DOM 이벤트 (스무스 스크롤 / 모바일 네비 토글) ──
document.addEventListener('DOMContentLoaded', function() {
  // Smooth scrolling for internal links
  const internalLinks = document.querySelectorAll('a[href^="#"]');
  internalLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || !targetId.startsWith('#')) return;
      const targetElement = document.querySelector(targetId);
      if (!targetElement) return;

      e.preventDefault();
      targetElement.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Toggle mobile navigation
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      navMenu.classList.toggle('active');
    });
  }

  // Close mobile navigation when a link is clicked
  const navLinks = document.querySelectorAll('.nav-menu a');
  navLinks.forEach(link => {
    link.addEventListener('click', function () {
      navMenu && navMenu.classList.remove('active');
    });
  });

  // ❌ 여기서는 더 이상 UI.initTheme / UI.setActiveNav 호출 안 함
});

// ── 2) 테마 / 스크롤 애니메이션 / 네비 상태 유틸 ──
(function () {
  const STORE_KEY = 'theme';

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORE_KEY, theme);
    // 테마 변경 이벤트(파티클 등에서 사용)
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  function initTheme() {
    const saved = localStorage.getItem(STORE_KEY);
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(saved || (prefersLight ? 'light' : 'dark'));
  }

  function bindThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }

  function revealOnScroll(root = document) {
    const targets = Array.from(root.querySelectorAll('.reveal'));
    if (!targets.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });

    targets.forEach(el => io.observe(el));
  }

  function setActiveNav() {
    const hash = location.hash || '#intro';
    document.querySelectorAll('.header-nav a, .nav__list a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const isAnchor = href.startsWith('/index.html#') || href.startsWith('#');
      const active = isAnchor
        ? href.endsWith(hash)
        : location.pathname.endsWith(href.split('/').pop() || '');
      a.classList.toggle('is-active', active);
    });
  }

  // 기본 리빌만 한 번 등록
  window.addEventListener('DOMContentLoaded', () => revealOnScroll());

  // 전역 UI 유틸 export
  // (main.js 에서 UI.initTheme(), UI.bindThemeToggle(), UI.setActiveNav() 호출)
  window.UI = { initTheme, bindThemeToggle, revealOnScroll, setActiveNav };
})();