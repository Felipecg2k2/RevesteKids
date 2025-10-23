// public/js/roupas.js

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal-cadastro');
    const btnAbrir = document.getElementById('btn-abrir-modal');
    const btnFechar = document.getElementById('btn-fechar-modal');
    const form = document.getElementById('form-roupa');
    const modalTitulo = document.getElementById('modal-titulo');
    const btnSubmit = document.getElementById('btn-submit');
    
    // VARIÁVEL DE EDIÇÃO É ESPERADA COMO GLOBAL (window.itemParaEditar)
    // E DEVE SER INJETADA NO EJS ANTES DESTE SCRIPT SER CARREGADO.

    // Função para resetar o formulário para MODO CADASTRO
    function resetarFormulario() {
        form.reset();
        // Garante que o action padrão seja o de criação
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

    // Ação: Fecha o modal pelo botão X
    if(btnFechar) {
        btnFechar.onclick = function() {
            modal.style.display = "none";
            // É importante resetar ao fechar para que o próximo clique não inicie como edição
            resetarFormulario(); 
        }
    }
    
    // Ação: Fecha o modal pelo clique externo (já estava no EJS, mas incluído aqui para robustez)
    /* window.onclick é uma função que sobrescreve qualquer outro onclick do window,
    por isso é geralmente melhor deixar no EJS onde foi definido. No entanto,
    se você está carregando este script no final, a sua lógica aqui é válida:
    */
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            resetarFormulario();
        }
    }

    // LÓGICA DE EDIÇÃO: Verifica se a variável global existe
    if (window.itemParaEditar) {
        const item = window.itemParaEditar;
        
        // 1. Preenche os campos com os dados do item
        document.getElementById('item-id').value = item.id;
        document.getElementById('peca').value = item.peca;
        
        // CRÍTICO: Preenche o SELECT categoriaPeca
        document.getElementById('categoriaPeca').value = item.categoriaPeca; 
        
        // CRÍTICO: Preenche o SELECT tipo (Gênero)
        document.getElementById('tipo').value = item.tipo;
        
        document.getElementById('tamanho').value = item.tamanho;
        document.getElementById('cor').value = item.cor;
        document.getElementById('tecido').value = item.tecido;
        document.getElementById('estacao').value = item.estacao;
        document.getElementById('condicao').value = item.condicao;
        document.getElementById('descricao').value = item.descricao;

        // 2. Ajusta o Formulário para MODO EDIÇÃO
        // A rota de edição POST deve incluir o ID
        form.action = "/roupas/editar/" + item.id; 
        modalTitulo.innerText = "Editar Peça: " + item.peca;
        btnSubmit.innerText = "Salvar Alterações";
        
        // 3. Abre o modal automaticamente (Esta ação foi colocada no EJS no último código, 
        // mas tê-la aqui também não prejudica, apenas garante que abra)
        modal.style.display = "block";
    }
});