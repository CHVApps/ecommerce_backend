const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const sequelize = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes"); // Import Product Routes

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes); // Register Product Routes

sequelize.sync().then(() => {
  console.log("Database Synced");
  app.listen(5001, () => console.log("Server running on port 5001"));
});
