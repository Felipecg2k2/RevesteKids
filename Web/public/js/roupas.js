// public/js/roupas.js

console.log("Script roupas.js carregado."); 

// O listener DOMContentLoaded garante que o script só rode depois que todos os elementos HTML existam.
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded disparado no roupas.js.");

    const modal = document.getElementById('modal-cadastro');
    const btnAbrir = document.getElementById('btn-abrir-modal');
    const btnFechar = document.getElementById('btn-fechar-modal');
    const form = document.getElementById('form-roupa');
    const modalTitulo = document.getElementById('modal-titulo');
    const btnSubmit = document.getElementById('btn-submit');
    
    // Verificações de depuração
    console.log("Modal encontrado?", !!modal);
    console.log("Botão de Abrir encontrado?", !!btnAbrir);

    // Se qualquer um dos elementos críticos não for encontrado, o script não deve prosseguir
    if (!modal || !form || !modalTitulo || !btnSubmit) {
        console.error("Erro: Um ou mais elementos essenciais do modal (modal-cadastro, form-roupa, etc.) não foram encontrados.");
        // O restante do código pode ser executado, mas a lógica de abertura/fechamento pode falhar.
    }
    
    // Função para resetar o formulário para MODO CADASTRO
    function resetarFormulario() {
        if (!form) return; // Proteção extra
        form.reset();
        form.action = "/roupas/salvar"; 
        if (modalTitulo) modalTitulo.innerText = "Cadastrar Nova Peça para Troca";
        if (btnSubmit) btnSubmit.innerText = "Cadastrar Roupa";
        const itemId = document.getElementById('item-id');
        if (itemId) itemId.value = ""; // Limpa o ID
    }

    // Ação do Tópico 1: Abre o modal para NOVO CADASTRO
    if(btnAbrir && modal) {
        // Usando addEventListener para maior robustez, conforme sugerido
        btnAbrir.addEventListener('click', function(event) {
            event.preventDefault(); // Boa prática
            console.log("Botão de Abrir Clicado! Tentando abrir o modal.");
            resetarFormulario();
            modal.style.display = "block";
        });
    }

    // Ação: Fecha o modal pelo botão X
    if(btnFechar && modal) {
        btnFechar.onclick = function() {
            modal.style.display = "none";
            // É importante resetar ao fechar para que o próximo clique não inicie como edição
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

    // LÓGICA DE EDIÇÃO: Verifica se a variável global existe
    if (window.itemParaEditar && modal && form) {
        const item = window.itemParaEditar;
        
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
        form.action = "/roupas/editar/" + item.id; 
        if (modalTitulo) modalTitulo.innerText = "Editar Peça: " + item.peca;
        if (btnSubmit) btnSubmit.innerText = "Salvar Alterações";
        
        // 3. Abre o modal automaticamente (garantido)
        modal.style.display = "block";
    }
});