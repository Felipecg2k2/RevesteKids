// models/Item.js - CÓDIGO CORRIGIDO

import { DataTypes } from "sequelize";
import connection from "../config/sequelize-config.js";
import Usuario from "./Usuario.js"; // Importa o modelo Usuario para associação

const Item = connection.define('itens', {
    // ID é criada automaticamente pelo Sequelize
    
    // CAMPOS BASEADOS NA SUA TABELA 'itens'
    tipo: {
        type: DataTypes.ENUM('Feminino', 'Masculino', 'Unissex'),
        allowNull: false
    },
    tamanho: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    peca: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    // NOVO CAMPO: Categoria da Peça
    categoriaPeca: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    cor: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    tecido: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    estacao: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    condicao: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    // V-V-V- CORREÇÃO CRÍTICA AQUI -V-V-V
    statusPosse: {
        type: DataTypes.ENUM('Ativo', 'EmTroca', 'Historico'), // Definindo como ENUM
        allowNull: false,
        defaultValue: 'Ativo' 
    },
    // ^-^-^ FIM DA CORREÇÃO ^-^-^
    // Nota: O campo 'UsuarioId' será criado automaticamente na associação
}, {
    tableName: 'itens',
    freezeTableName: true, // Garante que o nome da tabela seja 'itens'
    timestamps: true
});


// =======================================================
// ASSOCIAÇÃO (CHAVE ESTRANGEIRA)
// =======================================================

// 1. O Usuário tem muitos Itens (One-to-Many)
Usuario.hasMany(Item, {
    foreignKey: 'UsuarioId'
});

// 2. O Item pertence a um Usuário
Item.belongsTo(Usuario, {
    foreignKey: 'UsuarioId',
    as: 'usuario'
});

export default Item;