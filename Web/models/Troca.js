// models/Troca.js

import { DataTypes } from 'sequelize';
import connection from '../config/sequelize-config.js';
import Usuario from './Usuario.js';
import Item from './Item.js';

const Troca = connection.define('Troca', {
    // ID da Proposta de Troca (Chave Primária)
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    
    // Status da Proposta: Pendente, Aceita, Recusada, Cancelada
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Pendente' // Inicia como pendente
    },
    
    // Data em que o status mudou para 'Aceita' (opcional)
    dataAceite: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

// ==========================================================
// RELACIONAMENTOS (FOREIGN KEYS)
// ==========================================================

// 1. Quem Propôs a Troca?
Troca.belongsTo(Usuario, {
    as: 'proponente', // Alias para o proponente
    foreignKey: 'ProponenteId', // Chave estrangeira que referencia o usuário que enviou a proposta
    allowNull: false
});

// 2. De Quem é a Troca? (O Dono do Item Desejado)
Troca.belongsTo(Usuario, {
    as: 'receptor', // Alias para o receptor da proposta
    foreignKey: 'ReceptorId', // Chave estrangeira que referencia o usuário que receberá a proposta
    allowNull: false
});

// 3. Qual Item o Proponente ESTÁ OFERECENDO?
Troca.belongsTo(Item, {
    as: 'itemOferecido',
    foreignKey: 'ItemOferecidoId',
    allowNull: false
});

// 4. Qual Item o Proponente DESEJA RECEBER?
Troca.belongsTo(Item, {
    as: 'itemDesejado',
    foreignKey: 'ItemDesejadoId',
    allowNull: false
});

export default Troca;