const express = require("express");
const router = express.Router();
const Product = require("../models/Product"); // Import Product Model

// Route to add a new product
router.post("/", async (req, res) => {
  try {
    const { product_name, original_price, our_price, discount } = req.body;

    // Validate required fields
    if (!product_name || !original_price || !our_price) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    // Calculate final price
    const final_price = our_price - (our_price * (discount || 0)) / 100;

    // Create new product
    const newProduct = await Product.create({
      product_name,
      original_price,
      our_price,
      discount: discount || 0, // Default to 0 if not provided
      final_price,
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Server error while adding product" });
  }
});

// Route to get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error while fetching products" });
  }
});

module.exports = router;
