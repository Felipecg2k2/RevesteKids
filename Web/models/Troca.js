// models/Troca.js - ATUALIZADO

import { DataTypes } from 'sequelize';
import connection from '../config/sequelize-config.js';
import Usuario from './Usuario.js';
import Item from './Item.js';

const Troca = connection.define('Troca', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    status: {
        // CORREÇÃO CRÍTICA: Adicionado 'Conflito' para suportar a lógica da ROTA 9 (Finalizar Troca)
        type: DataTypes.ENUM('Pendente', 'Aceita', 'Rejeitada', 'Finalizada', 'Cancelada', 'Conflito'), 
        allowNull: false,
        defaultValue: 'Pendente' 
    },
    dataAceite: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Correção já existente e correta
    dataFinalizacao: { 
        type: DataTypes.DATE,
        allowNull: true // Será preenchido na ROTA 9 (Finalizar Troca)
    }
}, {
    // === Ajustes para Consistência do Sequelize ===
    tableName: 'Trocas', 
    freezeTableName: true, 
    timestamps: true 
});

// ==========================================================
// RELACIONAMENTOS (FOREIGN KEYS) - COM ON DELETE
// ==========================================================

// 1. Quem Propôs a Troca?
Troca.belongsTo(Usuario, {
    as: 'proponente', 
    foreignKey: 'ProponenteId', 
    onDelete: 'SET NULL', 
    onUpdate: 'CASCADE'
});

// 2. De Quem é a Troca? (O Dono do Item Desejado)
Troca.belongsTo(Usuario, {
    as: 'receptor', 
    foreignKey: 'ReceptorId', 
    onDelete: 'SET NULL', 
    onUpdate: 'CASCADE'
});

// 3. Qual Item o Proponente ESTÁ OFERECENDO?
Troca.belongsTo(Item, {
    as: 'itemOferecido',
    foreignKey: 'ItemOferecidoId',
    onDelete: 'SET NULL', 
    onUpdate: 'CASCADE'
});

// 4. Qual Item o Proponente DESEJA RECEBER?
Troca.belongsTo(Item, {
    as: 'itemDesejado',
    foreignKey: 'ItemDesejadoId',
    onDelete: 'SET NULL', 
    onUpdate: 'CASCADE'
});

export default Troca;

// NOTA IMPORTANTE:
// Se você já tem este modelo sincronizado com o banco de dados (ex: com Troca.sync()), 
// precisará realizar uma migração manual ou usar o comando Sequelize `alter: true`
// para adicionar 'Conflito' ao ENUM do campo `status` no seu banco de dados.