// models/Troca.js

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
        // Enum definido corretamente com todos os estados usados nas rotas
        type: DataTypes.ENUM('Pendente', 'Aceita', 'Rejeitada', 'Finalizada', 'Cancelada'), 
        allowNull: false,
        defaultValue: 'Pendente' 
    },
    dataAceite: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // V-V-V- CORREÇÃO CRÍTICA PARA O ERRO 'Unknown column' -V-V-V
    dataFinalizacao: { 
        type: DataTypes.DATE,
        allowNull: true // Será preenchido na ROTA 9 (Finalizar Troca)
    }
    // ^-^-^ FIM DA CORREÇÃO ^-^-^
}, {
    // === Ajustes para Consistência do Sequelize ===
    tableName: 'Trocas', 
    freezeTableName: true, // Garante que o Sequelize não pluralize (mantém 'Trocas')
    // Opção para incluir as chaves estrangeiras como colunas no SELECT por padrão (opcional, mas bom)
    timestamps: true 
});

// ==========================================================
// RELACIONAMENTOS (FOREIGN KEYS) - COM ON DELETE
// ==========================================================

// 1. Quem Propôs a Troca?
Troca.belongsTo(Usuario, {
    as: 'proponente', 
    foreignKey: 'ProponenteId', 
    // Removi allowNull: true/false daqui. O Sequelize define a regra no foreignKey
    onDelete: 'SET NULL', // Se o usuário proponente for excluído, o ProponenteId fica NULL
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