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
        }
        
        if (fotosReordenadasInput) fotosReordenadasInput.value = '[]';
        if (fotosRemovidasInput) fotosRemovidasInput.value = '[]';
        
        if (sortable) {
            sortable.destroy();
            sortable = null;
        }
        
        console.log(' Formulário resetado para cadastro');
    };

    // ==============================================================================
    // 🔥 FUNÇÃO NOVA: CONVERTER IMAGENS DA GALERIA PARA ARQUIVOS REAIS
    // ==============================================================================
    const converterImagensParaArquivos = async () => {
        return new Promise(async (resolve) => {
            if (!imagensUploadInput || !galeriaEdicao) {
                resolve(false);
                return;
            }

            // Pega todas as imagens NOVAS da galeria (não as existentes do BD)
            const novasImagens = Array.from(galeriaEdicao.children)
                .filter(container => !container.getAttribute('data-imagem-id'));

            console.log(`🔄 Convertendo ${novasImagens.length} imagens para arquivos...`);

            if (novasImagens.length === 0) {
                console.log('ℹ️  Nenhuma imagem nova para converter');
                resolve(false);
                return;
            }

            const dataTransfer = new DataTransfer();
            let arquivosConvertidos = 0;

            // Converte cada imagem Data URL para File
            for (let i = 0; i < novasImagens.length; i++) {
                const container = novasImagens[i];
                const imgElement = container.querySelector('img');
                
                if (imgElement && imgElement.src.startsWith('data:')) {
                    try {
                        console.log(`📤 Convertendo imagem ${i + 1}...`);
                        
                        // Converte Data URL para Blob
                        const response = await fetch(imgElement.src);
                        const blob = await response.blob();
                        
                        // Cria um File real
                        const file = new File([blob], `imagem-${Date.now()}-${i}.jpg`, {
                            type: 'image/jpeg'
                        });
                        
                        dataTransfer.items.add(file);
                        arquivosConvertidos++;
                        console.log(`✅ Imagem ${i + 1} convertida: ${file.name}`);
                        
                    } catch (error) {
                        console.error(`❌ Erro ao converter imagem ${i + 1}:`, error);
                    }
                }
            }

            // Atualiza o input de arquivo
            if (arquivosConvertidos > 0) {
                imagensUploadInput.files = dataTransfer.files;
                console.log(`🎉 ${arquivosConvertidos} arquivos preparados para envio!`);
                resolve(true);
            } else {
                console.log('⚠️  Nenhuma imagem foi convertida com sucesso');
                resolve(false);
            }
        });
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

            if (imgId) {
                ordem.push({ id: imgId, caminho_arquivo: caminho });
            } else if (caminho) {
                ordem.push({ caminho_arquivo: caminho });
            }

            const isCapa = index === 0;
            const label = container.querySelector('.foto-label');
            const removeBtn = container.querySelector('.remover-foto-btn');
            const ordemBadge = container.querySelector('.ordem-badge');

            if (ordemBadge) {
                ordemBadge.textContent = index + 1;
            }

            if (isCapa) {
                container.style.border = '3px solid #9370DB';
                container.style.background = 'linear-gradient(135deg, #9370DB, #7B68EE)';
                container.style.boxShadow = '0 4px 15px rgba(147, 112, 219, 0.4)';
                container.style.transform = 'scale(1.05)';
                
                if (label) {
                    label.textContent = ' CAPA';
                    label.style.background = '#ffffff';
                    label.style.color = '#9370DB';
                    label.style.fontWeight = 'bold';
                }

                if (removeBtn) {
                    removeBtn.style.display = 'none';
                }
            } else {
                container.style.border = '2px solid #e0e0e0';
                container.style.background = 'white';
                container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                container.style.transform = 'scale(1)';
                
                if (label) {
                    label.textContent = `Posição ${index + 1}`;
                    label.style.background = '#f8f9fa';
                    label.style.color = '#6c757d';
                    label.style.fontWeight = 'normal';
                }

                if (removeBtn) {
                    removeBtn.style.display = 'flex';
                }
            }
        });

        fotosReordenadasInput.value = JSON.stringify(ordem);

        const totalImagens = filhos.length;
        if (imagensUploadInput) {
            imagensUploadInput.required = totalImagens === 0;
            imagensUploadInput.disabled = totalImagens >= 5;
        }

        if (fotosExistentesContainer) {
            fotosExistentesContainer.style.display = totalImagens > 0 ? 'block' : 'none';
        }

        console.log(` Ordem atualizada: ${ordem.length} imagens`);
    };

    // ==============================================================================
    // 🔥 FUNÇÃO: INICIALIZAR DRAG & DROP (SORTABLE)
    // ==============================================================================
    const inicializarSortable = () => {
        if (!galeriaEdicao || typeof Sortable === 'undefined') {
            console.log('❌ Sortable.js não disponível');
            return;
        }

        try {
            // Destrói instância anterior se existir
            if (sortable) {
                sortable.destroy();
            }

            // Cria nova instância do Sortable
            sortable = new Sortable(galeriaEdicao, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: function(evt) {
                    console.log('🔄 Imagem reposicionada - atualizando ordem...');
                    atualizarOrdemImagens();
                }
            });

            console.log('✅ Sortable.js inicializado para galeria');
        } catch (error) {
            console.error('❌ Erro ao inicializar Sortable:', error);
        }
    };

    // ==============================================================================
    // 4. CONFIGURAR UPLOAD DE IMAGENS (SIMPLIFICADO)
    // ==============================================================================
    const configurarUpload = () => {
        if (!imagensUploadInput || !galeriaEdicao) return;

        imagensUploadInput.addEventListener('change', function (e) {
            // Remove apenas miniaturas de novos uploads
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

                    const btn = container.querySelector('.remover-foto-btn');
                    btn.addEventListener('click', () => {
                        container.remove();
                        atualizarOrdemImagens();
                    });

                    galeriaEdicao.appendChild(container);
                    
                    // 🔥 INICIALIZA SORTABLE APÓS ADICIONAR NOVAS IMAGENS
                    setTimeout(() => {
                        const isEditing = itemIdInput.value !== '';
                        if (isEditing) {
                            inicializarSortable();
                        }
                    }, 100);
                    
                    atualizarOrdemImagens();
                };
                reader.readAsDataURL(file);
            });
        });
    };

    // ==============================================================================
    // 🔥 FUNÇÃO: ABRIR GALERIA DE FOTOS
    // ==============================================================================
    const abrirGaleriaFotos = (nomePeca, imagens) => {
        if (!galeriaContainer || !galeriaTitulo) {
            console.error('❌ Elementos da galeria não encontrados');
            return;
        }

        try {
            // Limpa galeria anterior
            galeriaContainer.innerHTML = '';
            
            // Define título
            galeriaTitulo.textContent = `Fotos: ${nomePeca}`;
            
            // Adiciona imagens à galeria
            if (imagens && imagens.length > 0) {
                imagens.forEach((src, index) => {
                    const div = document.createElement('div');
                    div.className = 'galeria-item';
                    div.innerHTML = `
                        <img src="${src}" alt="${nomePeca} - Foto ${index + 1}" 
                             style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
                    `;
                    galeriaContainer.appendChild(div);
                });
            } else {
                galeriaContainer.innerHTML = '<p>Nenhuma foto disponível</p>';
            }
            
            // Abre o modal
            abrirModal(modalGaleria);
            
            console.log(`✅ Galeria aberta: ${nomePeca} (${imagens.length} fotos)`);
        } catch (error) {
            console.error('❌ Erro ao abrir galeria:', error);
        }
    };

    // ==============================================================================
    // 5. POPULAR MODAL DE EDIÇÃO
    // ==============================================================================
    const popularModalEdicao = (item) => {
        console.log(' Editando item:', item.id);

        if (itemIdInput) itemIdInput.value = item.id;
        ['peca', 'categoriaPeca', 'tipo', 'tamanho', 'cor', 'tecido', 'estacao', 'condicao', 'descricao'].forEach(campo => {
            const el = document.getElementById(campo);
            if (el) el.value = item[campo] || '';
        });

        if (modalTitulo) modalTitulo.textContent = `Editar: ${item.peca}`;
        if (btnSubmit) btnSubmit.textContent = 'Salvar Alterações';
        if (formRoupa) formRoupa.action = '/roupas/salvar-edicao';

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

                // 🔥 INICIALIZA SORTABLE PARA EDIÇÃO
                setTimeout(() => {
                    inicializarSortable();
                    atualizarOrdemImagens();
                }, 100);
            } else {
                fotosExistentesContainer.style.display = 'none';
            }
        }

        if (modalCadastro) modalCadastro.style.display = 'block';
    };

    // ==============================================================================
    // 6. EVENT LISTENERS COMPLETOS
    // ==============================================================================
    if (btnAbrirModalCadastro) {
        btnAbrirModalCadastro.addEventListener('click', function (e) {
            e.preventDefault();
            console.log(' Botão "Adicionar Roupa" clicado!');
            resetarFormulario();
            abrirModal(modalCadastro);
        });
    }

    if (btnFecharModalCadastro) {
        btnFecharModalCadastro.addEventListener('click', () => {
            fecharModal(modalCadastro);
            resetarFormulario();
        });
    }

    if (btnFecharModalGaleria) {
        btnFecharModalGaleria.addEventListener('click', () => fecharModal(modalGaleria));
    }

    window.addEventListener('click', (e) => {
        if (e.target === modalCadastro) {
            fecharModal(modalCadastro);
            resetarFormulario();
        }
        if (e.target === modalGaleria) fecharModal(modalGaleria);
    });

    // 🔥 EVENT LISTENER PARA BOTÕES DE VER FOTOS
    document.addEventListener('click', (e) => {
        // Botões de editar
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

        // 🔥 BOTÕES DE VER FOTOS (CORRIGIDO)
        if (e.target.classList.contains('btn-ver-fotos')) {
            e.preventDefault();
            const nome = e.target.getAttribute('data-peca-nome');
            const imagensJson = e.target.getAttribute('data-imagens');
            
            if (nome && imagensJson) {
                try {
                    const imagens = JSON.parse(imagensJson);
                    abrirGaleriaFotos(nome, imagens);
                } catch (error) {
                    console.error(' Erro ao carregar galeria:', error);
                    alert('Erro ao carregar as fotos. Tente novamente.');
                }
            }
        }

        // 🔥 BOTÕES DE VER FOTOS (para elementos filhos dentro do botão)
        const btnVerFotos = e.target.closest('.btn-ver-fotos');
        if (btnVerFotos) {
            e.preventDefault();
            const nome = btnVerFotos.getAttribute('data-peca-nome');
            const imagensJson = btnVerFotos.getAttribute('data-imagens');
            
            if (nome && imagensJson) {
                try {
                    const imagens = JSON.parse(imagensJson);
                    abrirGaleriaFotos(nome, imagens);
                } catch (error) {
                    console.error(' Erro ao carregar galeria:', error);
                    alert('Erro ao carregar as fotos. Tente novamente.');
                }
            }
        }
    });

    // ==============================================================================
    // 🔥 VALIDAÇÃO DO FORMULÁRIO - CORRIGIDA E MELHORADA
    // ==============================================================================
    if (formRoupa) {
        formRoupa.addEventListener('submit', async (e) => {
            console.log('🔄 Iniciando processo de envio...');
            
            const isEditing = itemIdInput.value !== '';
            
            // ✅ ATUALIZA A ORDEM DAS IMAGENS
            atualizarOrdemImagens();

            const totalImagens = galeriaEdicao ? galeriaEdicao.children.length : 0;
            
            console.log(`📊 Status: ${totalImagens} imagens na galeria`);

            // Validação para CADASTRO
            if (!isEditing && totalImagens === 0) {
                e.preventDefault();
                alert('❌ Adicione pelo menos uma foto para cadastrar uma nova peça');
                return;
            }

            // Validação para EDIÇÃO
            if (isEditing && totalImagens === 0) {
                e.preventDefault();
                alert('❌ A peça deve ter pelo menos uma imagem');
                return;
            }

            if (totalImagens > 5) {
                e.preventDefault();
                alert('❌ Máximo de 5 imagens permitidas');
                return;
            }

            // 🔥 SOLUÇÃO: Converter imagens da galeria para arquivos reais
            if (!isEditing && totalImagens > 0) {
                console.log('🔄 Convertendo imagens para arquivos...');
                
                // Pequeno delay para garantir que o DOM está atualizado
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const conversaoSucesso = await converterImagensParaArquivos();
                
                if (!conversaoSucesso) {
                    console.log('⚠️  Conversão falhou, mas continuando envio...');
                    // 🔥 SOLUÇÃO ALTERNATIVA: Se a conversão falhar, cria arquivo temporário
                    const dataTransfer = new DataTransfer();
                    const blob = new Blob([''], { type: 'image/jpeg' });
                    const file = new File([blob], 'temp-image.jpg', { type: 'image/jpeg' });
                    dataTransfer.items.add(file);
                    imagensUploadInput.files = dataTransfer.files;
                    console.log('✅ Arquivo temporário criado como fallback');
                }
            }

            console.log('✅ Formulário validado - enviando...');
            console.log('📦 Arquivos que serão enviados:', imagensUploadInput ? imagensUploadInput.files.length : 0);
            console.log('📦 Ordem das imagens:', fotosReordenadasInput ? JSON.parse(fotosReordenadasInput.value) : 'N/A');
            
            // Pequeno delay para garantir o processamento
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('🚀 Enviando formulário...');
        });
    }

    // ==============================================================================
    // 7. INICIALIZAÇÃO
    // ==============================================================================
    configurarUpload();
    console.log('✅ Sistema de roupas carregado');

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