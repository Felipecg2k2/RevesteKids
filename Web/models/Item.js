import { DataTypes } from "sequelize";
import connection from "../config/sequelize-config.js";
import Usuario from "./Usuario.js"; // Importa o modelo Usuario para associação
const Item = connection.define('itens', {
    // =======================================================
    // 1. IDENTIFICAÇÃO CHAVE (NOME E CATEGORIA)
    // =======================================================
    peca: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Nome curto da peça (ex: Vestido Rodado, Calça Jeans)'
    },
    categoriaPeca: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Tipo de peça para categorização (ex: Vestuário, Calçado, Acessório)'
    },
    // =======================================================
    // 2. CARACTERÍSTICAS BÁSICAS E OBRIGATÓRIAS
    // =======================================================
    tipo: {
        type: DataTypes.ENUM('Feminino', 'Masculino', 'Unissex'),
        allowNull: false
    },
    tamanho: {
        type: DataTypes.ENUM(
            'RN', '0-3M', '3-6M', '6-9M', '9-12M',
            '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A',
            '10A', '12A', '14A', '16A',
            'P', 'M', 'G', 'GG', 'Único'
        ),
        allowNull: false
    },
    condicao: {
        type: DataTypes.ENUM(
            'Novo com Etiqueta',
            'Novo sem Etiqueta',
            'Usado em Perfeitas Condições',
            'Usado com Pequeno Desgaste',
            'Requer Reparo Simples'
        ),
        allowNull: false
    },
    // =======================================================
    // 3. CARACTERÍSTICAS SECUNDÁRIAS (Opcionais)
    // =======================================================
    cor: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    tecido: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    estacao: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    // =======================================================
    // 4. GESTÃO E DESCRIÇÃO
    // =======================================================
    statusPosse: {
        type: DataTypes.ENUM('Ativo', 'EmTroca', 'Historico'),
        allowNull: false,
        defaultValue: 'Ativo',
        comment: 'Indica se está disponível, em negociação ou trocado'
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detalhes e observações sobre a peça'
    },

}, {
    tableName: 'itens',
    freezeTableName: true,
    timestamps: true
});
// =======================================================
// ASSOCIAÇÃO (CHAVE ESTRANGEIRA E CORREÇÃO CRÍTICA)
// =======================================================
// 1. O Usuário tem muitos Itens (One-to-Many)
Usuario.hasMany(Item, {
    foreignKey: 'UsuarioId',
    onDelete: 'CASCADE'
});
// 2. O Item pertence a um Usuário
Item.belongsTo(Usuario, {
    foreignKey: 'UsuarioId',
    as: 'usuario'
});
export default Item;