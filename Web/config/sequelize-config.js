import Sequelize from "sequelize";
const connection = new Sequelize({
    dialect: "mysql",
    host: "localhost",
    username: "root",
    password: "1234",
    database: "RevesteKids",
    timezone: "-03:00",
});
export default connection;
