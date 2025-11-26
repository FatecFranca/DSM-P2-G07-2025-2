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

// --- Função para carregar receita da API ---
async function carregarReceita() {
    const urlParams = new URLSearchParams(window.location.search);
    const receitaId = urlParams.get('receita');
    
    if (!receitaId) {
        mostrarErro('ID da receita não fornecido.');
        return;
    }
    
    // Mostrar loading
    mostrarLoading();
    
    try {
        console.log('🔍 Iniciando carregamento da receita ID:', receitaId);
        
        // Verificar se apiService está disponível
        if (!window.apiService) {
            throw new Error('Serviço de API não disponível. Verifique se os scripts foram carregados corretamente.');
        }
        
        console.log('📡 Buscando receita na API...');
        // Buscar receita da API e restrições do usuário em paralelo
        const [response, userRestrictionsResponse] = await Promise.all([
            window.apiService.getRecipeById(receitaId),
            window.apiService.getUserRestrictions().catch(err => {
                console.warn('⚠️ Erro ao buscar restrições do usuário:', err);
                return { success: false, data: [] };
            })
        ]);
        
        console.log('✅ Resposta recebida da API:', response);
        
        // Verificar se a resposta é válida
        if (!response) {
            throw new Error('Resposta vazia da API.');
        }
        
        // A API retorna { success: true, data: {...} } ou diretamente { data: {...} }
        let receitaData = null;
        
        if (response.success !== undefined) {
            // Formato: { success: true, data: {...} }
            console.log('📦 Formato: { success, data }');
            if (!response.success) {
                throw new Error(response.message || 'Erro ao buscar receita na API.');
            }
            receitaData = response.data;
        } else if (response.data) {
            // Formato: { data: {...} }
            console.log('📦 Formato: { data }');
            receitaData = response.data;
        } else {
            // Pode ser que a resposta já seja os dados diretamente
            console.log('📦 Formato: dados diretos');
            receitaData = response;
        }
        
        console.log('📋 Dados da receita extraídos:', receitaData);
        
        if (!receitaData) {
            throw new Error('Dados da receita não encontrados na resposta da API.');
        }
        
        // Processar restrições do usuário
        let userRestrictionIds = new Set();
        if (userRestrictionsResponse && userRestrictionsResponse.success && userRestrictionsResponse.data) {
            userRestrictionsResponse.data.forEach(ur => {
                if (ur.restriction_id) {
                    userRestrictionIds.add(ur.restriction_id);
                }
            });
        }
        console.log('🔒 IDs das restrições do usuário:', Array.from(userRestrictionIds));
        
        // Remover loading
        removerLoading();
        
        // Mapear dados da API para o formato esperado
        console.log('🔄 Mapeando dados da receita...');
        const receita = mapearDadosReceita(receitaData, userRestrictionIds);
        console.log('✅ Receita mapeada:', receita);
        
        // Preencher a página com os dados
        console.log('🎨 Preenchendo página...');
        preencherReceita(receita);
        console.log('✅ Página preenchida com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar receita:', error);
        console.error('Stack trace:', error.stack);
        removerLoading();
        mostrarErro(error.message || 'Erro ao carregar receita. Tente novamente mais tarde.');
    }
}

