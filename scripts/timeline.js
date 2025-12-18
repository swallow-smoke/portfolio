(function () {
    async function loadTimeline() {
      const container = document.getElementById('timeline-list');
      if (!container) return;
  
      try {
        const res = await fetch('assets/data/timeline.json?_=' + Date.now(), {
          cache: 'no-store'
        });
        if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
        const items = await res.json();
  
        if (!Array.isArray(items) || items.length === 0) {
          container.innerHTML = '<p class="muted">아직 등록된 타임라인이 없습니다.</p>';
          return;
        }
  
        container.innerHTML = items
          .map(item => {
            const year = item.year || '';
            const title = item.title || '';
            const subtitle = item.subtitle || '';
            const details = item.details || '';
  
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
                </div>
              </article>
            `;
          })
          .join('');
      } catch (err) {
        console.error('타임라인 로드 실패:', err);
        container.innerHTML = '<p class="muted">타임라인을 불러오는 중 오류가 발생했습니다.</p>';
      }
    }
  
    document.addEventListener('DOMContentLoaded', loadTimeline);
  })();