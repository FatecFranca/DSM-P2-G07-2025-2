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

// --- Função para abrir receita ---
function abrirReceita(receitaId) {
    // Mapeamento de IDs de receitas para dados
    const receitas = {
        'torrada-queijo-tomate': 'torrada-queijo-tomate',
        'panqueca-frutas-vermelhas': 'panqueca-frutas-vermelhas',
        'suco-detox': 'suco-detox',
        'carbonara': 'carbonara',
        'feijoada': 'feijoada',
        'sopa-abobora': 'sopa-abobora',
        'arroz-carreteiro': 'arroz-carreteiro',
        'bolo-cenoura': 'bolo-cenoura',
        'caipirinha': 'caipirinha',
        'pao-de-queijo': 'pao-de-queijo'
    };

    // Redirecionar para página de visualização com parâmetro
    window.location.href = `visualizacao-receita.html?receita=${receitaId}`;
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

    // Adicionar event listeners aos cards de receita
    const cardsReceita = document.querySelectorAll('.card-receita');
    cardsReceita.forEach((card) => {
        const receitaId = card.getAttribute('data-receita-id');
        if (receitaId) {
            card.addEventListener('click', () => abrirReceita(receitaId));
            card.style.cursor = 'pointer';
        }
    });

    // --- Funcionalidade de busca ---
    const campoPesquisa = document.getElementById('campo-pesquisa');
    const gridReceitas = document.getElementById('grid-receitas');
    const nenhumResultado = document.getElementById('nenhum-resultado');
    const resultadoBusca = document.getElementById('resultado-busca');
    const termoBuscado = document.getElementById('termo-buscado');
    const tituloSecao = document.getElementById('titulo-secao');

    function realizarBusca() {
        const termoPesquisa = campoPesquisa.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.card-receita');
        let encontrados = 0;

        cards.forEach((card) => {
            const nomeReceita = card.querySelector('.nome-receita').textContent.toLowerCase();
            
            // Verifica se o termo está no nome da receita (busca parcial)
            if (termoPesquisa === '' || nomeReceita.includes(termoPesquisa)) {
                card.style.display = 'flex';
                encontrados++;
            } else {
                card.style.display = 'none';
            }
        });

        // Mostrar/ocultar mensagens e elementos
        if (termoPesquisa === '') {
            // Sem busca - mostrar tudo normalmente
            tituloSecao.style.display = 'block';
            resultadoBusca.style.display = 'none';
            nenhumResultado.style.display = 'none';
            gridReceitas.style.display = 'grid';
        } else if (encontrados === 0) {
            // Nenhum resultado encontrado
            tituloSecao.style.display = 'none';
            resultadoBusca.style.display = 'block';
            termoBuscado.textContent = termoPesquisa + '...';
            nenhumResultado.style.display = 'flex';
            gridReceitas.style.display = 'none';
        } else {
            // Resultados encontrados
            tituloSecao.style.display = 'none';
            resultadoBusca.style.display = 'block';
            termoBuscado.textContent = termoPesquisa + '...';
            nenhumResultado.style.display = 'none';
            gridReceitas.style.display = 'grid';
        }
    }

    // Event listener para busca em tempo real
    if (campoPesquisa) {
        campoPesquisa.addEventListener('input', realizarBusca);
        campoPesquisa.addEventListener('keyup', realizarBusca);
    }

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

window.abrirReceita = abrirReceita;

window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.goBack = goBack;

document.addEventListener('DOMContentLoaded', init);
