// ==================== SELETORES PRINCIPAIS ====================
const body = document.body;
const btnMenu = document.getElementById('btn_menu_vertical');
const menu = document.getElementById('menu_vertical');
const overlay = document.getElementById('overlay');
const btnVoltar = document.getElementById('btn_voltar');
const menuLinks = menu ? Array.from(menu.querySelectorAll('a')) : [];

// Seletores específicos do perfil
const btnEditar = document.getElementById('btn-editar');
const btnSalvar = document.getElementById('btn-salvar');
const btnAdicionar = document.getElementById('btn-adicionar');
const btnSair = document.getElementById('btn-sair');
const popupSair = document.getElementById('popup-sair');
const formDadosUsuario = document.getElementById('dados-usuario');

// ==================== FUNÇÕES DO MENU ====================
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

function goBack() {
    if (history.length > 1) history.back();
    else window.location.href = '/'; 
}

// ==================== FUNÇÕES DO PERFIL ====================

// Ativar modo de edição
function ativarEdicao() {
    body.classList.add('modo-edicao');
    
    // Tornar campos editáveis
    const campos = document.querySelectorAll('.campo-valor');
    campos.forEach(campo => {
        campo.removeAttribute('readonly');
    });

    // Mostrar inputs de email e senha
    document.getElementById('email-usu').removeAttribute('hidden');
    document.getElementById('senha-usu').removeAttribute('hidden');
}

// Salvar edições
function salvarEdicao() {
    let valido = true;

    // Validação do telefone
    const telefone = document.getElementById('telefone-usu');
    if (telefone.value !== 'Não adicionado' && telefone.value.trim() !== '') {
        const telefoneRegex = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;
        if (!telefoneRegex.test(telefone.value)) {
            telefone.classList.add('invalido');
            valido = false;
        } else {
            telefone.classList.remove('invalido');
        }
    } else {
        telefone.classList.remove('invalido');
    }

    // Validação da idade
    const idade = document.getElementById('idade-usu');
    if (idade.value !== 'Não adicionado' && idade.value.trim() !== '') {
        const idadeTexto = idade.value.replace(/\D/g, ''); // Remove não-dígitos
        const idadeNum = parseInt(idadeTexto);
        if (isNaN(idadeNum) || idadeNum < 0 || idadeNum > 150) {
            idade.classList.add('invalido');
            valido = false;
        } else {
            idade.classList.remove('invalido');
        }
    } else {
        idade.classList.remove('invalido');
    }

    // Validação do email
    const email = document.getElementById('email-usu');
    if (!email.hidden && email.value.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value)) {
            email.classList.add('invalido');
            valido = false;
        } else {
            email.classList.remove('invalido');
        }
    }

    if (valido) {
        // Atualizar display do email
        const emailInfo = document.getElementById('email-info');
        const emailValor = document.getElementById('email-usu').value;
        const senhaValor = document.getElementById('senha-usu').value;
        
        emailInfo.innerHTML = `
            E-mail: ${emailValor}<br>
            Senha: ${senhaValor}<br>
            Verificação de email: Não verificado
        `;

        // Desativar modo de edição
        body.classList.remove('modo-edicao');
        
        // Tornar campos não editáveis novamente
        const campos = document.querySelectorAll('.campo-valor');
        campos.forEach(campo => {
            campo.setAttribute('readonly', 'readonly');
        });

        // Ocultar inputs de email e senha
        document.getElementById('email-usu').setAttribute('hidden', 'hidden');
        document.getElementById('senha-usu').setAttribute('hidden', 'hidden');

        console.log('Dados salvos com sucesso!');
        
        alert('Perfil atualizado com sucesso!');
    } else {
        alert('Por favor, corrija os campos inválidos antes de salvar.');
    }
}

// Editar nome do usuário
function editarNome() {
    const nomeElemento = document.getElementById('nome-usuario');
    const novoNome = prompt('Digite o novo nome:', nomeElemento.textContent);
    if (novoNome && novoNome.trim() !== '') {
        nomeElemento.textContent = novoNome.trim();
        
        // Aqui você enviaria o novo nome para o backend
        console.log('Nome alterado para:', novoNome.trim());
    }
}

// Editar restrições
function editarRestricoes() {
    const restricoesValor = document.getElementById('restricoes-valor');
    const restricoesInput = document.getElementById('restricoes-usu');
    
    const novasRestricoes = prompt(
        'Digite as novas palavras-chave das restrições (separadas por vírgula):',
        restricoesInput.value
    );
    
    if (novasRestricoes !== null && novasRestricoes.trim() !== '') {
        restricoesValor.textContent = novasRestricoes.trim();
        restricoesInput.value = novasRestricoes.trim();
        
        // Aqui você enviaria as restrições para o backend
        console.log('Restrições alteradas para:', novasRestricoes.trim());
    }
}

