document.addEventListener('DOMContentLoaded', () => {
    
    // --- Referências do DOM ---
    const tabButtons = document.querySelectorAll('.tabs-navigation .tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const modal = document.getElementById('trocaModal');
    const modalBody = document.getElementById('modalBodyContent');
    const closeButton = document.querySelector('#trocaModal .close-button');


    // --- Funções de Controle do Modal ---
    const openModal = () => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Bloqueia o scroll
    }

    const closeModal = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        modalBody.innerHTML = ''; // Limpa o conteúdo
    }
    
    // --- Lógica de Troca de Abas (Tabs) ---
    const switchTab = (targetTabId) => {
        // Remove 'active' de todos os botões e esconde todos os painéis
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.style.display = 'none');
        
        // Adiciona 'active' ao botão clicado e exibe o painel correspondente
        const activeButton = document.querySelector(`.tab-button[data-tab="${targetTabId}"]`);
        const activePane = document.getElementById(targetTabId);

        if (activeButton && activePane) {
            activeButton.classList.add('active');
            activePane.style.display = 'grid'; 
            localStorage.setItem('activeTab', targetTabId);
        }
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.getAttribute('data-tab'));
        });
    });

    // Inicialização: Carregar a aba salva, a aba da URL ou a primeira
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('tab');
    const savedTab = localStorage.getItem('activeTab');
    
    // Prioridade: 1. URL, 2. LocalStorage, 3. 'recebidas'
    const initialTab = urlTab || savedTab || 'recebidas';
    switchTab(initialTab);


    // --- Lógica do Modal (Carregar Detalhes via AJAX) ---
    
    // Event Listener: Captura o clique em "Ver Detalhes"
    document.body.addEventListener('click', async (event) => {
        const btnDetalhes = event.target.closest('.btn-detalhes');
        
        if (btnDetalhes) {
            event.preventDefault(); // IMPEDE o redirecionamento!
            
            // Obtém o ID diretamente do data-attribute
            const trocaId = btnDetalhes.getAttribute('data-troca-id');
            
            if (!trocaId) {
                console.error("ID da Troca não encontrado no data-troca-id.");
                return;
            }

            openModal();
            // Estado de carregamento do modal
            modalBody.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Carregando detalhes da troca...</p></div>';

            try {
                // Chamada para a API
                const response = await fetch(`/trocas/detalhes/${trocaId}`);
                
                if (!response.ok) {
                    throw new Error(`Falha ao buscar os detalhes. Status: ${response.status}`);
                }
                
                // Assumimos que o endpoint retorna o HTML/EJS já renderizado para o modal
                const htmlContent = await response.text();
                modalBody.innerHTML = htmlContent;

            } catch (error) {
                console.error("Erro no AJAX do Modal:", error);
                modalBody.innerHTML = '<div class="error-message"><p>Erro ao carregar os detalhes. Tente novamente.</p></div>';
            }
        }
    });

    // Fechar o modal ao clicar no botão 'x'
    closeButton.addEventListener('click', closeModal);
    
    // Fechar o modal ao clicar fora
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
});