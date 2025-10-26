import connection from "../config/sequelize-config.js"; // Importa sua instância de conexão
import Item from "./Item.js";
import Imagem from "./Imagem.js";
import Usuario from "./Usuario.js"; 
import Troca from "./Troca.js"; // NOVO: Importa o Model Troca

// 1. Cria um objeto com todos os Models carregados
const models = {
    Item,
    Imagem,
    Usuario,
    Troca, // NOVO: Adiciona o Model Troca
};

// 2. Itera sobre os Models e executa a função 'associate'
// Isso resolve a dependência circular (Item <-> Imagem <-> Troca)
Object.keys(models).forEach(modelName => {
    // Verifica se o Model tem o método associate que definimos
    if (models[modelName].associate) {
        // Chama a função, passando o objeto 'models' que contém todos os Models.
        models[modelName].associate(models);
    }
});

// 3. Exporta a conexão e todos os Models
// Você usará este objeto 'db' em seus Controllers para fazer consultas.
const db = {
    ...models,
    sequelize: connection, // A instância do Sequelize
};

// Você pode remover o comentário abaixo se precisar de compatibilidade com o Sequelize CLI:
// db.sequelize.models = models;

export default db;