// --- Função para mapear dados da API para o formato esperado ---
function mapearDadosReceita(receitaData, userRestrictionIds = new Set()) {
    // Processar ingredientes (pode ser array ou string JSON)
    let ingredientes = [];
    if (Array.isArray(receitaData.ingredientes)) {
        ingredientes = receitaData.ingredientes;
    } else if (typeof receitaData.ingredientes === 'string') {
        try {
            ingredientes = JSON.parse(receitaData.ingredientes);
        } catch {
            // Se não for JSON, tratar como string simples separada por vírgula
            ingredientes = receitaData.ingredientes.split(',').map(i => i.trim()).filter(i => i);
        }
    }
    
    // Processar modo de preparo (pode ser string ou array)
    let modoPreparo = [];
    if (Array.isArray(receitaData.modo_preparo)) {
        modoPreparo = receitaData.modo_preparo;
    } else if (typeof receitaData.modo_preparo === 'string') {
        const texto = receitaData.modo_preparo.trim();
        
        // Se já tem quebras de linha, usar isso
        if (texto.includes('\n')) {
            modoPreparo = texto
                .split(/\n+/)
                .map(passo => passo.trim())
                .filter(passo => passo.length > 0);
        } else {
            // Tentar dividir por padrões como "1.", "2.", etc.
            const passos = texto.split(/(?=\d+\.\s)|(?<=\.)\s+(?=[A-Z])/);
            modoPreparo = passos
                .map(passo => passo.trim().replace(/^\d+\.\s*/, ''))
                .filter(passo => passo.length > 0);
            
            // Se não conseguiu dividir bem, usar a string inteira como um único passo
            if (modoPreparo.length === 0 || modoPreparo.length === 1) {
                modoPreparo = [texto];
            }
        }
    }
    
    // Processar propriedades (pode ser array, objeto ou string)
    let propriedades = [];
    if (receitaData.propriedades) {
        if (Array.isArray(receitaData.propriedades)) {
            propriedades = receitaData.propriedades;
        } else if (typeof receitaData.propriedades === 'string') {
            try {
                const parsed = JSON.parse(receitaData.propriedades);
                propriedades = Array.isArray(parsed) ? parsed : [receitaData.propriedades];
            } catch {
                propriedades = [receitaData.propriedades];
            }
        } else if (typeof receitaData.propriedades === 'object') {
            propriedades = Object.values(receitaData.propriedades);
        }
    }
    
    // Se não houver propriedades, usar descrição como fallback ou deixar vazio
    if (propriedades.length === 0 && receitaData.descricao) {
        propriedades = [receitaData.descricao];
    }
    
    // Processar restrições com palavras-chave
    let restricoes = [];
    if (receitaData.restrictions && Array.isArray(receitaData.restrictions)) {
        restricoes = receitaData.restrictions.map(r => {
            const restrictionId = r.restriction?.id || r.restriction_id;
            const nomeRestricao = r.restriction?.nome || r.restricao_nome || 'Restrição desconhecida';
            const ingrediente = r.ingrediente_restritivo || '';
            
            // Verificar se o usuário tem esta restrição
            const usuarioTemRestricao = restrictionId && userRestrictionIds.has(restrictionId);
            
            // Obter palavras-chave
            let palavrasChave = [];
            if (r.restriction && r.restriction.palavras_chave) {
                palavrasChave = Array.isArray(r.restriction.palavras_chave) 
                    ? r.restriction.palavras_chave 
                    : (typeof r.restriction.palavras_chave === 'string' 
                        ? r.restriction.palavras_chave.split(',').map(k => k.trim()).filter(k => k)
                        : []);
            } else if (r.palavras_chave) {
                palavrasChave = Array.isArray(r.palavras_chave) 
                    ? r.palavras_chave 
                    : (typeof r.palavras_chave === 'string' 
                        ? r.palavras_chave.split(',').map(k => k.trim()).filter(k => k)
                        : []);
            }
            
            // Construir texto da restrição com ícone de alerta se o usuário tiver
            let textoRestricao = '';
            
            // Adicionar ícone de alerta se o usuário tiver esta restrição
            if (usuarioTemRestricao) {
                textoRestricao += '<span class="icone-alerta-restricao" aria-label="Você tem esta restrição">⚠️</span> ';
            }
            
            textoRestricao += `<strong>${nomeRestricao}</strong>`;
            
            if (ingrediente) {
                textoRestricao += `: ${ingrediente}`;
            }
            
            if (palavrasChave.length > 0) {
                textoRestricao += `<br><span style="font-size: 0.9em; color: #666; margin-left: 1rem;">Palavras-chave: ${palavrasChave.join(', ')}</span>`;
            }
            
            return {
                texto: textoRestricao,
                temAlerta: usuarioTemRestricao
            };
        });
        
        if (restricoes.length === 0) {
            restricoes = [{ texto: 'Nenhuma restrição identificada.', temAlerta: false }];
        }
    } else {
        restricoes = [{ texto: 'Nenhuma restrição identificada.', temAlerta: false }];
    }
    
    // Processar imagem
    let imagemUrl = '../Images/suco_detox.jpg'; // Imagem padrão
    if (receitaData.imagem_url) {
        if (receitaData.imagem_url.startsWith('http://') || receitaData.imagem_url.startsWith('https://')) {
            imagemUrl = receitaData.imagem_url;
        } else if (receitaData.imagem_url.startsWith('/')) {
            imagemUrl = `http://localhost:3001${receitaData.imagem_url}`;
        } else {
            imagemUrl = `http://localhost:3001/uploads/${receitaData.imagem_url}`;
        }
    }
    
    return {
        titulo: receitaData.nome || receitaData.titulo || 'Receita sem título',
        imagem: imagemUrl,
        ingredientes: ingredientes,
        modoPreparo: modoPreparo,
        tempo: {
            preparo: receitaData.tempo_preparo || 'Não informado',
            rendimento: receitaData.rendimento || 'Não informado'
        },
        propriedades: propriedades.length > 0 ? propriedades : ['Propriedades não informadas.'],
        restricoes: restricoes
    };
}

