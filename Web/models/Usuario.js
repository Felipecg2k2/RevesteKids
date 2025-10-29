import { DataTypes } from "sequelize";
import connection from "../config/sequelize-config.js";


const Usuario = connection.define('usuarios', {
    // ==========================================================
    // 1. IDENTIFICAÇÃO BÁSICA
    // ==========================================================
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sobrenome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    foto_perfil: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
    // ==========================================================
    // 2. CREDENCIAIS / CONTATO
    // ==========================================================
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    senha: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // ==========================================================
    // 3. ENDEREÇO / LOCALIZAÇÃO
    // ==========================================================
    cep: {
        type: DataTypes.STRING(10), // Limitando o tamanho para CEP (ex: 99999-999)
        allowNull: false
    },
    logradouro: {
        type: DataTypes.STRING,
        allowNull: false
    },
    numero: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bairro: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cidade: {
        type: DataTypes.STRING,
        allowNull: false
    },
    estado: {
        type: DataTypes.STRING(2),
        allowNull: false
    }

    // ==========================================================
    // 4. METADATA
    // ==========================================================
}, {
    tableName: 'usuarios', 
    freezeTableName: true, 
    timestamps: true
});

// ==========================================================
// ASSOCIAÇÕES - Definidas como função para ser chamada pelo index.js
// ==========================================================
Usuario.associate = function(models) {
    // 1. O Usuário tem muitos Itens
    Usuario.hasMany(models.Item, {
        foreignKey: 'UsuarioId',
        as: 'itens', // Como o item será buscado (ex: usuario.getItens())
        onDelete: 'CASCADE'
    });

    // 2. O Usuário pode ser Proponente (iniciador) de muitas Trocas
    Usuario.hasMany(models.Troca, {
        foreignKey: 'ProponenteId',
        as: 'trocasIniciadas',
        onDelete: 'SET NULL'
    });

    // 3. O Usuário pode ser Receptor (dono do item desejado) em muitas Trocas
    Usuario.hasMany(models.Troca, {
        foreignKey: 'ReceptorId',
        as: 'trocasRecebidas',
        onDelete: 'SET NULL'
    });
};

export default Usuario;