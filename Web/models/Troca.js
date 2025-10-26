import { DataTypes } from 'sequelize';
import connection from '../config/sequelize-config.js';
// REMOVIDO: import Usuario from './Usuario.js';
// REMOVIDO: import Item from './Item.js';
// Os Models serão acessados via 'models' dentro da função associate.

const Troca = connection.define('Troca', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    status: {
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
// RELACIONAMENTOS (FOREIGN KEYS) - DEFINIDOS NA FUNÇÃO ASSOCIATE
// ==========================================================
Troca.associate = function(models) {
    // 1. Quem Propôs a Troca?
    Troca.belongsTo(models.Usuario, {
        as: 'proponente', 
        foreignKey: 'ProponenteId', 
        onDelete: 'SET NULL', 
        onUpdate: 'CASCADE'
    });
    // 2. De Quem é a Troca? (O Dono do Item Desejado)
    Troca.belongsTo(models.Usuario, {
        as: 'receptor', 
        foreignKey: 'ReceptorId', 
        onDelete: 'SET NULL', 
        onUpdate: 'CASCADE'
    });
    // 3. Qual Item o Proponente ESTÁ OFERECENDO?
    Troca.belongsTo(models.Item, {
        as: 'itemOferecido',
        foreignKey: 'ItemOferecidoId',
        onDelete: 'SET NULL', 
        onUpdate: 'CASCADE'
    });
    // 4. Qual Item o Proponente DESEJA RECEBER?
    Troca.belongsTo(models.Item, {
        as: 'itemDesejado',
        foreignKey: 'ItemDesejadoId',
        onDelete: 'SET NULL', 
        onUpdate: 'CASCADE'
    });
    
    // Associações inversas (do lado do Item ou Usuario) devem ser definidas em seus respectivos models:
    // Ex: models.Usuario.hasMany(Troca, { as: 'trocasIniciadas', foreignKey: 'ProponenteId' });
    // Ex: models.Item.hasOne(Troca, { as: 'trocaOfertada', foreignKey: 'ItemOferecidoId' });
    // Certifique-se de que essas associações inversas também estejam em Item.associate e Usuario.associate.
};

export default Troca;