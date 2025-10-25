document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal-cadastro');
    const btnAbrirModal = document.getElementById('btn-abrir-modal');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    const formRoupa = document.getElementById('form-roupa');
    const modalTitulo = document.getElementById('modal-titulo');
    const btnSubmit = document.getElementById('btn-submit');
    const itemDataContainer = document.getElementById('item-data-container');
    
    // Elementos do formulário
    const inputId = document.getElementById('item-id');
    const inputPeca = document.getElementById('peca');
    const selectCategoria = document.getElementById('categoriaPeca');
    const selectTipo = document.getElementById('tipo');
    const inputTamanho = document.getElementById('tamanho');
    const inputCor = document.getElementById('cor');
    const inputTecido = document.getElementById('tecido');
    const inputEstacao = document.getElementById('estacao');
    const inputCondicao = document.getElementById('condicao');
    const textareaDescricao = document.getElementById('descricao');

    // 1. LÓGICA DE ABERTURA E FECHAMENTO DO MODAL (Comportamento Básico)
    
    if (btnAbrirModal) {
        btnAbrirModal.onclick = function() {
            // Limpa o formulário e define para 'Cadastro' antes de abrir
            resetarFormularioParaCadastro();
            modal.style.display = "block";
        }
    }

    btnFecharModal.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    }

    // 2. FUNÇÃO PARA PREPARAR O FORMULÁRIO PARA NOVO CADASTRO
    function resetarFormularioParaCadastro() {
        formRoupa.reset(); // Limpa todos os campos
        inputId.value = ''; // Garante que o ID esteja vazio
        formRoupa.action = '/roupas/salvar';
        modalTitulo.textContent = 'Cadastrar Nova Peça para Troca';
        btnSubmit.textContent = 'Cadastrar Roupa';
        // Opcional: Redireciona a página para a URL de roupas base ao fechar
        // Se a página for carregada no modo edição, o usuário deve ser redirecionado
        // para a lista principal ao fechar o modal.
        // window.history.pushState({}, document.title, "/roupas"); 
    }
    
    // 3. LÓGICA DE EDIÇÃO: Checa se a página foi carregada com dados de edição
    
    const itemDataJSON = itemDataContainer.getAttribute('data-item');
    const filtroStatus = itemDataContainer.getAttribute('data-filtro-status');

    if (itemDataJSON && itemDataJSON !== 'null') {
        try {
            const itemParaEditar = JSON.parse(itemDataJSON);
            
            if (itemParaEditar && itemParaEditar.id) {
                
                // Preencher o formulário com os dados do item
                inputId.value = itemParaEditar.id;
                inputPeca.value = itemParaEditar.peca;
                selectCategoria.value = itemParaEditar.categoriaPeca;
                selectTipo.value = itemParaEditar.tipo;
                inputTamanho.value = itemParaEditar.tamanho;
                inputCor.value = itemParaEditar.cor || '';
                inputTecido.value = itemParaEditar.tecido || '';
                inputEstacao.value = itemParaEditar.estacao || '';
                inputCondicao.value = itemParaEditar.condicao;
                textareaDescricao.value = itemParaEditar.descricao || '';
                
                // Mudar o título e ação do formulário para Edição
                formRoupa.action = '/roupas/editar/' + itemParaEditar.id; // Altera a rota para a edição
                modalTitulo.textContent = 'Editar Peça: ' + itemParaEditar.peca;
                btnSubmit.textContent = 'Salvar Alterações';
                
                // Abrir o modal automaticamente
                modal.style.display = "block";

                // Se o item estiver "Em Troca", bloquear a edição de certos campos
                if (itemParaEditar.statusPosse === 'EmTroca') {
                    // Exemplo: Bloquear campos. Isso depende da sua regra de negócio.
                    // inputPeca.disabled = true;
                    // ...
                    // Você pode adicionar um aviso visual aqui também.
                }
            }
        } catch (e) {
            console.error('Erro ao analisar dados do item para edição:', e);
        }
    }
    
    // 4. LÓGICA DE DESTAQUE DO FILTRO ATIVO
    
    const filtros = document.querySelectorAll('.filtro-item');
    filtros.forEach(filtro => {
        const filtroValor = filtro.getAttribute('data-filtro');
        // Se o filtroStatus for 'Ativo' e a URL não tiver status, 
        // ou se o filtroValor for igual ao filtroStatus (ex: 'EmTroca')
        if (
            (filtroStatus === 'Ativo' && filtro.id === 'filtro-cadastradas') ||
            (filtroStatus === 'EmTroca' && filtro.id === 'filtro-emtroca')
        ) {
            filtro.classList.add('active');
        } 
        
        // Lógica para o filtro de Histórico (verifica a URL de forma mais robusta)
        const currentUrl = window.location.href;
        if (filtro.id === 'filtro-historico' && currentUrl.includes('historico=true')) {
             // Remove 'active' dos outros filtros primeiro (opcional, mas limpa)
            document.getElementById('filtro-cadastradas').classList.remove('active');
            document.getElementById('filtro-emtroca').classList.remove('active');
            filtro.classList.add('active');
        }
    });
    
    // 5. GARANTIR QUE O FILTRO 'ATIVO' SEJA SELECIONADO SE NÃO HOUVER FILTRO OU SE for a tela principal
    if (!filtroStatus || filtroStatus === 'Ativo') {
        // Se a URL não tem ?status= ou ?historico=, assume Ativo (Roupas Disponíveis)
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.get('status') && !urlParams.get('historico')) {
             document.getElementById('filtro-cadastradas').classList.add('active');
        }
    }
});