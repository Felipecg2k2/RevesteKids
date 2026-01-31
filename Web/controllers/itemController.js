import { Op } from 'sequelize';
import { contarTrocasRealizadas, buscarHistoricoTrocas } from './trocaController.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db from '../models/index.js';
const { Item, Imagem, sequelize } = db;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =================================================================
// Variáveis de Configuração e Funções Auxiliares
// =================================================================
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'itens');

function getDB(req) {
    return req.app.get('db');
}

const excluirArquivo = (filename) => {
    if (!filename || filename.startsWith('http')) return;
    const nomeArquivo = path.basename(filename);
    const caminhoCompleto = path.join(UPLOADS_DIR, nomeArquivo);
    try {
        if (fs.existsSync(caminhoCompleto)) {
            fs.unlinkSync(caminhoCompleto);
            console.log(` Arquivo deletado do disco: ${caminhoCompleto}`);
        } else {
            console.warn(` Tentativa de deletar arquivo inexistente: ${caminhoCompleto}`);
        }
    } catch (error) {
        console.error(` ERRO FATAL ao tentar deletar arquivo ${caminhoCompleto}:`, error);
    }
}

// ----------------------------------------------------------
// LÓGICA REUTILIZÁVEL
// ----------------------------------------------------------
async function buscarContadores(DB, idUsuario) {
    const { Item } = DB;
    const totalAtivas = await Item.count({
        where: { UsuarioId: idUsuario, statusPosse: 'Ativo' }
    });
    const emTroca = await Item.count({
        where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' }
    });
    const trocasRealizadas = await contarTrocasRealizadas(idUsuario);
    return { totalAtivas, emTroca, trocasRealizadas };
}