// Abrir pop-up de confirmação de saída
function abrirPopupSair() {
    popupSair.classList.add('ativo');
}

// Fechar pop-up de saída
function fecharPopupSair() {
    popupSair.classList.remove('ativo');
}

// Confirmar saída da conta
function confirmarSair() {
    // Aqui você implementaria a lógica de logout
    console.log('Usuário saiu da conta');
    
    alert('Saindo da conta...');
    // Redirecionar para login (ajuste o caminho conforme necessário)
    // window.location.href = '../Paginas/login.html';
}

// Adicionar nova conta
function adicionarConta() {
    // Redirecionar para página de cadastro
    console.log('Redirecionar para adicionar nova conta');
    alert('Redirecionando para cadastro de nova conta...');
    // Descomente e ajuste o caminho quando tiver a página:
    // window.location.href = '../Paginas/cadastro.html';
}

// Abrir receita específica
function abrirReceita() {
    // Redirecionar para página da receita
    alert('Abrindo receita....');
    window.location.href = './visualizacao-receita.html';
}

// ==================== EFEITOS VISUAIS ====================
// Aplica listeners para adicionar/remover classes .hovered e .pressed
function attachInteractiveEffects(element) {
    if (!element) return;

    // Hover em desktop (mouseenter / mouseleave)
    element.addEventListener('mouseenter', () => element.classList.add('hovered'));
    element.addEventListener('mouseleave', () => {
        element.classList.remove('hovered');
        element.classList.remove('pressed');
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

// ==================== INICIALIZAÇÃO ====================
function init() {
    // Attach aos botões principais do header
    attachInteractiveEffects(btnMenu);
    attachInteractiveEffects(btnVoltar);
    attachInteractiveEffects(btnPerfil);

    // Attach aos botões do perfil
    attachInteractiveEffects(btnEditar);
    attachInteractiveEffects(btnSalvar);
    attachInteractiveEffects(btnAdicionar);
    attachInteractiveEffects(btnSair);

    // Attach aos botões do popup
    const btnCancelar = document.querySelector('.btn-cancelar');
    const btnConfirmarSair = document.querySelector('.btn-confirmar-sair');
    attachInteractiveEffects(btnCancelar);
    attachInteractiveEffects(btnConfirmarSair);

    // Attach nos links do menu
    menuLinks.forEach(a => attachInteractiveEffects(a));

    // Attach nos cards de receitas
    const receitaCards = document.querySelectorAll('.receita-card');
    receitaCards.forEach(card => attachInteractiveEffects(card));

    // Fechar menu ao clicar no overlay
    overlay.addEventListener('click', closeMenu);

    // Fechar menu com Escape
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
            if (menu.classList.contains('active')) {
                closeMenu();
            }
            if (popupSair.classList.contains('ativo')) {
                fecharPopupSair();
            }
        }
    });

    // Fechar popup ao clicar fora dele
    popupSair.addEventListener('click', function(e) {
        if (e.target === popupSair) {
            fecharPopupSair();
        }
    });

    // Garante que o overlay esteja consistente no carregamento
    if (!menu.classList.contains('active')) {
        overlay.hidden = true;
        overlay.classList.remove('active');
        body.classList.remove('menu-open');
        btnMenu.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
    }

    // Garante que o modo de edição esteja desativado
    body.classList.remove('modo-edicao');

    // Carregar receitas do usuário (exemplo)
    carregarReceitas();
}

// ==================== CARREGAR RECEITAS ====================
function carregarReceitas() {
    console.log('Receitas carregadas (exemplo estático)');
}

// ==================== EXPOR FUNÇÕES GLOBAIS ====================
window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.goBack = goBack;
window.ativarEdicao = ativarEdicao;
window.salvarEdicao = salvarEdicao;
window.editarNome = editarNome;
window.editarRestricoes = editarRestricoes;
window.abrirPopupSair = abrirPopupSair;
window.fecharPopupSair = fecharPopupSair;
window.confirmarSair = confirmarSair;
window.adicionarConta = adicionarConta;
window.abrirReceita = abrirReceita;

// ==================== INICIALIZAR AO CARREGAR ====================
document.addEventListener('DOMContentLoaded', init);