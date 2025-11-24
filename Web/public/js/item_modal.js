// =======================================================
// 1. FUNÇÃO PRINCIPAL: ABRE E CARREGA O CONTEÚDO COM CARROSSEL
// =======================================================
async function abrirModalDetalhes(itemId) {
    console.log('🔍 Abrindo modal para item ID:', itemId);
    
    const modal = document.getElementById('itemDetalhesModal');
    const modalContent = modal.querySelector('.rk-detalhes-content');
    
    if (!modal || !modalContent) {
        console.error('❌ Modal ou conteúdo do modal não encontrado');
        return;
    }

    // 1. Mostrar carregando e abrir o overlay
    modalContent.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="loading-spinner" style="font-size: 48px; margin-bottom: 20px;">⏳</div>
            <h4>Carregando detalhes...</h4>
        </div>
    `;
    modal.style.display = 'flex';
    
    try {
        console.log('📡 Fazendo requisição para API...');
        
        // 2. Requisição AJAX (Busca todos os detalhes)
        const response = await fetch(`/api/item/${itemId}`);
        
        console.log('📊 Status da resposta:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const item = await response.json();
        console.log('✅ Dados recebidos:', item);
        
        // 3. Formatação da Data
        let dataFormatada = 'Data indisponível';
        if (item.data_cadastro) {
            try {
                const dataObj = new Date(item.data_cadastro);
                if (!isNaN(dataObj.getTime())) {
                    const dia = String(dataObj.getDate()).padStart(2, '0');
                    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
                    const ano = dataObj.getFullYear();
                    const hora = String(dataObj.getHours()).padStart(2, '0');
                    const minuto = String(dataObj.getMinutes()).padStart(2, '0');
                    dataFormatada = `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
                }
            } catch (dateError) {
                console.error('Erro ao formatar data:', dateError);
            }
        }
        
        // 4. Montar o HTML completo do Modal - APENAS FOTO PRINCIPAL
        const temImagens = item.imagens && item.imagens.length > 0;
        const imagemPrincipal = temImagens ? item.imagens[0] : null;
        
        modalContent.innerHTML = `
            <span class="fechar-btn" onclick="fecharModalDetalhes()">&times;</span>
            <h3>${item.nome_da_peca || item.peca || 'Item sem nome'}</h3>
            
            <!-- APENAS FOTO PRINCIPAL -->
            <div class="rk-carrossel-container">
                <div class="rk-carrossel-imagem" id="rk-imagem-principal">
                    ${temImagens ? 
                        `<img src="${imagemPrincipal.caminho_arquivo}" alt="${item.nome_da_peca || item.peca}" id="rk-imagem-atual" style="width: 100%; max-height: 400px; object-fit: contain;">
                         <button class="rk-expand-btn" onclick="expandirImagem('${imagemPrincipal.caminho_arquivo}')">⤢</button>` :
                        `<div style="text-align: center; color: #666; padding: 50px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21,15 16,10 5,21"></polyline>
                            </svg>
                            <p style="margin-top: 10px;">Sem imagens disponíveis</p>
                         </div>`
                    }
                </div>
            </div>
            
            <!-- DETALHES DO ITEM -->
            <div class="detalhes-info">
                <p><strong>Dono:</strong> ${item.dono_nome || 'Não informado'}</p>
                <p><strong>Categoria:</strong> ${item.categoriaPeca || 'Não informada'}</p>
                <p><strong>Gênero:</strong> ${item.tipo || 'Não informado'}</p>
                <p><strong>Tamanho:</strong> ${item.tamanho || 'Não informado'}</p>
                <p><strong>Cor:</strong> ${item.cor || 'Não informada'}</p>
                <p><strong>Tecido:</strong> ${item.tecido || 'Não informado'}</p>
                <p><strong>Estação:</strong> ${item.estacao || 'Não informada'}</p>
                <p><strong>Condição:</strong> ${item.condicao || 'Não informada'}</p>
                <p><strong>Item criado em:</strong> ${dataFormatada}</p>
                <hr>
                <h4>Descrição sobre a peça:</h4>
                <p>${item.descricao_completa || item.descricao || 'Nenhuma descrição detalhada fornecida pelo dono.'}</p>
            </div>
            
            <button class="propor-troca-btn" data-item-id="${item.id}">Propor Troca</button>
        `;
        
        // 5. Lógica para o botão "Propor Troca"
        const btnProporTroca = modalContent.querySelector('.propor-troca-btn');
        if (btnProporTroca) {
            btnProporTroca.addEventListener('click', () => {
                const idDoItemDesejado = btnProporTroca.getAttribute('data-item-id');
                console.log('🔄 Iniciando troca para item:', idDoItemDesejado);
                iniciarTroca(idDoItemDesejado);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar detalhes:', error);
        
        let errorMessage = 'Verifique sua internet ou tente novamente mais tarde.';
        
        if (error.message.includes('404')) {
            errorMessage = 'O item não foi encontrado ou não está mais disponível.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Erro interno no servidor ao carregar os dados.';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Erro de conexão. Verifique sua internet.';
        }
        
        modalContent.innerHTML = `
            <span class="fechar-btn" onclick="fecharModalDetalhes()">&times;</span>
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">😕</div>
                <h4>Erro ao carregar detalhes</h4>
                <p>${errorMessage}</p>
                <button onclick="abrirModalDetalhes('${itemId}')" style="margin-top: 20px; padding: 10px 20px; background: #9370DB; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}

// =======================================================
// FUNÇÕES SIMPLIFICADAS - APENAS EXPANSÃO DE IMAGEM
// =======================================================

function expandirImagem(urlImagem) {
    // Criar overlay para imagem expandida se não existir
    let overlay = document.getElementById('rk-overlay-expandido');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'rk-overlay-expandido';
        overlay.className = 'rk-overlay-expandido';
        overlay.innerHTML = `
            <button class="rk-fechar-expandido" onclick="fecharImagemExpandida()">&times;</button>
            <img class="rk-imagem-expandida" src="${urlImagem}" alt="Imagem expandida" style="max-width: 90%; max-height: 90%; object-fit: contain;">
        `;
        document.body.appendChild(overlay);
        
        // Fechar ao clicar no overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                fecharImagemExpandida();
            }
        });
    } else {
        const img = overlay.querySelector('.rk-imagem-expandida');
        if (img) {
            img.src = urlImagem;
        }
    }
    
    overlay.classList.add('mostrar');
    document.body.style.overflow = 'hidden';
}

function fecharImagemExpandida() {
    const overlay = document.getElementById('rk-overlay-expandido');
    if (overlay) {
        overlay.classList.remove('mostrar');
        document.body.style.overflow = '';
    }
}

// =======================================================
// FUNÇÕES EXISTENTES
// =======================================================

function fecharModalDetalhes() {
    const modal = document.getElementById('itemDetalhesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function iniciarTroca(itemRecebidoId) {
    console.log('🚀 Redirecionando para troca do item:', itemRecebidoId);
    fecharModalDetalhes();
    window.location.href = `/trocas/propor/${itemRecebidoId}`;
}

// Fechar modal ao clicar fora 
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('itemDetalhesModal');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target.id === 'itemDetalhesModal') {
                fecharModalDetalhes();
            }
        });
    }
    
    // Navegação por teclado
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('itemDetalhesModal');
        if (modal && modal.style.display === 'flex') {
            if (e.key === 'Escape') {
                fecharModalDetalhes();
                fecharImagemExpandida();
            }
        }
    });
});