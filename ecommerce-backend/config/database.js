const { Sequelize } = require("sequelize");
require("dotenv").config(); // Load environment variables

// Initialize Sequelize with environment variables
const sequelize = new Sequelize(
  process.env.DB_NAME, // Database Name
  process.env.DB_USER, // Username
  process.env.DB_PASSWORD, // Password
  {
    host: process.env.DB_HOST, // Database Host
    dialect: "postgres", // Database Type
    port: process.env.DB_PORT, // Default PostgreSQL Port
    logging: false, // Set to true for debugging SQL queries
  }
);

// Test Database Connection
sequelize
  .authenticate()
  .then(() => console.log("✅ PostgreSQL Connected Successfully!"))
  .catch((err) => console.error("❌ Database Connection Failed:", err));

module.exports = sequelize;
