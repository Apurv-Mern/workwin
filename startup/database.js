const { Sequelize } = require('sequelize');
const config = require('config');
// MySQL config
const DB_NAME = config.get('DB_NAME');
const sequelize = new Sequelize(DB_NAME, 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: console.log, // Set to false to disable SQL logs
  define: {
    freezeTableName: true,
    timestamps: true // Adds createdAt, updatedAt fields
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Connection check
async function connectToDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL (work_win) successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
}

module.exports = { sequelize, connectToDatabase };
