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
    else window.location.href = 'Tela_6 - receitas.html';
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

// --- Banco de dados de receitas ---
const receitasData = {
    'suco-detox': {
        titulo: 'Suco detox: Limão, gengibre e abacaxi.',
        imagem: '../Images/suco_detox.jpg',
        ingredientes: [
            '200 g de abacaxi fresco, sem casca e sem o miolo (equivalente a 2 fatias médias)',
            'Suco de 1 limão típico (± 30 ml suco de ½ a 1 limão, conforme o tamanho e a acidez desejada)',
            '20 g de gengibre fresco, raspado ou picado (cerca de 1 colher de sopa)',
            '300-350 ml de água gelada ou água de coco, para dar volume e refrescar',
            'Gelo a gosto (opcional)',
            'Mel ou adoçante natural opcional, se preferir mais doce (1 colher de chá máx.)'
        ],
        modoPreparo: [
            'Corte o abacaxi em pedaços e coloque no liquidificador.',
            'Adicione o gengibre fresco e o suco de limão.',
            'Acrescente a água gelada (ou água de coco) e, se desejar, o mel ou adoçante natural.',
            'Bata bem até obter uma mistura homogênea, cerca de 1 a 2 minutos.',
            'Caso se queira a bebida mais lisa (opcional: algumas fibras deixam o suco mais nutritivo).',
            'Sirva com gelo, se preferir bem gelado.'
        ],
        tempo: {
            preparo: '~5 a 10 minutos',
            rendimento: '~1 copo de 400 ml'
        },
        propriedades: [
            'Abacaxi: rico em bromelina e vitamina C, auxilia na digestão e tem ação anti-inflamatória.',
            'Limão: rico em vitamina C, contribui para a imunidade e detoxificação.',
            'Gengibre: anti-inflamatório, pode melhorar a digestão e acelerar o metabolismo.'
        ],
        restricoes: [
            'Essa receita contém: Abacaxi, limão, gengibre, água, adoçantes artificiais, água de coco.'
        ]
    },
    'torrada-queijo-tomate': {
        titulo: 'Torrada caseira com recheio de queijo coalho e tomate',
        imagem: '../Images/torrada_queijo_tomate.jpg',
        ingredientes: ['Em desenvolvimento'],
        modoPreparo: ['Em desenvolvimento'],
        tempo: { preparo: '~10 min', rendimento: '1 porção' },
        propriedades: ['Em desenvolvimento'],
        restricoes: ['Em desenvolvimento']
    },
    // Adicione outras receitas conforme necessário
};

// --- Função para carregar receita ---
function carregarReceita() {
    const urlParams = new URLSearchParams(window.location.search);
    const receitaId = urlParams.get('receita') || 'suco-detox';
    
    const receita = receitasData[receitaId];
    
    if (!receita) {
        // Se a receita não existir, carrega a padrão
        const receitaPadrao = receitasData['suco-detox'];
        preencherReceita(receitaPadrao);
        return;
    }
    
    preencherReceita(receita);
}

function preencherReceita(receita) {
    // Preencher título
    const tituloEl = document.querySelector('.titulo-receita');
    if (tituloEl) tituloEl.textContent = receita.titulo;
    
    // Preencher imagem
    const imgEl = document.querySelector('.imagem-receita img');
    if (imgEl) {
        imgEl.src = receita.imagem;
        imgEl.alt = receita.titulo;
    }
    
    // Preencher ingredientes
    const ingredientesEl = document.querySelector('.bloco-ingredientes ul');
    if (ingredientesEl && receita.ingredientes) {
        ingredientesEl.innerHTML = receita.ingredientes.map(item => `<li>${item}</li>`).join('');
    }
    
    // Preencher modo de preparo
    const modoEl = document.querySelector('.bloco-modo-preparo ol');
    if (modoEl && receita.modoPreparo) {
        modoEl.innerHTML = receita.modoPreparo.map(item => `<li>${item}</li>`).join('');
    }
    
    // Preencher tempo
    const tempoEl = document.querySelector('.bloco-tempo');
    if (tempoEl && receita.tempo) {
        const tempoContent = tempoEl.querySelector('p') || tempoEl;
        tempoContent.innerHTML = `
            <strong>Preparação:</strong> ${receita.tempo.preparo}<br>
            <strong>Rendimento:</strong> ${receita.tempo.rendimento}
        `;
    }
    
    // Preencher propriedades
    const propriedadesEl = document.querySelector('.bloco-propriedades');
    if (propriedadesEl && receita.propriedades) {
        const propContent = propriedadesEl.querySelector('ul');
        if (propContent) {
            propContent.innerHTML = receita.propriedades.map(item => `<li>${item}</li>`).join('');
        } else {
            propriedadesEl.innerHTML = `<h2>Propriedades:</h2><ul>${receita.propriedades.map(item => `<li>${item}</li>`).join('')}</ul>`;
        }
    }
    
    // Preencher restrições
    const restricoesEl = document.querySelector('.bloco-restricoes');
    if (restricoesEl && receita.restricoes) {
        const restContent = restricoesEl.querySelector('ul');
        if (restContent) {
            restContent.innerHTML = receita.restricoes.map(item => `<li>${item}</li>`).join('');
        } else {
            restricoesEl.innerHTML = `<h2>Restrições:</h2><ul>${receita.restricoes.map(item => `<li>${item}</li>`).join('')}</ul>`;
        }
    }
    
    // Atualizar título da página
    document.title = `Safe Bite - ${receita.titulo}`;
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

    // Carregar receita
    carregarReceita();

    // Ao redimensionar a janela
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