// --- Função para mostrar loading ---
function mostrarLoading() {
    const conteudo = document.querySelector('.conteudo-receita');
    if (conteudo) {
        // Salvar o HTML original se ainda não foi salvo
        if (!conteudo.dataset.originalHtml) {
            conteudo.dataset.originalHtml = conteudo.innerHTML;
        }
        // Mostrar loading sem remover a estrutura
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-receita';
        loadingDiv.style.cssText = 'text-align: center; padding: 40px; color: #666; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
        loadingDiv.textContent = 'Carregando receita...';
        
        // Adicionar overlay
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.9); z-index: 999;';
        conteudo.style.position = 'relative';
        conteudo.appendChild(overlay);
        conteudo.appendChild(loadingDiv);
    }
}

// --- Função para remover loading ---
function removerLoading() {
    const loadingDiv = document.getElementById('loading-receita');
    const overlay = document.getElementById('loading-overlay');
    if (loadingDiv) loadingDiv.remove();
    if (overlay) overlay.remove();
}

// --- Função para mostrar erro ---
function mostrarErro(mensagem) {
    const conteudo = document.querySelector('.conteudo-receita');
    if (conteudo) {
        // Remover loading se existir
        removerLoading();
        
        // Criar div de erro
        const erroDiv = document.createElement('div');
        erroDiv.id = 'erro-receita';
        erroDiv.style.cssText = 'text-align: center; padding: 40px; color: #c33; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; width: 90%;';
        erroDiv.innerHTML = `
            <p><strong>Erro ao carregar receita</strong></p>
            <p style="font-size: 0.9em; margin-top: 10px;">${mensagem}</p>
            <div style="margin-top: 20px;">
                <button onclick="goBack()" style="margin-right: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Voltar
                </button>
                <button onclick="location.reload()" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Tentar Novamente
                </button>
            </div>
        `;
        
        // Adicionar overlay
        const overlay = document.createElement('div');
        overlay.id = 'erro-overlay';
        overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.95); z-index: 999;';
        conteudo.style.position = 'relative';
        conteudo.appendChild(overlay);
        conteudo.appendChild(erroDiv);
    }
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
        const tempoContent = tempoEl.querySelector('p');
        if (tempoContent) {
            tempoContent.innerHTML = `
                Preparo: ${receita.tempo.preparo}<br>
                Rendimento: ${receita.tempo.rendimento}
            `;
        } else {
            tempoEl.innerHTML = `
                <h2>Tempo Estimado:</h2>
                <p>Preparo: ${receita.tempo.preparo}<br>Rendimento: ${receita.tempo.rendimento}</p>
            `;
        }
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
        // Processar restrições - pode ser array de strings ou array de objetos
        const restricoesHTML = receita.restricoes.map(item => {
            const texto = typeof item === 'string' ? item : item.texto;
            const temAlerta = typeof item === 'object' ? item.temAlerta : false;
            const classeAlerta = temAlerta ? ' restricao-com-alerta' : '';
            return `<li class="${classeAlerta}">${texto}</li>`;
        }).join('');
        
        if (restContent) {
            // Usar innerHTML para permitir formatação HTML (negrito, quebras de linha)
            restContent.innerHTML = restricoesHTML;
        } else {
            restricoesEl.innerHTML = `<h2>Restrições:</h2><ul>${restricoesHTML}</ul>`;
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

    // Carregar receita - aguardar um pouco para garantir que apiService está disponível
    setTimeout(() => {
        if (window.apiService) {
            carregarReceita();
        } else {
            console.error('apiService não disponível! Verifique se os scripts foram carregados corretamente.');
            mostrarErro('Serviço de API não disponível. Recarregue a página.');
        }
    }, 100);

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

    // Carregar foto de perfil no header
    setTimeout(() => {
        if (window.carregarFotoPerfilHeader) {
            carregarFotoPerfilHeader();
        }
    }, 100);
}

window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.goBack = goBack;

document.addEventListener('DOMContentLoaded', init);

