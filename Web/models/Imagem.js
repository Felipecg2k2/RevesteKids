    import { DataTypes } from "sequelize";
    import connection from "../config/sequelize-config.js";

    const Imagem = connection.define('imagens', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        caminho_arquivo: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Caminho ou nome do arquivo da imagem'
        },
        is_principal: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            comment: 'Flag para indicar qual imagem deve ser usada como destaque (principal)'
        },
        ordem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Posição de exibição da imagem'
    },
    }, {
        tableName: 'imagens',
        freezeTableName: true,
        timestamps: true
    });

    // =======================================================
    // ASSOCIAÇÃO - Definida como função para ser chamada pelo index.js
    // =======================================================
    Imagem.associate = function(models) {
        // A Imagem pertence a um Item
        Imagem.belongsTo(models.Item, {
            foreignKey: 'ItemId',
            as: 'item'
        });
    };

    export default Imagem;