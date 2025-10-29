document.addEventListener('DOMContentLoaded', () => {
    // ==============================================================================
    // 1. VARIÁVEIS GLOBAIS
    // ==============================================================================
    const modalCadastro = document.getElementById('modal-cadastro');
    const modalGaleria = document.getElementById('modal-galeria-fotos');
    const modalTitulo = document.getElementById('modal-titulo');
    const formRoupa = document.getElementById('form-roupa');
    const itemIdInput = document.getElementById('item-id');
    const btnSubmit = document.getElementById('btn-submit');
    const btnFecharModalCadastro = document.getElementById('btn-fechar-modal');
    const btnFecharModalGaleria = document.getElementById('btn-fechar-galeria');
    const btnAbrirModalCadastro = document.getElementById('btn-abrir-modal');
    const fotosExistentesContainer = document.getElementById('fotos-existentes-container');
    const galeriaEdicao = document.getElementById('galeria-edicao');
    const fotosReordenadasInput = document.getElementById('fotos-reordenadas-json');
    const fotosRemovidasInput = document.getElementById('fotos-removidas-json');
    const imagensUploadInput = document.getElementById('imagens_upload');
    const uploadArea = document.getElementById('upload-area');
    const galeriaContainer = document.getElementById('galeria-container');
    const galeriaTitulo = document.getElementById('galeria-titulo');

    let sortable;

    // ==============================================================================
    // 2. FUNÇÕES AUXILIARES BÁSICAS
    // ==============================================================================

    const abrirModal = (modal) => {
        if (modal) {
            modal.style.display = 'block';
            console.log('📱 Modal aberto:', modal.id);
        } else {
            console.error('Tentativa de abrir modal inexistente');
        }
    };

    const fecharModal = (modal) => {
        if (modal) {
            modal.style.display = 'none';
            console.log(' Modal fechado:', modal.id);
        }
    };

    const resetarFormulario = () => {
        console.log(' Resetando formulário...');
        
        if (formRoupa) {
            formRoupa.reset();
            formRoupa.action = '/roupas/salvar';
        }
        if (itemIdInput) itemIdInput.value = '';
        if (modalTitulo) modalTitulo.textContent = 'Cadastrar Nova Peça';
        if (btnSubmit) btnSubmit.textContent = 'Cadastrar Roupa';
        if (fotosExistentesContainer) fotosExistentesContainer.style.display = 'none';
        if (galeriaEdicao) galeriaEdicao.innerHTML = '';
        if (imagensUploadInput) {
            imagensUploadInput.required = true;
            imagensUploadInput.disabled = false;
            imagensUploadInput.value = '';
        }
        
        // Reseta os campos de ordem
        if (fotosReordenadasInput) fotosReordenadasInput.value = '[]';
        if (fotosRemovidasInput) fotosRemovidasInput.value = '[]';
        
        // Destrói Sortable se existir
        if (sortable) {
            sortable.destroy();
            sortable = null;
        }
        
        console.log(' Formulário resetado para cadastro');
    };

    // ==============================================================================
    // 3. FUNÇÃO PRINCIPAL - ATUALIZAR ORDEM E CAPA
    // ==============================================================================

    const atualizarOrdemImagens = () => {
        if (!galeriaEdicao || !fotosReordenadasInput) return;

        const filhos = Array.from(galeriaEdicao.children);
        const ordem = [];

        filhos.forEach((container, index) => {
            const imgId = container.getAttribute('data-imagem-id');
            const caminho = container.getAttribute('data-caminho-arquivo');

            //  CAPTURA TANTO IMAGENS EXISTENTES QUANTO NOVAS
            if (imgId) {
                ordem.push({ id: imgId, caminho_arquivo: caminho });
            } else if (caminho) {
                // Para imagens novas no cadastro
                ordem.push({ caminho_arquivo: caminho });
            }

            //  LÓGICA CORRIGIDA - APLICA ESTILO DE CAPA NA PRIMEIRA IMAGEM
            const isCapa = index === 0;
            
            // Encontra os elementos dentro do container
            const label = container.querySelector('.foto-label');
            const removeBtn = container.querySelector('.remover-foto-btn');
            const ordemBadge = container.querySelector('.ordem-badge');

            // Atualiza badge de ordem
            if (ordemBadge) {
                ordemBadge.textContent = index + 1;
            }

            //  APLICA ESTILOS VISUAIS DIFERENCIADOS
            if (isCapa) {
                // ESTILO PARA CAPA
                container.style.border = '3px solid #9370DB';
                container.style.background = 'linear-gradient(135deg, #9370DB, #7B68EE)';
                container.style.boxShadow = '0 4px 15px rgba(147, 112, 219, 0.4)';
                container.style.transform = 'scale(1.05)';
                
                if (label) {
                    label.textContent = ' CAPA';
                    label.style.background = '#ffffff';
                    label.style.color = '#9370DB';
                    label.style.fontWeight = 'bold';
                    label.style.border = '2px solid #9370DB';
                }

                if (removeBtn) {
                    removeBtn.style.display = 'none';
                }

                if (ordemBadge) {
                    ordemBadge.style.background = '#9370DB';
                    ordemBadge.style.color = 'white';
                }
            } else {
                // ESTILO PARA IMAGENS NORMAIS
                container.style.border = '2px solid #e0e0e0';
                container.style.background = 'white';
                container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                container.style.transform = 'scale(1)';
                
                if (label) {
                    label.textContent = `Posição ${index + 1}`;
                    label.style.background = '#f8f9fa';
                    label.style.color = '#6c757d';
                    label.style.fontWeight = 'normal';
                    label.style.border = '1px solid #dee2e6';
                }

                if (removeBtn) {
                    removeBtn.style.display = 'flex';
                }

                if (ordemBadge) {
                    ordemBadge.style.background = '#6c757d';
                    ordemBadge.style.color = 'white';
                }
            }
        });

        // Atualiza o campo hidden
        fotosReordenadasInput.value = JSON.stringify(ordem);

        // Validações
        const totalImagens = filhos.length;
        if (imagensUploadInput) {
            imagensUploadInput.required = totalImagens === 0;
            imagensUploadInput.disabled = totalImagens >= 5;
        }

        if (fotosExistentesContainer) {
            fotosExistentesContainer.style.display = totalImagens > 0 ? 'block' : 'none';
        }

        console.log(` Ordem atualizada: ${ordem.length} imagens | Capa: ${ordem[0]?.id || 'Nenhuma'}`);
    };

    // ==============================================================================
    // 4. INICIALIZAR DRAG & DROP (PARA EDIÇÃO)
    // ==============================================================================

    const inicializarSortable = () => {
        if (!galeriaEdicao || typeof Sortable === 'undefined') return;

        try {
            if (sortable) sortable.destroy();

            sortable = new Sortable(galeriaEdicao, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: function() {
                    console.log(' Imagem reposicionada - atualizando ordem...');
                    atualizarOrdemImagens();
                }
            });
            console.log(' Sortable.js inicializado para edição');
        } catch (error) {
            console.error(' Erro no Sortable:', error);
        }
    };

    // ==============================================================================
    // 5. INICIALIZAR DRAG & DROP (PARA CADASTRO)
    // ==============================================================================

    const inicializarDragDropCadastro = () => {
        if (!galeriaEdicao || typeof Sortable === 'undefined') return;
        
        console.log(' Inicializando drag & drop para cadastro...');
        
        try {
            if (sortable) {
                sortable.destroy();
            }
            
            sortable = new Sortable(galeriaEdicao, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: function() {
                    console.log(' Imagem reposicionada no cadastro - atualizando ordem...');
                    atualizarOrdemImagens();
                }
            });
            
            console.log(' Drag & drop habilitado para cadastro');
        } catch (error) {
            console.error(' Erro ao inicializar drag & drop:', error);
        }
    };

    // ==============================================================================
    // 6. CONFIGURAR UPLOAD DE IMAGENS
    // ==============================================================================

    const configurarUpload = () => {
        if (!imagensUploadInput || !galeriaEdicao) return;

        imagensUploadInput.addEventListener('change', function(e) {
            // Remove apenas miniaturas de novos uploads (não as existentes do BD)
            Array.from(galeriaEdicao.children)
                .filter(child => !child.getAttribute('data-imagem-id'))
                .forEach(child => child.remove());

            const files = Array.from(this.files);
            const totalAtual = galeriaEdicao.children.length;
            const slotsDisponiveis = 5 - totalAtual;

            if (files.length > slotsDisponiveis) {
                alert(` Limite: ${slotsDisponiveis} foto(s) disponível(eis)`);
                return;
            }

            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    const container = document.createElement('div');
                    container.className = 'foto-edicao-item';
                    container.setAttribute('data-caminho-arquivo', file.name);
                    
                    container.innerHTML = `
                        <div class="ordem-badge">?</div>
                        <img src="${e.target.result}" alt="Nova imagem">
                        <span class="foto-label">NOVA</span>
                        <button type="button" class="remover-foto-btn" title="Remover">×</button>
                    `;

                    // Configurar remoção
                    const btn = container.querySelector('.remover-foto-btn');
                    btn.addEventListener('click', () => {
                        container.remove();
                        atualizarOrdemImagens();
                    });

                    galeriaEdicao.appendChild(container);
                };
                reader.readAsDataURL(file);
            });

            //  ATUALIZA ORDEM E INICIALIZA DRAG & DROP APÓS UPLOAD
            setTimeout(() => {
                const isEditing = itemIdInput.value !== '';
                if (isEditing) {
                    inicializarSortable(); // Para edição
                } else {
                    inicializarDragDropCadastro(); // Para cadastro
                }
                atualizarOrdemImagens();
            }, 100);
        });
    };

    // ==============================================================================
    // 7. POPULAR MODAL DE EDIÇÃO
    // ==============================================================================

    const popularModalEdicao = (item) => {
        console.log(' Editando item:', item.id);

        // Preencher campos do formulário
        if (itemIdInput) itemIdInput.value = item.id;
        ['peca', 'categoriaPeca', 'tipo', 'tamanho', 'cor', 'tecido', 'estacao', 'condicao', 'descricao'].forEach(campo => {
            const el = document.getElementById(campo);
            if (el) el.value = item[campo] || '';
        });

        // Configurar modal
        if (modalTitulo) modalTitulo.textContent = `Editar: ${item.peca}`;
        if (btnSubmit) btnSubmit.textContent = 'Salvar Alterações';
        if (formRoupa) formRoupa.action = '/roupas/salvar-edicao';

        // Configurar galeria
        if (galeriaEdicao && fotosExistentesContainer) {
            galeriaEdicao.innerHTML = '';
            if (fotosRemovidasInput) fotosRemovidasInput.value = '[]';
            if (imagensUploadInput) imagensUploadInput.value = '';

            const imagens = item.imagens || [];
            console.log(` Carregando ${imagens.length} imagens`);

            if (imagens.length > 0) {
                fotosExistentesContainer.style.display = 'block';

                imagens.forEach((img, index) => {
                    const container = document.createElement('div');
                    container.className = 'foto-edicao-item';
                    container.setAttribute('data-imagem-id', img.id);
                    container.setAttribute('data-caminho-arquivo', img.caminho_arquivo);
                    
                    const caminhoCompleto = img.caminho_url || img.caminho_arquivo;
                    const src = caminhoCompleto.startsWith('/') ? caminhoCompleto : '/uploads/' + caminhoCompleto;
                    
                    container.innerHTML = `
                        <div class="ordem-badge">${index + 1}</div>
                        <img src="${src}" alt="${item.peca}">
                        <span class="foto-label">${index === 0 ? ' CAPA' : `Pos ${index + 1}`}</span>
                        <button type="button" class="remover-foto-btn" title="Remover">×</button>
                    `;

                    // Configurar remoção
                    const btn = container.querySelector('.remover-foto-btn');
                    btn.addEventListener('click', () => {
                        if (confirm('Remover esta imagem?')) {
                            if (fotosRemovidasInput) {
                                const removidas = JSON.parse(fotosRemovidasInput.value);
                                removidas.push(img.id);
                                fotosRemovidasInput.value = JSON.stringify(removidas);
                            }
                            container.remove();
                            atualizarOrdemImagens();
                        }
                    });

                    galeriaEdicao.appendChild(container);
                });

                //  INICIALIZAR SORTABLE E ATUALIZAR ORDEM
                inicializarSortable();
                setTimeout(atualizarOrdemImagens, 100);
            } else {
                fotosExistentesContainer.style.display = 'none';
            }
        }

        if (modalCadastro) modalCadastro.style.display = 'block';
    };

    // ==============================================================================
    // 8. EVENT LISTENERS
    // ==============================================================================

    // Abrir modal de cadastro
    if (btnAbrirModalCadastro) {
        console.log(' Botão "Adicionar Roupa" encontrado, configurando evento...');
        
        btnAbrirModalCadastro.addEventListener('click', function(e) {
            e.preventDefault();
            console.log(' Botão "Adicionar Roupa" clicado!');
            
            resetarFormulario();
            abrirModal(modalCadastro);
            
            //  INICIALIZA DRAG & DROP APÓS ABRIR O MODAL (PARA CADASTRO)
            setTimeout(() => {
                inicializarDragDropCadastro();
                console.log(' Modal de cadastro pronto com drag & drop');
            }, 100);
        });
    } else {
        console.error(' Botão "Adicionar Roupa" NÃO encontrado no DOM!');
    }

    // Fechar modais
    if (btnFecharModalCadastro) {
        btnFecharModalCadastro.addEventListener('click', () => {
            fecharModal(modalCadastro);
            resetarFormulario();
        });
    }

    if (btnFecharModalGaleria) {
        btnFecharModalGaleria.addEventListener('click', () => fecharModal(modalGaleria));
    }

    // Clicar fora para fechar
    window.addEventListener('click', (e) => {
        if (e.target === modalCadastro) {
            fecharModal(modalCadastro);
            resetarFormulario();
        }
        if (e.target === modalGaleria) fecharModal(modalGaleria);
    });

    // Botões de editar
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-editar')) {
            e.preventDefault();
            const itemData = e.target.getAttribute('data-item');
            if (itemData) {
                try {
                    popularModalEdicao(JSON.parse(itemData));
                } catch (error) {
                    console.error(' Erro ao carregar item:', error);
                }
            }
        }

        // Botões de ver fotos
        if (e.target.classList.contains('btn-ver-fotos')) {
            e.preventDefault();
            const nome = e.target.getAttribute('data-peca-nome');
            const imagensJson = e.target.getAttribute('data-imagens');
            
            if (galeriaContainer && galeriaTitulo && imagensJson) {
                try {
                    galeriaContainer.innerHTML = '';
                    galeriaTitulo.textContent = `Fotos: ${nome}`;
                    
                    JSON.parse(imagensJson).forEach(src => {
                        const div = document.createElement('div');
                        div.innerHTML = `<img src="${src}" alt="${nome}" style="width:100%;height:150px;object-fit:cover;">`;
                        galeriaContainer.appendChild(div);
                    });
                    
                    abrirModal(modalGaleria);
                } catch (error) {
                    console.error(' Erro ao carregar galeria:', error);
                }
            }
        }
    });

    // Validação do formulário
    if (formRoupa) {
        formRoupa.addEventListener('submit', (e) => {
            const isEditing = itemIdInput.value !== '';
            
            //  GARANTIR QUE A ORDEM ESTÁ ATUALIZADA (PARA CRIAÇÃO TAMBÉM)
            atualizarOrdemImagens();

            const totalImagens = galeriaEdicao ? galeriaEdicao.children.length : 0;
            
            if (totalImagens === 0) {
                e.preventDefault();
                alert(' Adicione pelo menos uma foto');
                return;
            }

            if (totalImagens > 5) {
                e.preventDefault();
                alert(' Máximo de 5 imagens');
                return;
            }

            console.log(' Enviando formulário com ordem:', JSON.parse(fotosReordenadasInput.value));
        });
    }

    // ==============================================================================
    // 9. INICIALIZAÇÃO
    // ==============================================================================

    configurarUpload();
    console.log(' Sistema de roupas carregado');

    // Filtros ativos
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status') || 'Ativo';
    document.querySelectorAll('.filtro-item').forEach(filtro => {
        filtro.classList.remove('ativo');
    });
    
    const filtroAtivo = document.getElementById(
        status === 'Ativo' ? 'filtro-ativas' :
        status === 'EmTroca' ? 'filtro-emtroca' : 'filtro-historico-link'
    );
    if (filtroAtivo) filtroAtivo.classList.add('ativo');
});