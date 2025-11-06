// dlc만드는거!!!!
function getDLC(dlcObj) {
    const list = document.getElementById('dlc-list');
    list.innerHTML = '';
    if (!dlcObj) return;

    Object.entries(dlcObj).forEach(([category, arr]) => {
        if (!Array.isArray(arr) || arr.length === 0) return;
        const catBox = document.createElement('div');
        catBox.className = 'dlc-category-box';
        catBox.innerHTML = `
            <h2 class="dlc-category-title">${category.replace(/_/g, ' ')}</h2>
            <div class="dlc-category-list"></div>
        `;
        const catList = catBox.querySelector('.dlc-category-list');
        arr.forEach(dlc => {
            const card = document.createElement('div');
            card.className = 'dlc-card';
            card.innerHTML = `
                ${dlc.image ? `<img src="${dlc.image}" alt="${dlc.title || ''}" style="width:100%;border-radius:10px;margin-bottom:12px;object-fit:cover;height:120px;">` : ''}
                <div class="dlc-title">${dlc.title || ''}</div>
                <div class="dlc-desc">${dlc.desc || ''}</div>
                ${dlc.realsed ? `<div class="dlc-year">${dlc.realsed}</div>` : ''}
            `;
            card.onclick = () => {
                showDlcPopup(dlc);
            };
            catList.appendChild(card);
        });
        list.appendChild(catBox);
    });
}

// 팝업 함수 추가!!!!
function showDlcPopup(dlc) {
    const overlay = document.getElementById('dlc-popup-overlay');
    const content = document.getElementById('dlc-popup-content');
    content.innerHTML = `
        <button class="dlc-popup-close" id="dlc-popup-close">✕</button>
        ${dlc.image ? `<img src="${dlc.image}" alt="${dlc.title || ''}">` : ''}
        <div class="dlc-popup-title">${dlc.title || ''}</div>
        <div class="dlc-popup-desc">${dlc.desc || ''}</div>
        ${dlc.realsed ? `<div class="dlc-popup-year">${dlc.realsed} 출시</div>` : ''}
    `;
    overlay.classList.add('show');
    document.getElementById('dlc-popup-close').onclick = () => {
        overlay.classList.remove('show');
    };
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.classList.remove('show');
    };
}

// json처리!!!
fetch('./asset/dlc.json')
    .then(res => res.json())
    .then(json => {
        if (json.DLC) {
            getDLC(json.DLC);
        }
    })
    .catch(() => {
        alert('DLC 정보를 불러오지 못했습니다.\nVSCode Live Server로 실행 중인지 확인해주세요.(Fetch를 사용하기 때문입니당)');
    });