(async function(){
  const target = document.getElementById('about-content');
  if (!target) return;

  function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // 아주 가벼운 마크다운 -> HTML 변환 (제목, 목록, 링크, 굵게)
  function mdToHtml(md){
    // 줄 단위 전처리
    const lines = md.replace(/\r\n?/g, '\n').split('\n');

    let html = '';
    let inList = false;
    const flushList = ()=>{ if(inList){ html += '</ul>'; inList=false; } };

    for (let raw of lines){
      const line = raw.trimEnd();

      // 제목 처리
      if (/^#{1,6}\s/.test(line)){
        flushList();
        const m = /^(#{1,6})\s+(.*)$/.exec(line);
        const level = m[1].length;
        const text = m[2];
        html += `<h${level}>${inline(text)}</h${level}>`;
        continue;
      }

      // 목록 처리
      if (/^-\s+/.test(line)){
        if (!inList){ html += '<ul>'; inList = true; }
        const item = line.replace(/^-+\s+/, '');
        html += `<li>${inline(item)}</li>`;
        continue;
      }

      // 빈 줄 처리
      if (line === ''){
        flushList();
        html += '<p></p>';
        continue;
      }

      // 줄바꿈 처리 (한 줄 끝에 두 개의 공백이 있는 경우)
      const withLineBreaks = line.replace(/ {2}$/, '<br>');

      flushList();
      html += `<p>${inline(withLineBreaks)}</p>`;
    }
    flushList();
    return html;
  }

  function inline(text){
    let s = escapeHtml(text);
    // 링크 [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    // 굵게 **text**
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 이탤릭 *text*
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return s;
  }

  try {
    const res = await fetch('../assets/content/about.md');
    const md = await res.text();
    target.innerHTML = mdToHtml(md);
    window.UI?.revealOnScroll?.();
  } catch (e){
    target.innerHTML = '<p class="muted">about.md를 불러오지 못했습니다.</p>';
    console.warn(e);
  }
})();