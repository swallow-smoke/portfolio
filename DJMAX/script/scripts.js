// 사이드바!!!!
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const mainContent = document.getElementById('main-content');
const sidebarBg = document.getElementById('sidebar-bg');

sidebarToggle.onclick = () => {
    if (sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
        sidebar.classList.add('hide');
        sidebarToggle.style.left = '30px';
        mainContent.classList.remove('sidebar-open', 'sidebar-blur');
        sidebarBg.classList.remove('show');
    } else {
        sidebar.classList.remove('hide');
        sidebar.classList.add('show');
        sidebarToggle.style.left = '250px';
        mainContent.classList.add('sidebar-open', 'sidebar-blur');
        sidebarBg.classList.add('show');
    }
};

// 사이드바 바깥 클릭 시 닫힘!!
sidebarBg.onclick = () => {
    sidebar.classList.remove('show');
    sidebar.classList.add('hide');
    sidebarToggle.style.left = '30px';
    mainContent.classList.remove('sidebar-open', 'sidebar-blur');
    sidebarBg.classList.remove('show');
};

// 브랜드 소개 오버레이!!!!
const openIntro = document.getElementById('open-intro');
const closeBtn = document.getElementById('close-intro-btn');
const overlay = document.getElementById('intro-overlay');

openIntro.onclick = (e) => {
    e.preventDefault();
    mainContent.classList.add('fade-out');
    overlay.classList.add('show');
};
closeBtn.onclick = () => {
    mainContent.classList.remove('fade-out');
    overlay.classList.remove('show');
};