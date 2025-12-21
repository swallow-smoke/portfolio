(function () {
  async function loadTimeline() {
    const el = document.getElementById('timeline-list');
    if (!el) return;
    try {
      const res = await fetch('assets/data/timeline.json?ts=' + Date.now(), { cache: 'no-store' });
      const items = await res.json();
      if (!Array.isArray(items) || !items.length) {
        el.innerHTML = '<p class="muted">아직 등록된 타임라인이 없습니다.</p>';
        return;
      }
      el.innerHTML = items.map(item=>{
        const year = item.year || '';
        const title = item.title || '';
        const subtitle = item.subtitle || '';
        const details = item.details || '';
        const links = Array.isArray(item.links) ? item.links : [];
        const linksHTML = links.length
          ? `<div class="timeline__links">` +
            links.map(l=>`<a class="timeline__link" href="${l.url}" target="_blank" rel="noopener">${l.label||'Link'}</a>`).join('') +
            `</div>`
          : '';
        return `
          <article class="timeline__item">
            <div class="timeline__dot"></div>
            <div class="timeline__content">
              <div class="timeline__meta">
                <span class="timeline__year">${year}</span>
                ${subtitle ? `<span class="timeline__subtitle">${subtitle}</span>` : ''}
              </div>
              <h3 class="timeline__title">${title}</h3>
              ${details ? `<p class="timeline__details">${details}</p>` : ''}
              ${linksHTML}
            </div>
          </article>`;
      }).join('');
    } catch(e){
      console.error(e);
      el.innerHTML = '<p class="muted">타임라인을 불러오는 중 오류가 발생했습니다.</p>';
    }
  }
  document.addEventListener('DOMContentLoaded', loadTimeline);
})();