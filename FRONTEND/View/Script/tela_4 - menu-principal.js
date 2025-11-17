// --- Seletores principais ---
const body = document.body;
const btnMenu = document.getElementById('btn_menu_vertical');
const menu = document.getElementById('menu_vertical');
const overlay = document.getElementById('overlay');
const btnVoltar = document.getElementById('btn_voltar');
const menuLinks = menu ? Array.from(menu.querySelectorAll('a')) : [];
const btnPerfil = document.getElementById('btn_perfil');

// --- Funções de abertura/fechamento do menu ---
function openMenu() {
    if (!menu) return;
    menu.classList.add('active');
    overlay.classList.add('active');
    overlay.hidden = false;
    body.classList.add('menu-open');
    btnMenu.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
}

function closeMenu() {
    if (!menu) return;
    menu.classList.remove('active');
    overlay.classList.remove('active');
    overlay.hidden = true;
    body.classList.remove('menu-open');
    btnMenu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
}

function toggleMenu() {
    if (menu.classList.contains('active')) closeMenu();
    else openMenu();
}

// --- Função voltar ---
function goBack() {
    if (history.length > 1) history.back();
    else window.location.href = '/'; // fallback para raiz
}

function perfilClick() {
    window.location.href = 'tela_9 - perfil.html';
}
window.perfilClick = perfilClick;


// --- Efeitos de hover / press controlados por JS ---
function attachInteractiveEffects(element) {
    if (!element) return;

    // Hover em desktop (mouseenter / mouseleave)
    element.addEventListener('mouseenter', () => element.classList.add('hovered'));
    element.addEventListener('mouseleave', () => {
        element.classList.remove('hovered');
        element.classList.remove('pressed'); // remove pressed se ainda estiver
    });

    // Press / release
    element.addEventListener('mousedown', () => element.classList.add('pressed'));
    element.addEventListener('mouseup', () => element.classList.remove('pressed'));

    // Touch support (mobile)
    element.addEventListener('touchstart', () => element.classList.add('pressed'), {passive: true});
    element.addEventListener('touchend', () => {
        element.classList.remove('pressed');
        element.classList.remove('hovered');
    }, {passive: true});
}

// --- Inicialização ---
function init() {
    // Attach aos botões principais
    attachInteractiveEffects(btnMenu);
    attachInteractiveEffects(btnVoltar);
    attachInteractiveEffects(btnPerfil);


    // Attach nos links do menu para efeito visual
    menuLinks.forEach(a => attachInteractiveEffects(a));

    // Fechar menu ao clicar no overlay (já ligado via onclick no HTML)
    overlay.addEventListener('click', closeMenu);

    // Fechar menu com Escape
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
            if (menu.classList.contains('active')) {
                closeMenu();
            }
        }
    });

    // Ao redimensionar a janela, opcionalmente fechar o menu em larguras pequenas para evitar inconsistências
    window.addEventListener('resize', () => {
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    });

    // Garante que o overlay hidden esteja consistente no carregamento
    if (!menu.classList.contains('active')) {
        overlay.hidden = true;
        overlay.classList.remove('active');
        body.classList.remove('menu-open');
        btnMenu.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
    }
}

window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.goBack = goBack;

document.addEventListener('DOMContentLoaded', init);
