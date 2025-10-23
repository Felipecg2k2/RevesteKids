// models/Item.js

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
        allowNull: false // Tornamos obrigatório
    },
    cor: {
        type: DataTypes.STRING(50),
        allowNull: true // Permite ser NULL
    },
    tecido: {
        type: DataTypes.STRING(50),
        allowNull: true // Permite ser NULL
    },
    estacao: {
        type: DataTypes.STRING(20),
        allowNull: true // Permite ser NULL
    },
    condicao: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: true // Permite ser NULL
    },
    statusPosse: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Ativo' // Itens novos ou atuais são 'Ativo'
    },
    // O campo 'usuario_id' será criado automaticamente na associação (veja abaixo)
});


// =======================================================
// ASSOCIAÇÃO (CHAVE ESTRANGEIRA)
// =======================================================

// 1. O Usuário tem muitos Itens (One-to-Many)
Usuario.hasMany(Item, {
    foreignKey: 'UsuarioId' // O Sequelize usará 'UsuarioId' como chave estrangeira em 'itens'
});

// 2. O Item pertence a um Usuário
Item.belongsTo(Usuario, {
    foreignKey: 'UsuarioId'
});

// Nota: O Sequelize irá criar a coluna 'UsuarioId' na tabela 'itens' automaticamente
// e a tratará como a Chave Estrangeira.


export default Item;