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

    element.addEventListener('mouseenter', () => element.classList.add('hovered'));
    element.addEventListener('mouseleave', () => {
        element.classList.remove('hovered');
        element.classList.remove('pressed'); 
    });

    element.addEventListener('mousedown', () => element.classList.add('pressed'));
    element.addEventListener('mouseup', () => element.classList.remove('pressed'));

    element.addEventListener('touchstart', () => element.classList.add('pressed'), {passive: true});
    element.addEventListener('touchend', () => {
        element.classList.remove('pressed');
        element.classList.remove('hovered');
    }, {passive: true});
}

// --- Inicialização ---
function init() {
    attachInteractiveEffects(btnMenu);
    attachInteractiveEffects(btnVoltar);
    attachInteractiveEffects(btnPerfil);

    menuLinks.forEach(a => attachInteractiveEffects(a));

    overlay.addEventListener('click', closeMenu);

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

function abrirRegistroReceita() {
    window.location.href = "Tela_7.2 - registro-receita.html";
}
window.abrirRegistroReceita = abrirRegistroReceita;

const popupReceita = document.getElementById('popup-receita');

// Função para abrir o popup
function abrirPopupReceita() {
  popupReceita.classList.add('ativo');
}

// Função para fechar o popup
function fecharPopupReceita() {
  popupReceita.classList.remove('ativo');
}

// Fechar popup ao clicar fora da caixa
popupReceita.addEventListener('click', function (event) {
  // Se o clique for no fundo escuro (overlay) e não dentro do popup, fecha
  if (event.target === popupReceita) {
    fecharPopupReceita();
  }
});

// Ações dos botões
function visualizarReceita() {
  fecharPopupReceita();
  window.location.href = "visualizacao-receita.html";
}

function editarReceita() {
  fecharPopupReceita();
  alert("(ainda não implementado)");
}

const popupConfirmarExclusao = document.getElementById('popup-confirmar-exclusao');

// Atualiza a função do primeiro pop-up
function excluirReceita() {
  fecharPopupReceita(); // fecha o pop-up das opções
  setTimeout(() => {
    abrirPopupExcluir(); // abre o pop-up de confirmação
  }, 250); // pequeno delay para uma transição mais suave
}

// Abre o novo pop-up de confirmação
function abrirPopupExcluir() {
  popupConfirmarExclusao.classList.add('ativo');
}

// Fecha o novo pop-up de exclusão
function fecharPopupExcluir() {
  popupConfirmarExclusao.classList.remove('ativo');
}

// Fecha ao clicar fora do pop-up
popupConfirmarExclusao.addEventListener('click', function (event) {
  if (event.target === popupConfirmarExclusao) {
    fecharPopupExcluir();
  }
});

// Torna as novas funções acessíveis globalmente
window.abrirPopupExcluir = abrirPopupExcluir;
window.fecharPopupExcluir = fecharPopupExcluir;

// Torna as funções acessíveis globalmente
window.abrirPopupReceita = abrirPopupReceita;
window.fecharPopupReceita = fecharPopupReceita;
window.visualizarReceita = visualizarReceita;
window.editarReceita = editarReceita;
window.excluirReceita = excluirReceita;

document.addEventListener('DOMContentLoaded', init);
