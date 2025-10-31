(function () {
    const thumbs = document.querySelectorAll('.thumb');
    const hero = document.getElementById('heroPreview');
    const modal = document.getElementById('modal');
    const trailerFrame = document.getElementById('trailerFrame');
    const playTrigger = document.getElementById('playTrigger');
    const closeModalBtn = document.getElementById('closeModal');
    const langToggle = document.getElementById('languageToggle');
    const langList = document.getElementById('languageList');

    if (langToggle && langList) {
        langToggle.addEventListener('click', () => {
            langList.classList.toggle('show');
        });
    }

    thumbs.forEach(t => t.addEventListener('click', () => {
        thumbs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const src = t.getAttribute('data-src');
        hero.src = src;
    }));

    playTrigger.addEventListener('click', () => {
        trailerFrame.src = 'https://www.youtube.com/embed/Jt4XOPiPJHs?autoplay=1';
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    });

    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    function closeModal() {
        trailerFrame.src = '';
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    document.getElementById('buyBtn').addEventListener('click', () => {
        window.open('https://store.steampowered.com/app/526870/Satisfactory/', '_blank');
    });
    document.getElementById('buyLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://store.steampowered.com/app/526870/Satisfactory/', '_blank');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal.classList.contains('open')) closeModal();
        }
    }); 
    hero.addEventListener('click', () => {
        const largeImageModal = document.createElement('div');
        largeImageModal.classList.add('modal', 'open');
        largeImageModal.innerHTML = `
            <div class="box">
                <button class="close-circle" aria-label="닫기">✕</button>
                <img src="${hero.src}" alt="큰 미리보기" style="width:100%; height:100%; object-fit:contain;">
            </div>
        `;
        document.body.appendChild(largeImageModal);

        const closeLargeModal = () => {
            largeImageModal.classList.remove('open');
            setTimeout(() => largeImageModal.remove(), 300);
        };
        largeImageModal.querySelector('.close-circle').addEventListener('click', closeLargeModal);
        largeImageModal.addEventListener('click', (e) => {
            if (e.target === largeImageModal) closeLargeModal();
        });
    });
})();