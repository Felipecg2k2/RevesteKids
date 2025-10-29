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
// Define o caminho ABSOLUTO para o diretório de uploads: .../Web/public/uploads/itens
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'itens');
// Função para buscar o objeto DB centralizado
function getDB(req) {
    // Retorna o objeto DB configurado em app.js (contendo Item, Usuario, Imagem, etc.)
    return req.app.get('db');
};
// Função de exclusão de arquivo (para remover arquivos antigos do disco)
const excluirArquivo = (filename) => {
    // filename é o valor de caminho_arquivo (ex: '/uploads/itens/item-123.jpg')
    if (!filename || filename.startsWith('http')) return;
    // O caminho_arquivo salvo no BD inclui o prefixo /uploads/itens/
    // Se o caminho salvo for: /uploads/itens/item-123.jpg, extraímos apenas o nome do arquivo
    const nomeArquivo = path.basename(filename);
    // Constrói o caminho completo no disco
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
// LÓGICA REUTILIZÁVEL (Contadores e Buscas)
// ----------------------------------------------------------
// Função auxiliar para buscar contadores (Reutilizada em várias rotas)
async function buscarContadores(DB, idUsuario) {
    const { Item } = DB; // Desestrutura o Item do DB
    const totalAtivas = await Item.count({
        where: { UsuarioId: idUsuario, statusPosse: 'Ativo' }
    });
    const emTroca = await Item.count({
        where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' }
    });
    const trocasRealizadas = await contarTrocasRealizadas(idUsuario); // Chamada à função externa
    return { totalAtivas, emTroca, trocasRealizadas };
};

// ----------------------------------------------------------
// 1. FUNÇÕES DE LEITURA E VISUALIZAÇÃO
// ----------------------------------------------------------
// LÓGICA GET: CARREGAR O FEED PRINCIPAL
export const carregarFeed = async (req, res) => {
    const DB = getDB(req);
    const { Item, Usuario, Imagem } = DB;
    const userId = req.session.userId;
    // Se o usuário não estiver logado, ele pode ver o feed, mas não pode filtrar por si mesmo.
    const whereClause = {
        statusPosse: 'Ativo',
    };
    if (userId) {
        whereClause.UsuarioId = { [Op.ne]: userId }; // Exclui itens do próprio usuário
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
                    //Remove o filtro de imagem principal para pegar TODAS as imagens
                    required: false, // Usa LEFT JOIN
                    attributes: ['id', 'caminho_arquivo', 'is_principal', 'ordem']
                }
            ],
            order: [
                ['createdAt', 'DESC']
            ]
        });
        // Processar as imagens para ordenação
        const itensProcessados = itensFeed.map(item => {
            const itemPlain = item.get({ plain: true });
            // Ordenar imagens pela ordem
            if (itemPlain.imagens && itemPlain.imagens.length > 0) {
                itemPlain.imagens.sort((a, b) => a.ordem - b.ordem);

                // Encontrar imagem principal (ou usar a primeira)
                itemPlain.imagemPrincipal = itemPlain.imagens.find(img => img.is_principal)
                    || itemPlain.imagens[0];
            }
            return itemPlain;
        });
        // VIEW: Renderiza o Feed
        res.render('feed', {
            itens: itensProcessados,
            title: 'Feed Principal',
            messages: req.flash()
        });
    } catch (error) {
        console.error(" ERRO FATAL AO CARREGAR O FEED:", error);
        req.flash('error', 'Ocorreu um erro ao carregar o Feed. Tente novamente mais tarde.');
        // Renderiza com feed vazio em caso de erro
        res.render('feed', { itens: [], title: 'Feed Principal', messages: req.flash() });
    }
};
// Lógica GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO (READ ALL)
export const getItensUsuario = async (req, res) => {
    const DB = getDB(req);
    const { Item, Imagem } = DB;
    const idUsuario = req.session.userId;
    // Filtros
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
            // ORDENAR MANUALMENTE AS IMAGENS
            itens = itens.map(item => {
                if (item.imagens && item.imagens.length > 0) {
                    // Ordenar as imagens pela ordem ASC
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
        // Contadores
        const { totalAtivas, emTroca, trocasRealizadas } = await buscarContadores(DB, idUsuario);
        // VIEW
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
// Lógica GET: BUSCAR ITEM PARA EDIÇÃO (READ ONE)
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
                    // order daqui - não está funcionando
                }
            ]
        });
        if (!item) {
            req.flash('error_msg', 'Item não encontrado ou você não tem permissão para editá-lo.');
            return res.redirect('/roupas');
        }
        // ORDENAR MANUALMENTE AS IMAGENS DO ITEM
        if (item.imagens && item.imagens.length > 0) {
            item.imagens.sort((a, b) => a.ordem - b.ordem);
            console.log(`🔄 Item ${item.id} - Imagens ordenadas:`, item.imagens.map(img => ({ id: img.id, ordem: img.ordem })));
        }
        // Recarrega todos os itens para a lista lateral/card
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
        // VIEW
        res.render('roupas', {
            title: 'Editar Peça',
            userId: idUsuario,
            itens: itensListaOrdenados, //  Usar a lista ordenada
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
// Lógica POST: ATUALIZAÇÃO DO ITEM (EDIÇÃO DE METADADOS E IMAGENS)
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
        // 1. ATUALIZAÇÃO DOS DADOS DO ITEM (Metadados)
        const dadosItem = {
            peca, categoriaPeca, tipo, tamanho, cor, tecido, estacao, condicao, descricao
        };
        await Item.update(dadosItem, {
            where: { id: id, UsuarioId: req.session.userId }, // Garante que o usuário é o dono
            transaction: t
        });
        // 2. PROCESSAMENTO DA GALERIA DE IMAGENS
        // A. Carrega as imagens ATUAIS do BD antes de qualquer mudança (para identificar o que deletar)
        const imagensAtuaisBD = await Imagem.findAll({
            where: { ItemId: id },
            attributes: ['id', 'caminho_arquivo'],
            transaction: t
        });
        // B. Parse do JSON enviado pelo frontend (a nova ordem das imagens ANTIGAS)
        let fotosReordenadas = [];
        try {
            fotosReordenadas = JSON.parse(fotos_reordenadas_json || '[]');
        } catch (e) {
            console.error(' Erro ao analisar fotos_reordenadas_json:', e);
            throw new Error('Dados de imagem inválidos: JSON mal formatado.');
        }
        // IDs das fotos antigas que devem PERMANECER (vieram no JSON)
        const idsReordenadosDoFrontend = new Set(fotosReordenadas.map(img => img.id.toString()));
        let imagensParaDeletarFisico = []; // Caminhos a serem deletados do disco
        // Itera sobre o BD para encontrar quais IDs foram removidos pelo frontend
        const idsDeletarBD = imagensAtuaisBD
            .filter(img => !idsReordenadosDoFrontend.has(img.id.toString()))
            .map(img => {
                imagensParaDeletarFisico.push(img.caminho_arquivo); // Adiciona para exclusão física
                return img.id; // Retorna o ID para exclusão do BD
            });
        //EXCLUIR REGISTROS REMOVIDOS DO BANCO DE DADOS (DENTRO DA TRANSAÇÃO)
        if (idsDeletarBD.length > 0) {
            await Imagem.destroy({
                where: { id: idsDeletarBD },
                transaction: t
            });
        }
        // --- ADIÇÃO: Inserção das Novas Imagens (Upload) ---
        let novosIdsInseridos = []; // Array para guardar os IDs das novas fotos inseridas
        const imagensParaCriar = novasFotosUpload.map(file => ({
            ItemId: id,
            // Salva o caminho que será servido pelo Express: /uploads/itens/nome_do_arquivo.png
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
        // --- REORDENAÇÃO E DEFINIÇÃO DA PRINCIPAL ---
        // D. Monta a ORDEM FINAL DE IDs
        // 1. Ids que vieram do frontend (reordenados)
        const idsReordenados = fotosReordenadas.map(f => f.id.toString());
        // 2. A ordem final é a reordenada (antigas) + as novas (nesta sequência)
        // O item DEVE ter pelo menos 1 foto.
        if (ordemFinalIDs.length === 0) {
            throw new Error('O item deve ter pelo menos uma imagem. Operação de galeria cancelada.');
        }
        // 3. Verifica o limite de 5 imagens
        if (ordemFinalIDs.length > 5) {
            // Se o limite for ultrapassado, cancelamos tudo e limpamos os novos uploads
            novasFotosUpload.forEach(file => excluirArquivo(file.filename));
            throw new Error(`O número total de imagens (${ordemFinalIDs.length}) excede o limite de 5. Por favor, remova fotos antigas ou diminua o número de novos uploads.`);
        }
        // 4. ATUALIZAÇÃO DA ORDEM E IMAGEM PRINCIPAL
        // Atualiza cada imagem com sua ordem e define a principal
        for (let i = 0; i < ordemFinalIDs.length; i++) {
            const imagemId = ordemFinalIDs[i];
            const isPrincipal = i === 0;
            await Imagem.update(
                {
                    ordem: i, // ATUALIZA A ORDEM!
                    is_principal: isPrincipal
                },
                {
                    where: { id: imagemId },
                    transaction: t
                }
            );
        }
        // 5. COMITAR TRANSAÇÃO
        await t.commit();
        // 6. EXCLUSÃO FÍSICA NO DISCO (APÓS COMMIT BEM SUCEDIDO)
        if (imagensParaDeletarFisico.length > 0) {
            imagensParaDeletarFisico.forEach(filename => excluirArquivo(filename));
        }
        req.flash('success_msg', 'Peça e galeria de fotos atualizadas com sucesso!');
        res.redirect('/roupas');

    } catch (error) {
        // Se algo falhou, faz rollback no BD e limpa os arquivos recém-uploadados
        await t.rollback();
        console.error(` [ERRO - ${id}] Rollback executado:`, error.message);
        // Limpa os novos arquivos recém-upados (novasFotosUpload) 
        if (novasFotosUpload.length > 0) {
            novasFotosUpload.forEach(file => excluirArquivo(file.filename));
        }
        console.error(' Erro ao salvar edição do Item:', error);
        // Define a mensagem de erro
        const errorMessage = error.message.includes('limite de 5')
            ? error.message
            : error.message.includes('pelo menos uma imagem')
                ? error.message
                : 'Erro ao salvar a edição. As alterações foram desfeitas.';
        req.flash('error_msg', errorMessage);
        // Redireciona de volta ao formulário de edição
        res.redirect(`/roupas/editar/${id}`);
    }
};
// Lógica POST: CRIA UM NOVO ITEM (CREATE)
export const salvarItem = async (req, res) => {
    console.log(" INICIANDO salvarItem...");
    console.log(" req.body:", req.body);
    console.log(" req.files:", req.files ? req.files.length : 0, "arquivos");
    const DB = getDB(req);
    const { Item, Imagem } = DB;
    const idUsuario = req.session.userId;
    const dadosItem = req.body;
    const files = req.files;
    const itemId = dadosItem.id || null;
    console.log(" Usuario ID:", idUsuario);
    console.log(" Item ID:", itemId);
    // Validação básica
    if (!dadosItem.peca || !dadosItem.tipo || !dadosItem.tamanho || !dadosItem.condicao || !dadosItem.categoriaPeca) {
        console.log(" VALIDAÇÃO FALHOU - Campos obrigatórios faltando");
        req.flash('error_msg', 'Todos os campos obrigatórios devem ser preenchidos.');
        if (files && files.length > 0) {
            files.forEach(file => {
                excluirArquivo(file.filename);
            });
        }
        return res.redirect(itemId ? `/roupas/editar/${itemId}` : '/roupas');
    }

    // Campos permitidos e sanitização 
    const itemDados = {
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
    };

    try {
        if (itemId) {
            // --- UPDATE (EDIÇÃO) - DEPRECADO POR 'salvarEdicao' ---
            await Item.update(itemDados, {
                where: { id: itemId, UsuarioId: idUsuario }
            });
            req.flash('success_msg', 'Item atualizado com sucesso!');
            // Limpeza de novos uploads na rota salvarItem (Edição) para forçar uso de salvarEdicao
            if (files && files.length > 0) {
                req.flash('warning', 'As novas imagens enviadas não foram salvas. Use o modal de edição para gerenciar as fotos.');
                files.forEach(file => excluirArquivo(file.filename));
            }
        } else {
            // --- CREATE (CRIAÇÃO) ---
            // Validação: Exigir fotos na criação de um novo item
            if (!itemId && (!files || files.length === 0)) {
                console.log(" VALIDAÇÃO FALHOU - Nenhuma foto enviada");
                req.flash('error_msg', 'É obrigatório anexar pelo menos uma foto ao cadastrar uma nova peça.');
                return res.redirect('/roupas');
            }
            const itemParaCriar = { ...itemDados, statusPosse: 'Ativo' };
            const novoItem = await Item.create(itemParaCriar);
            // Criação dos registros de Imagem no DB COM ORDEM
            const imagensParaCriar = files.map((file, index) => ({
                ItemId: novoItem.id, // O ID do novo Item
                caminho_arquivo: `/uploads/itens/${file.filename}`, // Caminho salvo no BD
                is_principal: index === 0, // A primeira imagem é a principal
                ordem: index //  DEFINE A ORDEM!
            }));

            await Imagem.bulkCreate(imagensParaCriar);
            req.flash('success_msg', 'Nova peça cadastrada e imagens salvas com sucesso!');
        }
        res.redirect('/roupas');
    } catch (error) {
        console.error(`ERRO AO SALVAR ITEM (ID: ${itemId || 'novo'}):`, error);

        // Lógica de limpeza de arquivos em caso de erro no DB
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
// Lógica GET: Exclui um item (DELETE)
export const excluirItem = async (req, res) => {
    const DB = getDB(req);
    const { Item, Imagem } = DB; // Pegando Imagem para limpeza de arquivos
    const idItem = req.params.id;
    const idUsuario = req.session.userId;

    try {
        const item = await Item.findOne({
            where: { id: idItem, UsuarioId: idUsuario },
            include: [{ model: Imagem, as: 'imagens', attributes: ['caminho_arquivo'] }] // Busca os caminhos para deletar
        });

        if (!item) {
            req.flash('error_msg', 'Item não encontrado ou você não tem permissão.');
            return res.redirect('/roupas');
        }

        // Previne exclusão de itens em processo de troca
        if (item.statusPosse !== 'Ativo') {
            req.flash('error_msg', 'Esta peça não pode ser excluída pois está envolvida em uma troca pendente.');
            return res.redirect('/roupas?status=EmTroca');
        }

        // Deletar os arquivos físicos associados (USANDO FUNÇÃO AUXILIAR)
        item.imagens.forEach(img => {
            excluirArquivo(img.caminho_arquivo);
        });

        // O CASCADE do Sequelize deve deletar os registros de Imagem automaticamente.
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