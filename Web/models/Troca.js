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
        // MANTIDO: 'Conflito'
        type: DataTypes.ENUM('Pendente', 'Aceita', 'Rejeitada', 'Finalizada', 'Cancelada', 'Conflito'), 
        allowNull: false,
        defaultValue: 'Pendente' 
    },
    dataAceite: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // CAMPO PARA RASTREAR A CONFIRMAÇÃO DO PROPONENTE (Usuário que iniciou)
    proponenteConfirmouFinalizacao: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    // CAMPO PARA RASTREAR A CONFIRMAÇÃO DO RECEPTOR (Dono do item desejado)
    receptorConfirmouFinalizacao: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    dataFinalizacao: { 
        type: DataTypes.DATE,
        allowNull: true // Será preenchido quando AMBOS confirmarem
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
// Você DEVE rodar uma migração no seu banco de dados para adicionar os campos:
// - proponenteConfirmouFinalizacao (BOOLEAN, default: false)
// - receptorConfirmouFinalizacao (BOOLEAN, default: false)
// Caso contrário, o Controller dará erro ao tentar acessá-los.