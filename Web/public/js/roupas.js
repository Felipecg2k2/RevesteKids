document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal-cadastro');
    const btnAbrir = document.getElementById('btn-abrir-modal');
    const btnFechar = document.getElementById('btn-fechar-modal');
    const form = document.getElementById('form-roupa');
    const modalTitulo = document.getElementById('modal-titulo');
    const btnSubmit = document.getElementById('btn-submit');
    
    // VARIÁVEL DE EDIÇÃO SERÁ DEFINIDA FORA DESTE ARQUIVO

    // Função para resetar o formulário para MODO CADASTRO
    function resetarFormulario() {
        form.reset();
        form.action = "/roupas/salvar";
        modalTitulo.innerText = "Cadastrar Nova Peça para Troca";
        btnSubmit.innerText = "Cadastrar Roupa";
        document.getElementById('item-id').value = ""; // Limpa o ID
    }

    // Ação do Tópico 1: Abre o modal para NOVO CADASTRO
    if(btnAbrir) {
        btnAbrir.onclick = function() {
            resetarFormulario();
            modal.style.display = "block";
        }
    }

    // Ação: Fecha o modal pelo botão X ou clique externo
    if(btnFechar) {
        btnFechar.onclick = function() {
            modal.style.display = "none";
            resetarFormulario(); 
        }
    }
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            resetarFormulario();
        }
    }

    // LÓGICA DE EDIÇÃO: Verifica se a variável global existe
    // É CRUCIAL que esta variável seja injetada no EJS antes de carregar este script!
    if (window.itemParaEditar) {
        // 1. Preenche os campos com os dados do item
        document.getElementById('item-id').value = window.itemParaEditar.id;
        document.getElementById('peca').value = window.itemParaEditar.peca;
        document.getElementById('tipo').value = window.itemParaEditar.tipo;
        document.getElementById('tamanho').value = window.itemParaEditar.tamanho;
        document.getElementById('cor').value = window.itemParaEditar.cor;
        document.getElementById('tecido').value = window.itemParaEditar.tecido;
        document.getElementById('estacao').value = window.itemParaEditar.estacao;
        document.getElementById('condicao').value = window.itemParaEditar.condicao;
        document.getElementById('descricao').value = window.itemParaEditar.descricao;

        // 2. Ajusta o Formulário para MODO EDIÇÃO
        form.action = "/roupas/editar/" + window.itemParaEditar.id;
        modalTitulo.innerText = "Editar Peça: " + window.itemParaEditar.peca;
        btnSubmit.innerText = "Salvar Alterações";
        
        // 3. Abre o modal automaticamente 
        modal.style.display = "block";
    }
});