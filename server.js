const express = require("express");
const http = require("http");

const { Pool } = require("pg");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);




app.use(cors());
app.use(bodyParser.json());


const pool = new Pool({
    user: "qe6elt",
    host: "eu-central-1.sql.xata.sh",
    database: "ecommerce",
    password: "xau_T7ucrLWyhUkxLva4GTcrRH7qnzbmjxgP3",
    port: 5432,
    max: 3, // ⬅️ Reduce the maximum connections (try 5, 10, or lower)
    idleTimeoutMillis: 20000, // ⬅️ Close idle connections after 10 seconds
    connectionTimeoutMillis: 10000, // ⬅️ Timeout if no connection in 5 seconds
    ssl: {
        rejectUnauthorized: false, // Disable certificate verification if needed
    }
});

let loggedInAdmin = null;

const testDatabaseConnection = async () => {
    try {
      const result = await pool.query("SELECT NOW()");
      console.log("[SUCCESS] Database connected at:", result.rows[0].now);
    } catch (error) {
      console.error("[ERROR] Database connection failed:", error);
    }
  };
  
  
   // Call the function to test the connection
  testDatabaseConnection();


// ✅ (1) Admin Login
app.post("/admin-login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: "error", message: "⚠️ Username and password are required." });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM public.admin_users WHERE username = $1 AND password = $2",
            [username, password]
        );

        if (result.rows.length > 0) {
            loggedInAdmin = username;
            return res.json({ 
                status: "success", 
                message: "✅ Login Successful", 
                username 
            });
        } else {
            return res.status(401).json({ status: "error", message: "❌ Invalid Credentials" });
        }
    } catch (error) {
        console.error("🚨 Database Error:", error);
        return res.status(500).json({ status: "error", message: "🚨 Internal Server Error" });
    }
});

// API to get total stock count
app.get("/total-stock", async (req, res) => {
    try {
      const result = await pool.query("SELECT SUM(total_stock) AS total_stock_count FROM products;");
      res.json({ totalStock: result.rows[0].total_stock_count || 0 });
    } catch (err) {
      res.status(500).json({ error: "Server error: " + err.message });
    }
  });
  
  
  app.get("/transactions-today", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) AS total_transactions 
         FROM transactions 
         WHERE transaction_date >= CURRENT_DATE 
         AND transaction_date < CURRENT_DATE + INTERVAL '1 day'`
      );
      res.json({ totalTransactions: parseInt(result.rows[0].total_transactions) });
    } catch (err) {
      console.error("Error fetching transactions:", err.message);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  });

  app.get("/total-sales-today", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT COALESCE(SUM(total_price), 0) AS total_sales 
         FROM transactions 
         WHERE transaction_date >= CURRENT_DATE 
         AND transaction_date < CURRENT_DATE + INTERVAL '1 day'`
      );
      res.json({ totalSales: parseFloat(result.rows[0].total_sales) });
    } catch (err) {
      console.error("Error fetching total sales:", err.message);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  });

// ✅ (2) Admin Logout
app.post("/admin-logout", async (req, res) => {
    loggedInAdmin = null;
    return res.json({ status: "success", message: "✅ Admin logged out successfully" });
});

// ✅ (3) Check Admin Login Status
app.get("/check-login", async (req, res) => {
    if (loggedInAdmin) {
        return res.json({ 
            status: "success", 
            message: "✅ Admin is already logged in", 
            username: loggedInAdmin 
        });
    } else {
        return res.status(401).json({ status: "error", message: "❌ Admin not logged in" });
    }
});


// ✅ (4) Generate a Unique Barcode
app.post("/api/products/generate-barcode", async (req, res) => {
    const uniqueCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    res.json({ unique_code: uniqueCode });
});

