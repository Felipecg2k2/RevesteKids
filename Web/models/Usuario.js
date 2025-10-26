import Sequelize from "sequelize";
import connection from "../config/sequelize-config.js";
const Usuario = connection.define('usuarios', {
    // ==========================================================
    // 1. IDENTIFICAÇÃO BÁSICA
    // ==========================================================
    nome: {
        type: Sequelize.STRING,
        allowNull: false
    },
    sobrenome: {
        type: Sequelize.STRING,
        allowNull: false
    },
    // ==========================================================
    // 2. CREDENCIAIS / CONTATO
    // ==========================================================
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    senha: {
        type: Sequelize.STRING,
        allowNull: false
    },
    // ==========================================================
    // 3. ENDEREÇO / LOCALIZAÇÃO
    // Coloque campos que dependem de CEP próximos (CEP -> Logradouro -> etc.)
    // ==========================================================
    cep: {
        type: Sequelize.STRING,
        allowNull: false
    },
    logradouro: { // Colocado antes do 'numero' para seguir a ordem de preenchimento
        type: Sequelize.STRING,
        allowNull: false
    },
    numero: {
        type: Sequelize.STRING,
        allowNull: false
    },
    bairro: {
        type: Sequelize.STRING,
        allowNull: false
    },
    cidade: {
        type: Sequelize.STRING,
        allowNull: false
    },
    estado: {
        type: Sequelize.STRING,
        allowNull: false
    }

    // ==========================================================
    // 4. METADATA (Sequelize adiciona createdAt, updatedAt por padrão)
    // ==========================================================
});
export default Usuario;