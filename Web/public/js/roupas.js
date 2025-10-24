// public/js/roupas.js

console.log("Script roupas.js carregado."); 

// O listener DOMContentLoaded garante que o script só rode depois que todos os elementos HTML existam.
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded disparado no roupas.js.");

    // --- 1. REFERÊNCIAS ESSENCIAIS DO MODAL E FORMULÁRIO ---
    const modal = document.getElementById('modal-cadastro');
    const btnAbrir = document.getElementById('btn-abrir-modal');
    const btnFechar = document.getElementById('btn-fechar-modal');
    const form = document.getElementById('form-roupa');
    const modalTitulo = document.getElementById('modal-titulo');
    const btnSubmit = document.getElementById('btn-submit');
    const itemId = document.getElementById('item-id');
    const dataContainer = document.getElementById('item-data-container');
    
    // Verificação de depuração
    if (!modal || !form || !modalTitulo || !btnSubmit || !dataContainer || !itemId) {
        console.error("Erro: Um ou mais elementos essenciais do DOM para o modal não foram encontrados. As funcionalidades de Cadastro/Edição podem falhar.");
        // Não retorna, mas as funções que usam esses elementos farão as verificações necessárias
    }
    
    // --- 2. FUNÇÃO AUXILIAR: PARSEAR DADOS DO ITEM DE EDIÇÃO ---
    function parseItemData() {
        if (!dataContainer) return null;

        let itemData = dataContainer.getAttribute('data-item');
        if (itemData && itemData !== 'null') {
             try {
                 // Tenta parsear JSON puro
                 return JSON.parse(itemData);
             } catch (e) {
                 // Fallback para caracteres HTML de escape, comum no EJS
                 itemData = itemData.replace(/&#34;/g, '"').replace(/&#39;/g, "'");
                 try {
                     return JSON.parse(itemData);
                 } catch (e) {
                     console.error("Erro ao parsear JSON do item para edição:", e);
                     return null; 
                 }
             }
        }
        return null;
    }
    
    const itemParaEditar = parseItemData();

    // --- 3. FUNÇÃO AUXILIAR: RESETAR O FORMULÁRIO PARA CADASTRO ---
    function resetarFormulario() {
        if (!form) return; 
        form.reset();
        form.action = "/roupas/salvar"; 
        if (modalTitulo) modalTitulo.innerText = "Cadastrar Nova Peça para Troca";
        if (btnSubmit) btnSubmit.innerText = "Cadastrar Roupa";
        if (itemId) itemId.value = ""; // Limpa o ID
    }

    // --- 4. AÇÕES DO MODAL (ABRIR, FECHAR, CLIQUE EXTERNO) ---
    
    // Ação: Abre o modal para NOVO CADASTRO
    if(btnAbrir && modal) {
        btnAbrir.addEventListener('click', function(event) {
            event.preventDefault(); 
            resetarFormulario();
            modal.style.display = "block";
        });
    }

    // Ação: Fecha o modal pelo botão X
    if(btnFechar && modal) {
        btnFechar.onclick = function() {
            modal.style.display = "none";
            // Resetar é essencial para evitar que o próximo clique abra em modo edição
            resetarFormulario(); 
        }
    }
    
    // Ação: Fecha o modal pelo clique externo
    if (modal) {
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
                resetarFormulario();
            }
        }
    }

    // --- 5. LÓGICA DE EDIÇÃO (ROTA /roupas/editar/:id) ---
    if (itemParaEditar && modal && form) {
        const item = itemParaEditar;
        
        // 1. Preenche os campos com os dados do item
        document.getElementById('item-id').value = item.id || '';
        document.getElementById('peca').value = item.peca || '';
        document.getElementById('categoriaPeca').value = item.categoriaPeca || ''; 
        document.getElementById('tipo').value = item.tipo || '';
        document.getElementById('tamanho').value = item.tamanho || '';
        document.getElementById('cor').value = item.cor || '';
        document.getElementById('tecido').value = item.tecido || '';
        document.getElementById('estacao').value = item.estacao || '';
        document.getElementById('condicao').value = item.condicao || '';
        document.getElementById('descricao').value = item.descricao || '';

        // 2. Ajusta o Formulário para MODO EDIÇÃO
        form.action = "/roupas/salvar"; 
        
        if (modalTitulo) modalTitulo.innerText = "Editar Peça: " + item.peca;
        if (btnSubmit) btnSubmit.innerText = "Salvar Alterações";
        
        // 3. Abre o modal automaticamente
        modal.style.display = "block";
    }

    // --- 6. LÓGICA DO ESTADO ATIVO DO FILTRO (Visual) ---
    // Faz a mesma lógica que estava antes no EJS, mas agora no JS
    const urlParams = new URLSearchParams(window.location.search);
    const isHistorico = urlParams.get('historico') === 'true';
    const statusFiltro = isHistorico ? 'Historico' : (urlParams.get('status') || 'Ativo'); 
    
    const filtroBtn = document.querySelector(`.filtro-item[data-filtro="${statusFiltro}"]`);
    
    if (filtroBtn) {
        // Remove a classe 'active' de todos (boa prática)
        document.querySelectorAll('.filtro-item').forEach(btn => btn.classList.remove('active'));
        filtroBtn.classList.add('active');
    }
});