// ✅ (5) Add a New Product
app.post("/api/products", async (req, res) => {
    const { category_name, product_name, original_price, our_price, discount, unique_code, total_stock } = req.body;

    if (!category_name || !product_name || !original_price || !our_price || !unique_code || !total_stock) {
        return res.status(400).json({ error: "⚠️ Please fill all required fields" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO products 
              (category_name, product_name, original_price, our_price, discount, unique_code, total_stock) 
              VALUES ($1, $2, $3, $4, $5, $6, $7) 
              RETURNING *`,
            [
                category_name,
                product_name,
                parseFloat(original_price) || 0,
                parseFloat(our_price) || 0,
                parseFloat(discount) || 0,
                unique_code,
                parseInt(total_stock) || 0,
            ]
        );

        res.json({ status: "success", message: "✅ Product added successfully!", product: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: "🚨 Database error while adding product." });
    }
});

app.get("/api/return/:reference_number", async (req, res) => {
    const { reference_number } = req.params;

    if (!reference_number) {
        return res.status(400).json({ error: "❌ Reference number is required." });
    }

    try {
        console.log(`🔍 Searching for transaction with reference number: ${reference_number}`);

        // ✅ Cast `products` to JSON directly in the query
        const result = await pool.query(
            `SELECT id, reference_number, customer_number, total_price, 
                    products::json AS products, transaction_date 
             FROM transactions 
             WHERE reference_number = $1`,
            [reference_number]
        );

        if (result.rows.length > 0) {
            const transaction = result.rows[0];
            const transactionDate = new Date(transaction.transaction_date);
            const currentDate = new Date();
            const differenceInDays = Math.floor((currentDate - transactionDate) / (1000 * 60 * 60 * 24));

            // ✅ Determine if the transaction is eligible for return
            const isEligibleForReturn = differenceInDays <= 30;

            res.json({
                status: "success",
                message: "✅ Transaction found",
                transaction,
                isEligibleForReturn,
                returnMessage: isEligibleForReturn ? "✅ Eligible for return" : "❌ Return period expired"
            });
        } else {
            console.error("❌ No matching transaction found.");
            return res.status(404).json({ error: "❌ No matching transaction found." });
        }
    } catch (error) {
        console.error("🚨 Database error while fetching transaction:", error);
        return res.status(500).json({ error: "🚨 Database error while fetching transaction." });
    }
});


// ✅ (6) Get All Products
app.get("/api/products", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM products ORDER BY id DESC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "🚨 Database error while fetching products." });
    }
});

// ✅ (7) Store Confirmed Bill in Database (Now with Stock Update)
// ✅ Store Confirmed Bill in Database & Update Stock
app.post("/api/store-bill", async (req, res) => {
    const { customerNumber, totalPrice, products } = req.body;
    const referenceNumber = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        // 🔹 Step 1: Insert transaction into database
        const transactionResult = await pool.query(
            `INSERT INTO transactions (reference_number, customer_number, total_price, products, transaction_date) 
             VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
            [referenceNumber, customerNumber, totalPrice, JSON.stringify(products)]
        );

        // 🔹 Step 2: Deduct stock from each sold product
        for (const product of products) {
            const barcode = product.barcode;
            const quantitySold = product.quantity;

            const stockUpdate = await pool.query(
                `UPDATE products 
                 SET total_stock = total_stock - $1 
                 WHERE unique_code = $2 
                 AND total_stock >= $1 RETURNING total_stock`,
                [quantitySold, barcode]
            );

            if (stockUpdate.rowCount === 0) {
                console.warn(`⚠️ Stock update failed for barcode: ${barcode}`);
            }
        }

        res.json({ 
            status: "success", 
            message: "✅ Bill stored successfully & stock updated!", 
            transaction: transactionResult.rows[0] 
        });

    } catch (error) {
        console.error("🚨 Database error while storing bill & updating stock:", error);
        res.status(500).json({ error: "🚨 Database error while storing bill & updating stock." });
    }
});


app.get("/api/products/:barcode", async (req, res) => {
    const { barcode } = req.params;

    if (!barcode) {
        return res.status(400).json({ error: "❌ Barcode is required." });
    }

    try {
        console.log(`🔍 Searching for product with barcode: ${barcode}`);

        const result = await pool.query("SELECT * FROM products WHERE unique_code = $1", [barcode]);

        if (result.rows.length > 0) {
            console.log("✅ Product Found:", result.rows[0]);
            res.json({ status: "success", product: result.rows[0] });
        } else {
            console.error("❌ No matching product found.");
            res.status(404).json({ error: "❌ No matching product found." });
        }
    } catch (error) {
        console.error("🚨 Database error while fetching product:", error);
        res.status(500).json({ error: "🚨 Database error while fetching product." });
    }
});


app.put("/api/products/update-price/:barcode", async (req, res) => {
    const { barcode } = req.params;
    const { new_price } = req.body;

    if (!barcode || !new_price) {
        return res.status(400).json({ error: "❌ Barcode and new price are required." });
    }

    try {
        console.log(`🔄 Updating price for barcode: ${barcode}`);

        const result = await pool.query(
            `UPDATE products SET our_price = $1 WHERE unique_code = $2 RETURNING *`,
            [parseFloat(new_price), barcode]
        );

        if (result.rowCount > 0) {
            console.log("✅ Product Price Updated:", result.rows[0]);
            res.json({ status: "success", message: "✅ Product price updated!", product: result.rows[0] });
        } else {
            res.status(404).json({ error: "❌ Product not found." });
        }
    } catch (error) {
        console.error("🚨 Database error while updating product price:", error);
        res.status(500).json({ error: "🚨 Database error while updating product price." });
    }
});



// ✅ (8) Get All Transactions
app.get("/api/transactions", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM transactions ORDER BY transaction_date DESC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "🚨 Database error while fetching transactions." });
    }
});


