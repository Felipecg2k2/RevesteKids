/**
 * Item Modal Details JavaScript (item_modal.js)
 *
 * Este script controla a abertura, o carregamento dinâmico via AJAX e o fechamento
 * do modal de detalhes do item na sua view de feed/trocas.
 *
 * IMPORTANTE: Certifique-se de que a rota de API '/api/item/:id' esteja implementada no Express
 * para fornecer os dados completos do item em formato JSON.
 */

// =======================================================
// 1. FUNÇÃO PRINCIPAL: ABRE E CARREGA O CONTEÚDO
// =======================================================

async function abrirModalDetalhes(itemId) {
    const modal = document.getElementById('itemDetalhesModal');
    const modalContent = modal.querySelector('.rk-detalhes-content');

    // 1. Mostrar carregando e abrir o overlay
    modalContent.innerHTML = '<h4>Carregando detalhes...</h4>';
    modal.style.display = 'flex'; 

    try {
        // 2. Requisição AJAX (Busca todos os detalhes)
        const response = await fetch(`/api/item/${itemId}`);
        
        // Verifica se a resposta não é um erro de rede, mas sim um erro HTTP (404, 500, etc.)
        if (!response.ok) {
            // Se for erro HTTP, lança para cair no catch
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText || 'Erro no servidor'}`);
        }
        
        const item = await response.json();

        // 3. Formatação da Data
        let dataFormatada = 'Data indisponível';
        if (item.data_cadastro) {
            const dataObj = new Date(item.data_cadastro);
            
            // Exemplo de formatação para DD/MM/AAAA - HH:MM
            const dia = String(dataObj.getDate()).padStart(2, '0');
            const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
            const ano = dataObj.getFullYear();
            const hora = String(dataObj.getHours()).padStart(2, '0');
            const minuto = String(dataObj.getMinutes()).padStart(2, '0');
            
            dataFormatada = `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
        }
        
        // 4. Tratamento de Fallbacks
        // Observação: O nome da imagem precisa ser consistente com o JSON da API.
        const imageUrl = item.imagem_url || item.fotoUrl || '/img/placeholder.jpg'; 
        const descricao = item.descricao_completa || 'Nenhuma descrição detalhada fornecida pelo dono.';

        // 5. Montar o HTML completo do Modal com todos os dados
        modalContent.innerHTML = `
            <span class="fechar-btn" onclick="fecharModalDetalhes()">&times;</span>
            
            <h3>${item.nome_da_peca}</h3> 
            
            <div class="detalhe-imagem">
                <img src="${imageUrl}" alt="${item.nome_da_peca}">
            </div>

            <div class="detalhes-info">
                <p><strong>Dono:</strong> ${item.dono_nome}</p>
                <p><strong>Categoria:</strong> ${item.categoriaPeca}</p>
                <p><strong>Gênero:</strong> ${item.tipo}</p>
                <p><strong>Tamanho:</strong> ${item.tamanho}</p>
                <p><strong>Cor:</strong> ${item.cor}</p>
                <p><strong>Tecido:</strong> ${item.tecido}</p>
                <p><strong>Estação:</strong> ${item.estacao}</p>
                <p><strong>Condição:</strong> ${item.condicao}</p>
                <p><strong>Item criado em:</strong> ${dataFormatada}</p>

                
                <hr>
                <h4>Descrição sobre a peça:</h4>
                <p>${descricao}</p>
            </div>

            <button class="propor-troca-btn" data-item-id="${item.id}">Propor Troca</button>
        `;
        
        // 6. Lógica para o botão "Propor Troca"
        const btnProporTroca = modalContent.querySelector('.propor-troca-btn');

        if (btnProporTroca) {
            btnProporTroca.addEventListener('click', () => {
                // CORREÇÃO: Usamos o ID do item que está sendo visualizado (item.id)
                const idDoItemDesejado = btnProporTroca.getAttribute('data-item-id');
                iniciarTroca(idDoItemDesejado);
            });
        }

    } catch (error) {
        console.error('Erro de rede ou busca:', error);
        // Em caso de erro de conexão ou 404
        let errorMessage = 'Verifique sua internet ou tente novamente mais tarde.';
        if (error.message.includes('404')) {
            errorMessage = 'O item não foi encontrado ou não está mais disponível.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Erro interno no servidor ao carregar os dados.';
        }

        modalContent.innerHTML = `
            <span class="fechar-btn" onclick="fecharModalDetalhes()">&times;</span>
            <h4>Erro ao carregar detalhes.</h4>
            <p>${errorMessage}</p>
        `;
    }
}

// =======================================================
// 2. FUNÇÃO AUXILIAR: FECHA O MODAL
// =======================================================

function fecharModalDetalhes() {
    document.getElementById('itemDetalhesModal').style.display = 'none';
}

// =======================================================
// 3. FUNÇÃO DE AÇÃO: INICIA O FLUXO DE TROCA
// =======================================================

/**
 * Redireciona para a página onde o usuário selecionará as peças a oferecer.
 * @param {string} itemRecebidoId - O ID da peça que o usuário deseja receber.
 */
function iniciarTroca(itemRecebidoId) {
    // 1. Fechar o modal
    fecharModalDetalhes(); 
    
    // 2. Redirecionar para a rota de seleção de peça para troca
    // Rota: /trocas/propor/:itemIdDesejado
    window.location.href = `/trocas/propor/${itemRecebidoId}`;
}


// =======================================================
// 4. LISTENERS: FECHAR AO CLICAR FORA
// =======================================================

// Usa DOMContentLoaded para garantir que o elemento modal exista
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('itemDetalhesModal');

    if (modal) {
        modal.addEventListener('click', (event) => {
            // Checa se o elemento clicado é o overlay (o div com o id 'itemDetalhesModal')
            if (event.target.id === 'itemDetalhesModal') {
                fecharModalDetalhes();
            }
        });
    }
});