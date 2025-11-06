(function(){
    function toast(msg){
      const t = document.createElement('div');
      t.textContent = msg;
      Object.assign(t.style, {
        position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)',
        background:'var(--card)', color:'var(--text)', border:'1px solid var(--border)',
        padding:'8px 12px', borderRadius:'10px', boxShadow:'var(--shadow)', zIndex:'9999'
      });
      document.body.appendChild(t);
      setTimeout(()=>{ t.remove(); }, 1400);
    }
    document.addEventListener('DOMContentLoaded', () => {
      // 복사 버튼
      document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-copy]');
        if (!btn) return;
        const text = btn.getAttribute('data-copy') || '';
        try {
          await navigator.clipboard.writeText(text);
          const prev = btn.textContent;
          btn.textContent = '복사됨';
          btn.disabled = true;
          setTimeout(() => { btn.textContent = prev; btn.disabled = false; }, 1200);
        } catch {
          // clipboard 미지원일 때 대체
          const prev = btn.textContent;
          btn.textContent = '복사 실패';
          setTimeout(() => { btn.textContent = prev; }, 1200);
        }
      });
    
      // 파일 업데이트 시간 표시
      const el = document.getElementById('contact-updated');
      if (el) {
        try {
          fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
            .then(res => res.headers.get('last-modified'))
            .then(ts => { if (ts) el.textContent = new Date(ts).toLocaleString(); });
        } catch {}
      }
    });
  })();