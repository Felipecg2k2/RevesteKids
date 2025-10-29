import connection from "../config/sequelize-config.js"; 
import Item from "./Item.js";
import Imagem from "./Imagem.js";
import Usuario from "./Usuario.js"; 
import Troca from "./Troca.js"; 

// 1. Cria um objeto com todos os Models carregados
const models = {
    Item,
    Imagem,
    Usuario,
    Troca, 
};

// 2. Itera sobre os Models e executa a função 'associate'
// Isso resolve a dependência circular (Item <-> Imagem <-> Troca)
Object.keys(models).forEach(modelName => {
    // Verifica se o Model tem o método associate 
    if (models[modelName].associate) {
        // Chama a função, passando o objeto 'models' que contém todos os Models.
        models[modelName].associate(models);
    }
});

// 3. Exporta a conexão e todos os Models
const db = {
    ...models,
    sequelize: connection, // A instância do Sequelize
};

export default db;