const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});


// ✅ (12) Update Product by ID (Fixed for final_price issue)
app.put("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const { category_name, product_name, original_price, our_price, discount, total_stock, unique_code } = req.body;

    if (!id) {
        return res.status(400).json({ error: "❌ Product ID is required for updating." });
    }

    try {
        // Ensure numeric values are correctly parsed
        const originalPrice = parseFloat(original_price) || 0;
        const ourPrice = parseFloat(our_price) || 0;
        const discountValue = parseFloat(discount) || 0;
        const stockCount = parseInt(total_stock) || 0;

        console.log(`🔄 Updating Product ID: ${id}`);

        const result = await pool.query(
            `UPDATE products 
            SET category_name = $1, product_name = $2, original_price = $3, 
                our_price = $4, discount = $5, total_stock = $6, unique_code = $7
            WHERE id = $8 RETURNING *`,
            [category_name, product_name, originalPrice, ourPrice, discountValue, stockCount, unique_code, id]
        );

        if (result.rowCount > 0) {
            console.log("✅ Product Updated Successfully:", result.rows[0]);
            res.json({ status: "success", message: "✅ Product updated successfully!", product: result.rows[0] });
        } else {
            res.status(404).json({ error: "❌ Product not found or no changes made." });
        }
    } catch (error) {
        console.error("🚨 Database error while updating product:", error);
        res.status(500).json({ error: "🚨 Database error while updating product." });
    }
});



// ✅ (13) Fetch Product by Unique Code (Fixed)
app.get("/api/products/unique/:unique_code", async (req, res) => {
    const { unique_code } = req.params;

    if (!unique_code) {
        return res.status(400).json({ error: "❌ Unique code is required." });
    }

    try {
        console.log(`🔍 Searching for product with unique code: ${unique_code}`);

        const result = await pool.query("SELECT * FROM products WHERE unique_code::text = $1", [unique_code]);

        if (result.rows.length > 0) {
            console.log("✅ Product Found:", result.rows[0]);
            res.json(result.rows[0]);
        } else {
            console.error("❌ No matching product found.");
            res.status(404).json({ error: "❌ No matching product found." });
        }
    } catch (error) {
        console.error("🚨 Database error while fetching product:", error);
        res.status(500).json({ error: "🚨 Database error while fetching product." });
    }
});


// ✅ (14) Delete Product by ID
app.delete("/api/products/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "❌ Product ID is required for deletion." });
    }

    try {
        console.log(`🗑️ Deleting Product with ID: ${id}`);

        const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING *", [id]);

        if (result.rowCount > 0) {
            console.log("✅ Product Deleted Successfully:", result.rows[0]);
            res.json({ status: "success", message: "✅ Product deleted successfully!", product: result.rows[0] });
        } else {
            res.status(404).json({ error: "❌ Product not found." });
        }
    } catch (error) {
        console.error("🚨 Database error while deleting product:", error);
        res.status(500).json({ error: "🚨 Database error while deleting product." });
    }
});