// ----------------------------------------------------------
// 1. FUNÇÕES DE LEITURA E VISUALIZAÇÃO
// ----------------------------------------------------------
export const carregarFeed = async (req, res) => {
    const DB = getDB(req);
    const { Item, Usuario, Imagem } = DB;
    const userId = req.session.userId;
    const whereClause = {
        statusPosse: 'Ativo',
    };
    if (userId) {
        whereClause.UsuarioId = { [Op.ne]: userId };
    }
    try {
        const itensFeed = await Item.findAll({
            where: whereClause,
            attributes: [
                'id', 'peca', 'tamanho', 'condicao', 'descricao', 'createdAt', 'tipo', 'categoriaPeca', 'cor', 'tecido', 'estacao'
            ],
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['id', 'nome', 'cidade', 'estado', 'foto_perfil']
                },
                {
                    model: Imagem,
                    as: 'imagens',
                    required: false,
                    attributes: ['id', 'caminho_arquivo', 'is_principal', 'ordem']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        const itensProcessados = itensFeed.map(item => {
            const itemPlain = item.get({ plain: true });
            if (itemPlain.imagens && itemPlain.imagens.length > 0) {
                itemPlain.imagens.sort((a, b) => a.ordem - b.ordem);
                itemPlain.imagemPrincipal = itemPlain.imagens.find(img => img.is_principal)
                    || itemPlain.imagens[0];
            }
            return itemPlain;
        });

        res.render('feed', {
            itens: itensProcessados,
            title: 'Feed Principal',
            messages: req.flash()
        });
    } catch (error) {
        console.error(" ERRO FATAL AO CARREGAR O FEED:", error);
        req.flash('error', 'Ocorreu um erro ao carregar o Feed. Tente novamente mais tarde.');
        res.render('feed', { itens: [], title: 'Feed Principal', messages: req.flash() });
    }
};

export const getItensUsuario = async (req, res) => {
    const DB = getDB(req);
    const { Item, Imagem } = DB;
    const idUsuario = req.session.userId;
    const statusFiltro = req.query.status || 'Ativo';
    const mostrarHistorico = statusFiltro === 'Historico';
    let whereClause = { UsuarioId: idUsuario };
    
    if (statusFiltro === 'EmTroca') {
        whereClause.statusPosse = 'EmTroca';
    } else if (statusFiltro === 'Ativo') {
        whereClause.statusPosse = 'Ativo';
    }
    
    try {
        let itens = [];
        let historicoTrocas = [];
        
        if (mostrarHistorico) {
            historicoTrocas = await buscarHistoricoTrocas(idUsuario);
        } else {
            itens = await Item.findAll({
                where: whereClause,
                include: [
                    {
                        model: Imagem,
                        as: 'imagens',
                        required: false,
                        attributes: ['id', 'caminho_arquivo', 'is_principal', 'ordem'],
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            itens = itens.map(item => {
                if (item.imagens && item.imagens.length > 0) {
                    item.imagens.sort((a, b) => a.ordem - b.ordem);
                }
                return item;
            });

            console.log(' VERIFICAÇÃO DA ORDEM DAS IMAGENS:');
            itens.forEach(item => {
                if (item.imagens && item.imagens.length > 0) {
                    console.log(`Item ${item.id} - ${item.peca}:`);
                    item.imagens.forEach((img, index) => {
                        console.log(`  → Imagem ${index}: ID ${img.id}, Ordem ${img.ordem}, Principal ${img.is_principal}`);
                    });
                }
            });
        }

        const { totalAtivas, emTroca, trocasRealizadas } = await buscarContadores(DB, idUsuario);
        
        res.render('roupas', {
            title: 'Minhas Roupas',
            userId: idUsuario,
            itens: itens,
            totalCadastradas: totalAtivas + emTroca,
            totalAtivas: totalAtivas,
            emTroca: emTroca,
            trocasRealizadas: trocasRealizadas,
            itemParaEditar: null,
            filtroStatus: statusFiltro,
            mostrarHistorico: mostrarHistorico,
            historicoTrocas: historicoTrocas,
            messages: req.flash()
        });
    } catch (error) {
        console.error(" ERRO AO CARREGAR VIEW DE GERENCIAMENTO/HISTÓRICO:", error);
        req.flash('error_msg', 'Ocorreu um erro ao carregar seus itens.');
        res.redirect('/feed');
    }
};

export const getFormularioEdicao = async (req, res) => {
    const DB = getDB(req);
    const { Item, Imagem } = DB;
    const idItem = req.params.id;
    const idUsuario = req.session.userId;
    
    try {
        const item = await Item.findOne({
            where: {
                id: idItem,
                UsuarioId: idUsuario
            },
            include: [
                {
                    model: Imagem,
                    as: 'imagens',
                    attributes: ['id', 'caminho_arquivo', 'is_principal', 'ordem'],
                    required: false,
                }
            ]
        });

        if (!item) {
            req.flash('error_msg', 'Item não encontrado ou você não tem permissão para editá-lo.');
            return res.redirect('/roupas');
        }

        if (item.imagens && item.imagens.length > 0) {
            item.imagens.sort((a, b) => a.ordem - b.ordem);
            console.log(`🔄 Item ${item.id} - Imagens ordenadas:`, item.imagens.map(img => ({ id: img.id, ordem: img.ordem })));
        }

        const itensLista = await Item.findAll({
            where: { UsuarioId: idUsuario, statusPosse: { [Op.ne]: 'Historico' } },
            include: [
                {
                    model: Imagem,
                    as: 'imagens',
                    required: false,
                    attributes: ['id', 'caminho_arquivo', 'is_principal', 'ordem'],
                }
            ],
            order: [['createdAt', 'DESC']],
        });

        const itensListaOrdenados = itensLista.map(itemLista => {
            if (itemLista.imagens && itemLista.imagens.length > 0) {
                itemLista.imagens.sort((a, b) => a.ordem - b.ordem);
            }
            return itemLista;
        });

        const { totalAtivas, emTroca, trocasRealizadas } = await buscarContadores(DB, idUsuario);

        res.render('roupas', {
            title: 'Editar Peça',
            userId: idUsuario,
            itens: itensListaOrdenados,
            itemParaEditar: item.get({ plain: true }),
            totalCadastradas: totalAtivas + emTroca,
            totalAtivas: totalAtivas,
            emTroca: emTroca,
            trocasRealizadas: trocasRealizadas,
            filtroStatus: item.statusPosse || 'Ativo',
            mostrarHistorico: false,
            historicoTrocas: [],
            messages: req.flash()
        });
    } catch (error) {
        console.error(" ERRO AO BUSCAR ITEM PARA EDIÇÃO:", error);
        req.flash('error_msg', 'Erro ao carregar item para edição.');
        res.redirect('/roupas');
    }
};

// ----------------------------------------------------------
// 2. FUNÇÕES DE CRIAÇÃO E ATUALIZAÇÃO
// ----------------------------------------------------------
export const salvarEdicao = async (req, res) => {
    const { Item, Imagem, sequelize } = getDB(req);
    const {
        id, peca, categoriaPeca, tipo, tamanho, cor, tecido, estacao, condicao, descricao,
        fotos_reordenadas_json
    } = req.body;
    const novasFotosUpload = req.files || [];
    
    if (!id) {
        req.flash('error_msg', 'ID do Item não fornecido para edição.');
        novasFotosUpload.forEach(file => excluirArquivo(file.filename));
        return res.redirect('/roupas');
    }
    
    const t = await sequelize.transaction();
    try {
        // 1. ATUALIZAÇÃO DOS DADOS DO ITEM
        const dadosItem = {
            peca, categoriaPeca, tipo, tamanho, cor, tecido, estacao, condicao, descricao
        };
        await Item.update(dadosItem, {
            where: { id: id, UsuarioId: req.session.userId },
            transaction: t
        });

        // 2. PROCESSAMENTO DA GALERIA DE IMAGENS
        const imagensAtuaisBD = await Imagem.findAll({
            where: { ItemId: id },
            attributes: ['id', 'caminho_arquivo'],
            transaction: t
        });

        let fotosReordenadas = [];
        try {
            fotosReordenadas = JSON.parse(fotos_reordenadas_json || '[]');
        } catch (e) {
            console.error(' Erro ao analisar fotos_reordenadas_json:', e);
            throw new Error('Dados de imagem inválidos: JSON mal formatado.');
        }

        // 🔥 CORREÇÃO CRÍTICA: Filtrar apenas objetos com ID válido
        const idsReordenadosDoFrontend = new Set(
            fotosReordenadas
                .filter(img => img && img.id && img.id.toString() !== 'undefined')
                .map(img => img.id.toString())
        );

        let imagensParaDeletarFisico = [];

        const idsDeletarBD = imagensAtuaisBD
            .filter(img => !idsReordenadosDoFrontend.has(img.id.toString()))
            .map(img => {
                imagensParaDeletarFisico.push(img.caminho_arquivo);
                return img.id;
            });

        if (idsDeletarBD.length > 0) {
            await Imagem.destroy({
                where: { id: idsDeletarBD },
                transaction: t
            });
        }

        // Inserção das Novas Imagens
        let novosIdsInseridos = [];
        const imagensParaCriar = novasFotosUpload.map(file => ({
            ItemId: id,
            caminho_arquivo: `/uploads/itens/${file.filename}`,
            is_principal: false,
            ordem: 0
        }));

        if (imagensParaCriar.length > 0) {
            const novasImagensCriadas = await Imagem.bulkCreate(imagensParaCriar, {
                transaction: t
            });
            novosIdsInseridos = novasImagensCriadas.map(img => img.id.toString());
        }

        // CORREÇÃO: Definir ordemFinalIDs corretamente
        const idsReordenados = fotosReordenadas
            .filter(img => img && img.id)
            .map(f => f.id.toString());
        const ordemFinalIDs = [...idsReordenados, ...novosIdsInseridos];

        if (ordemFinalIDs.length === 0) {
            throw new Error('O item deve ter pelo menos uma imagem. Operação de galeria cancelada.');
        }

        if (ordemFinalIDs.length > 5) {
            novasFotosUpload.forEach(file => excluirArquivo(file.filename));
            throw new Error(`O número total de imagens (${ordemFinalIDs.length}) excede o limite de 5.`);
        }

        // Atualização da ordem e imagem principal
        for (let i = 0; i < ordemFinalIDs.length; i++) {
            const imagemId = ordemFinalIDs[i];
            const isPrincipal = i === 0;
            await Imagem.update(
                {
                    ordem: i,
                    is_principal: isPrincipal
                },
                {
                    where: { id: imagemId },
                    transaction: t
                }
            );
        }

        await t.commit();

        if (imagensParaDeletarFisico.length > 0) {
            imagensParaDeletarFisico.forEach(filename => excluirArquivo(filename));
        }

        req.flash('success_msg', 'Peça e galeria de fotos atualizadas com sucesso!');
        res.redirect('/roupas');

    } catch (error) {
        await t.rollback();
        console.error(` [ERRO - ${id}] Rollback executado:`, error.message);
        
        if (novasFotosUpload.length > 0) {
            novasFotosUpload.forEach(file => excluirArquivo(file.filename));
        }
        
        console.error(' Erro ao salvar edição do Item:', error);
        
        const errorMessage = error.message.includes('limite de 5')
            ? error.message
            : error.message.includes('pelo menos uma imagem')
                ? error.message
                : 'Erro ao salvar a edição. As alterações foram desfeitas.';
                
        req.flash('error_msg', errorMessage);
        res.redirect(`/roupas/editar/${id}`);
    }
};

// Lógica POST: CRIA UM NOVO ITEM (CREATE) - CORRIGIDA
export const salvarItem = async (req, res) => {
    console.log("🔍 INICIANDO salvarItem - DIAGNÓSTICO...");
    console.log("📦 req.body:", req.body);
    console.log("📦 req.files:", req.files ? req.files.length : 0, "arquivos");
    
    // DIAGNÓSTICO DETALHADO
    if (req.files && req.files.length > 0) {
        console.log("✅ ARQUIVOS RECEBIDOS:");
        req.files.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.originalname} -> ${file.filename}`);
        });
    } else {
        console.log("❌ NENHUM ARQUIVO RECEBIDO - PROBLEMA NO FRONTEND");
    }
    
    const DB = getDB(req);
    const { Item, Imagem } = DB;
    const idUsuario = req.session.userId;
    const dadosItem = req.body;
    const files = req.files;
    const itemId = dadosItem.id || null;
    
    console.log("👤 Usuario ID:", idUsuario);
    console.log("🆔 Item ID:", itemId);

    // Validação básica
    if (!dadosItem.peca || !dadosItem.tipo || !dadosItem.tamanho || !dadosItem.condicao || !dadosItem.categoriaPeca) {
        console.log("❌ VALIDAÇÃO FALHOU - Campos obrigatórios faltando");
        req.flash('error_msg', 'Todos os campos obrigatórios devem ser preenchidos.');
        if (files && files.length > 0) {
            files.forEach(file => {
                excluirArquivo(file.filename);
            });
        }
        return res.redirect(itemId ? `/roupas/editar/${itemId}` : '/roupas');
    }

    // 🔥 CORREÇÃO: Validação mais inteligente para fotos
    const temArquivosReais = files && files.length > 0;
    const temImagensNaGaleria = dadosItem.fotos_reordenadas_json && 
                                JSON.parse(dadosItem.fotos_reordenadas_json || '[]').length > 0;

    if (!itemId && !temArquivosReais && !temImagensNaGaleria) {
        console.log("❌ VALIDAÇÃO FALHOU - Nenhuma foto enviada");
        req.flash('error_msg', 'É obrigatório anexar pelo menos uma foto ao cadastrar uma nova peça.');
        return res.redirect('/roupas');
    }

    // 🔥 CORREÇÃO CRÍTICA: campo 'cor' estava como 'coro'
    const itemDados = {
        peca: dadosItem.peca,
        categoriaPeca: dadosItem.categoriaPeca,
        tipo: dadosItem.tipo,
        tamanho: dadosItem.tamanho,
        cor: dadosItem.cor, // 🔥 CORRIGIDO: era 'coro'
        tecido: dadosItem.tecido,
        estacao: dadosItem.estacao,
        condicao: dadosItem.condicao,
        descricao: dadosItem.descricao,
        UsuarioId: idUsuario,
    };

    try {
        if (itemId) {
            // UPDATE
            await Item.update(itemDados, {
                where: { id: itemId, UsuarioId: idUsuario }
            });
            req.flash('success_msg', 'Item atualizado com sucesso!');
            
            if (files && files.length > 0) {
                req.flash('warning', 'Use o modal de edição para gerenciar fotos.');
                files.forEach(file => excluirArquivo(file.filename));
            }
        } else {
            // CREATE
            const itemParaCriar = { ...itemDados, statusPosse: 'Ativo' };
            const novoItem = await Item.create(itemParaCriar);
            
            console.log(`🆕 Novo item criado com ID: ${novoItem.id}`);
            
            if (files && files.length > 0) {
                console.log(`📸 Criando ${files.length} registros de imagem...`);
                const imagensParaCriar = files.map((file, index) => ({
                    ItemId: novoItem.id,
                    caminho_arquivo: `/uploads/itens/${file.filename}`,
                    is_principal: index === 0,
                    ordem: index
                }));

                await Imagem.bulkCreate(imagensParaCriar);
                req.flash('success_msg', 'Nova peça cadastrada com sucesso!');
            } else if (temImagensNaGaleria) {
                // 🔥 NOVA LÓGICA: Se há imagens na galeria mas não arquivos, cria placeholder
                console.log("🖼️  Criando placeholder para imagens da galeria...");
                await Imagem.create({
                    ItemId: novoItem.id,
                    caminho_arquivo: '/uploads/itens/default-image.jpg',
                    is_principal: true,
                    ordem: 0
                });
                req.flash('success_msg', 'Nova peça cadastrada! (Configure as imagens na edição)');
            } else {
                // Fallback: sempre cria pelo menos uma imagem
                console.log("🖼️  Criando imagem padrão de fallback...");
                await Imagem.create({
                    ItemId: novoItem.id,
                    caminho_arquivo: '/uploads/itens/default-image.jpg',
                    is_principal: true,
                    ordem: 0
                });
                req.flash('success_msg', 'Nova peça cadastrada com imagem padrão!');
            }
        }
        res.redirect('/roupas');
    } catch (error) {
        console.error(`💥 ERRO AO SALVAR ITEM:`, error);

        if (files) {
            files.forEach(file => {
                excluirArquivo(file.filename);
            });
        }

        req.flash('error_msg', 'Erro interno ao salvar o item.');
        res.redirect('/roupas');
    }
};

// ----------------------------------------------------------
// 3. FUNÇÕES DE EXCLUSÃO
// ----------------------------------------------------------
export const excluirItem = async (req, res) => {
    const DB = getDB(req);
    const { Item, Imagem } = DB;
    const idItem = req.params.id;
    const idUsuario = req.session.userId;

    try {
        const item = await Item.findOne({
            where: { id: idItem, UsuarioId: idUsuario },
            include: [{ model: Imagem, as: 'imagens', attributes: ['caminho_arquivo'] }]
        });

        if (!item) {
            req.flash('error_msg', 'Item não encontrado ou você não tem permissão.');
            return res.redirect('/roupas');
        }

        if (item.statusPosse !== 'Ativo') {
            req.flash('error_msg', 'Esta peça não pode ser excluída pois está envolvida em uma troca pendente.');
            return res.redirect('/roupas?status=EmTroca');
        }

        item.imagens.forEach(img => {
            excluirArquivo(img.caminho_arquivo);
        });

        const rowsDeleted = await Item.destroy({
            where: { id: idItem, UsuarioId: idUsuario }
        });

        if (rowsDeleted > 0) {
            req.flash('success_msg', `Peça "${item.peca}" excluída com sucesso!`);
        } else {
            req.flash('error_msg', 'O item não pôde ser excluído.');
        }

        res.redirect('/roupas');
    } catch (error) {
        console.error(" ERRO AO EXCLUIR ITEM:", error);
        req.flash('error_msg', 'Erro interno ao tentar excluir o item.');
        res.redirect('/roupas');
    }
};

// 🔥 NOVA FUNÇÃO: Cadastro via AJAX (para o frontend atualizado)
export const salvarItemAjax = async (req, res) => {
    console.log("📦 INICIANDO salvarItemAjax...");
    console.log(" req.body:", req.body);
    console.log(" req.files:", req.files ? req.files.length : 0, "arquivos");
    
    const DB = getDB(req);
    const { Item, Imagem } = DB;
    const idUsuario = req.session.userId;
    const dadosItem = req.body;
    const files = req.files;

    try {
        // Validação básica
        if (!dadosItem.peca || !dadosItem.tipo || !dadosItem.tamanho || !dadosItem.condicao || !dadosItem.categoriaPeca) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos os campos obrigatórios devem ser preenchidos.' 
            });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'É obrigatório anexar pelo menos uma foto.' 
            });
        }

        const itemParaCriar = { 
            peca: dadosItem.peca,
            categoriaPeca: dadosItem.categoriaPeca,
            tipo: dadosItem.tipo,
            tamanho: dadosItem.tamanho,
            cor: dadosItem.cor,
            tecido: dadosItem.tecido,
            estacao: dadosItem.estacao,
            condicao: dadosItem.condicao,
            descricao: dadosItem.descricao,
            UsuarioId: idUsuario,
            statusPosse: 'Ativo'
        };
        
        const novoItem = await Item.create(itemParaCriar);
        
        const imagensParaCriar = files.map((file, index) => ({
            ItemId: novoItem.id,
            caminho_arquivo: `/uploads/itens/${file.filename}`,
            is_principal: index === 0,
            ordem: index
        }));

        await Imagem.bulkCreate(imagensParaCriar);
        
        res.json({ 
            success: true, 
            message: 'Nova peça cadastrada com sucesso!',
            itemId: novoItem.id
        });
        
    } catch (error) {
        console.error("ERRO NO salvarItemAjax:", error);
        
        if (files) {
            files.forEach(file => {
                excluirArquivo(file.filename);
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno ao cadastrar o item.' 
        });
    }
};