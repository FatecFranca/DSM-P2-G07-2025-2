require('dotenv').config();
const { Sequelize } = require('sequelize');

// Configuração do banco de dados
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false, // Logs são gerenciados pelo logger customizado
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true
  }
});

// Testar conexão
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    const logger = require('../utils/logger');
    logger.info('Conexão com o banco de dados estabelecida com sucesso', {
      database: process.env.DB_NAME,
      host: `${process.env.DB_HOST}:${process.env.DB_PORT}`
    });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Erro ao conectar com o banco de dados', error, {
      database: process.env.DB_NAME,
      host: `${process.env.DB_HOST}:${process.env.DB_PORT}`,
      message: 'Verifique se o PostgreSQL está rodando e se as credenciais no .env estão corretas'
    });
  }
};

module.exports = {
  sequelize,
  testConnection
};
