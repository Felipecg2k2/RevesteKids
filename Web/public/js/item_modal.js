// =======================================================
// 1. FUNÇÃO PRINCIPAL: ABRE E CARREGA O CONTEÚDO COM CARROSSEL
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
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const item = await response.json();
        
        // 3. Formatação da Data
        let dataFormatada = 'Data indisponível';
        if (item.data_cadastro) {
            const dataObj = new Date(item.data_cadastro);
            const dia = String(dataObj.getDate()).padStart(2, '0');
            const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
            const ano = dataObj.getFullYear();
            const hora = String(dataObj.getHours()).padStart(2, '0');
            const minuto = String(dataObj.getMinutes()).padStart(2, '0');
            dataFormatada = `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
        }
        
        // 4. Montar o HTML completo do Modal com CARROSSEL
        modalContent.innerHTML = `
            <span class="fechar-btn" onclick="fecharModalDetalhes()">&times;</span>
            <h3>${item.nome_da_peca}</h3> 
            
            <!-- CARROSSEL DE IMAGENS -->
            <div class="rk-carrossel-container">
                <div class="rk-carrossel-imagem" id="rk-imagem-principal">
                    ${item.imagens && item.imagens.length > 0 ? 
                        `<img src="${item.imagens[0].caminho_arquivo}" alt="${item.nome_da_peca}" id="rk-imagem-atual">
                         <button class="rk-expand-btn" onclick="expandirImagem('${item.imagens[0].caminho_arquivo}')">⤢</button>` :
                        `<div style="text-align: center; color: #666; padding: 50px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21,15 16,10 5,21"></polyline>
                            </svg>
                            <p style="margin-top: 10px;">Sem imagens</p>
                         </div>`
                    }
                </div>
                
                ${item.imagens && item.imagens.length > 1 ? `
                <div class="rk-carrossel-controles">
                    <button class="rk-carrossel-btn" id="rk-btn-anterior" onclick="mudarImagem(-1)">‹ Anterior</button>
                    <div class="rk-carrossel-contador">
                        <span id="rk-contador-atual">1</span> / <span id="rk-contador-total">${item.imagens.length}</span>
                    </div>
                    <button class="rk-carrossel-btn" id="rk-btn-proximo" onclick="mudarImagem(1)">Próximo ›</button>
                </div>
                
                <div class="rk-carrossel-miniatura" id="rk-miniaturas">
                    ${item.imagens.map((imagem, index) => `
                        <div class="rk-miniatura-item ${index === 0 ? 'active' : ''}" 
                             onclick="irParaImagem(${index})">
                            <img src="${imagem.caminho_arquivo}" alt="Miniatura ${index + 1}">
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
            
            <!-- DETALHES DO ITEM -->
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
                <p>${item.descricao_completa || 'Nenhuma descrição detalhada fornecida pelo dono.'}</p>
            </div>
            
            <button class="propor-troca-btn" data-item-id="${item.id}">Propor Troca</button>
        `;
        
        // 5. Armazenar dados do carrossel globalmente
        window.rkCarrosselData = {
            imagens: item.imagens || [],
            imagemAtual: 0
        };
        
        // 6. Atualizar controles do carrossel
        atualizarControlesCarrossel();
        
        // 7. Lógica para o botão "Propor Troca"
        const btnProporTroca = modalContent.querySelector('.propor-troca-btn');
        if (btnProporTroca) {
            btnProporTroca.addEventListener('click', () => {
                const idDoItemDesejado = btnProporTroca.getAttribute('data-item-id');
                iniciarTroca(idDoItemDesejado);
            });
        }
        
    } catch (error) {
        console.error('Erro de rede ou busca:', error);
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
// FUNÇÕES DO CARROSSEL
// =======================================================

function mudarImagem(direcao) {
    if (!window.rkCarrosselData || window.rkCarrosselData.imagens.length <= 1) return;
    
    const totalImagens = window.rkCarrosselData.imagens.length;
    let novaImagem = window.rkCarrosselData.imagemAtual + direcao;
    
    // Loop circular
    if (novaImagem < 0) novaImagem = totalImagens - 1;
    if (novaImagem >= totalImagens) novaImagem = 0;
    
    irParaImagem(novaImagem);
}

function irParaImagem(index) {
    if (!window.rkCarrosselData || !window.rkCarrosselData.imagens[index]) return;
    
    window.rkCarrosselData.imagemAtual = index;
    const imagem = window.rkCarrosselData.imagens[index];
    
    // Atualizar imagem principal
    const imgElement = document.getElementById('rk-imagem-atual');
    const expandBtn = document.querySelector('.rk-expand-btn');
    
    if (imgElement) {
        imgElement.src = imagem.caminho_arquivo;
        imgElement.alt = `Imagem ${index + 1}`;
    }
    
    if (expandBtn) {
        expandBtn.onclick = () => expandirImagem(imagem.caminho_arquivo);
    }
    
    // Atualizar miniaturas
    document.querySelectorAll('.rk-miniatura-item').forEach((miniatura, i) => {
        miniatura.classList.toggle('active', i === index);
    });
    
    // Atualizar contador
    document.getElementById('rk-contador-atual').textContent = index + 1;
    
    atualizarControlesCarrossel();
}

function atualizarControlesCarrossel() {
    if (!window.rkCarrosselData) return;
    
    const totalImagens = window.rkCarrosselData.imagens.length;
    const imagemAtual = window.rkCarrosselData.imagemAtual;
    
    // Atualizar contador total se necessário
    document.getElementById('rk-contador-total').textContent = totalImagens;
    
    // Mostrar/ocultar controles baseado no número de imagens
    const controles = document.querySelector('.rk-carrossel-controles');
    const miniaturas = document.querySelector('.rk-carrossel-miniatura');
    
    if (controles) controles.style.display = totalImagens > 1 ? 'flex' : 'none';
    if (miniaturas) miniaturas.style.display = totalImagens > 1 ? 'flex' : 'none';
}

function expandirImagem(urlImagem) {
    // Criar overlay para imagem expandida se não existir
    let overlay = document.getElementById('rk-overlay-expandido');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'rk-overlay-expandido';
        overlay.className = 'rk-overlay-expandido';
        overlay.innerHTML = `
            <button class="rk-fechar-expandido" onclick="fecharImagemExpandida()">&times;</button>
            <img class="rk-imagem-expandida" src="${urlImagem}" alt="Imagem expandida">
        `;
        document.body.appendChild(overlay);
        
        // Fechar ao clicar no overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                fecharImagemExpandida();
            }
        });
    } else {
        overlay.querySelector('.rk-imagem-expandida').src = urlImagem;
    }
    
    overlay.classList.add('mostrar');
    document.body.style.overflow = 'hidden'; // Previne scroll
}

function fecharImagemExpandida() {
    const overlay = document.getElementById('rk-overlay-expandido');
    if (overlay) {
        overlay.classList.remove('mostrar');
        document.body.style.overflow = ''; // Restaura scroll
    }
}

// =======================================================
// FUNÇÕES EXISTENTES (mantidas)
// =======================================================

function fecharModalDetalhes() {
    document.getElementById('itemDetalhesModal').style.display = 'none';
    // Limpar dados do carrossel
    window.rkCarrosselData = null;
}

function iniciarTroca(itemRecebidoId) {
    fecharModalDetalhes();
    window.location.href = `/trocas/propor/${itemRecebidoId}`;
}

// Fechar modal ao clicar fora (mantido)
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
        if (modal && modal.style.display === 'flex' && window.rkCarrosselData) {
            if (e.key === 'ArrowLeft') {
                mudarImagem(-1);
            } else if (e.key === 'ArrowRight') {
                mudarImagem(1);
            } else if (e.key === 'Escape') {
                fecharModalDetalhes();
                fecharImagemExpandida();
            }
        }
    });
});