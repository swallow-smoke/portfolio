(function(){
  const TAU = Math.PI * 2;

  const palette = (theme) => theme === 'light'
    ? { dot: 'rgba(124,58,237,.40)', line: 'rgba(124,58,237,.10)' }  // 라이트: 연한 보라
    : { dot: 'rgba(167,139,250,.55)', line: 'rgba(124,58,237,.12)' }; // 다크: 은은한 보라

  function currentTheme(){
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function init(canvas){
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, points = [], running = true;
    let colors = palette(currentTheme());

    const cfg = { max: 80, radius: 1.5, speed: .22, link: 110, dpr: Math.min(devicePixelRatio||1, 2) };

    function resize(){
      const rect = canvas.getBoundingClientRect();
      w = Math.floor(rect.width * cfg.dpr);
      h = Math.floor(rect.height * cfg.dpr);
      canvas.width = w; canvas.height = h;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const area = rect.width * rect.height;
      const count = Math.min(cfg.max, Math.max(26, Math.floor(area / 14000)));
      points = Array.from({length: count}, ()=> spawn(rect.width, rect.height)).map(p=>{
        p.x*=cfg.dpr; p.y*=cfg.dpr; p.vx*=cfg.dpr; p.vy*=cfg.dpr; return p;
      });
    }
    function spawn(wCSS, hCSS){
      const angle = Math.random() * TAU;
      const speed = cfg.speed + Math.random() * cfg.speed;
      return { x: Math.random()*wCSS, y: Math.random()*hCSS, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed };
    }

    function step(){
      if (!running) return;
      ctx.clearRect(0,0,w,h);

      for (const p of points){
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }

      // lines
      for (let i=0;i<points.length;i++){
        for (let j=i+1;j<points.length;j++){
          const a = points[i], b = points[j];
          const dx=a.x-b.x, dy=a.y-b.y, dist=Math.hypot(dx,dy);
          if (dist < cfg.link*cfg.dpr){
            const t = 1 - dist/(cfg.link*cfg.dpr);
            ctx.strokeStyle = colors.line;
            ctx.globalAlpha = Math.max(.06, t*.5);
            ctx.lineWidth = Math.max(.4*cfg.dpr, t);
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      // dots
      ctx.fillStyle = colors.dot;
      for (const p of points){
        ctx.beginPath(); ctx.arc(p.x, p.y, cfg.radius*cfg.dpr, 0, TAU); ctx.fill();
      }

      requestAnimationFrame(step);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    document.addEventListener('visibilitychange', ()=>{
      running = document.visibilityState !== 'hidden';
      if (running) requestAnimationFrame(step);
    });

    // 테마 변경 시 즉시 색상 교체
    window.addEventListener('themechange', (e)=>{ colors = palette(e.detail?.theme || currentTheme()); });

    resize();
    requestAnimationFrame(step);
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    const cvs = document.getElementById('particles');
    if (cvs) init(cvs);
  });
})();