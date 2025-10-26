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

    // Variáveis de Estado
    const filtroStatus = itemDataContainer.getAttribute('data-filtro-status');
    const urlParams = new URLSearchParams(window.location.search);


    // =======================================================
    // 1. LÓGICA DO MODAL (Abertura, Fechamento e Reset)
    // =======================================================

    function resetarFormularioParaCadastro() {
        formRoupa.reset(); 
        inputId.value = ''; 
        formRoupa.action = '/roupas/salvar'; 
        modalTitulo.textContent = 'Cadastrar Nova Peça para Troca';
        btnSubmit.textContent = 'Cadastrar Roupa';
    }
    
    // ABRIR MODAL (CADASTRO)
    if (btnAbrirModal) {
        btnAbrirModal.onclick = function() {
            resetarFormularioParaCadastro();
            modal.style.display = "block";
        }
    }

    // FECHAR MODAL
    btnFecharModal.onclick = function() {
        modal.style.display = "none";
        resetarFormularioParaCadastro();
    }

    // FECHAR MODAL CLICANDO FORA
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = "none";
            resetarFormularioParaCadastro();
        }
    }

    // LÓGICA PARA ABRIR MODAL NA EDIÇÃO (Anexada aos botões .btn-editar)
    document.querySelectorAll('.btn-editar').forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            
            const itemDataString = this.getAttribute('data-item');
            let item;
            try {
                item = JSON.parse(itemDataString);
            } catch (e) {
                console.error('Erro ao fazer parse do JSON do item:', e);
                return;
            }
            
            if (!item) return;

            // 1. Configurar o formulário para EDIÇÃO
            modalTitulo.textContent = `Editar Peça: ${item.peca}`;
            btnSubmit.textContent = 'Salvar Alterações';
            formRoupa.action = '/roupas/salvar'; // Usa a rota unificada POST (o ID no campo hidden faz o Express entender que é um UPDATE)
            
            // 2. Preencher os campos do formulário
            inputId.value = item.id || '';
            inputPeca.value = item.peca || '';
            selectCategoria.value = item.categoriaPeca || '';
            selectTipo.value = item.tipo || 'Feminino';
            inputTamanho.value = item.tamanho || '';
            inputCor.value = item.cor || '';
            inputTecido.value = item.tecido || '';
            inputEstacao.value = item.estacao || '';
            inputCondicao.value = item.condicao || '';
            textareaDescricao.value = item.descricao || '';
            
            // 3. Exibir o modal
            modal.style.display = "block";
        });
    });


    // =======================================================
    // 2. LÓGICA DE DESTAQUE DO FILTRO ATIVO (CORRIGIDA)
    // =======================================================
    
    const filtros = document.querySelectorAll('.filtro-item');
    
    // Limpar todos os filtros ao iniciar
    filtros.forEach(filtro => filtro.classList.remove('active'));

    // Lógica para Histórico
    if (urlParams.get('historico') === 'true') {
        const filtroHistorico = document.getElementById('filtro-historico-link'); // ID CORRETO
        if (filtroHistorico) filtroHistorico.classList.add('active');
        return; 
    }
    
    // Lógica para Filtros de Status (Ativo/EmTroca)
    
    // Se a URL tem ?status=EmTroca OU o controller definiu filtroStatus como EmTroca
    if (urlParams.get('status') === 'EmTroca' || filtroStatus === 'EmTroca') {
        const filtroEmTroca = document.getElementById('filtro-emtroca');
        if (filtroEmTroca) filtroEmTroca.classList.add('active');
    } 
    // Caso contrário, assume Ativo (URL /roupas ou ?status=Ativo)
    else {
        const filtroAtivo = document.getElementById('filtro-ativas'); // ID CORRETO
        if (filtroAtivo) filtroAtivo.classList.add('active');
    }
});