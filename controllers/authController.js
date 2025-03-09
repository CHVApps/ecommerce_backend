const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: "Admin Registered", admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ where: { email } });

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) return res.status(401).json({ message: "Invalid Credentials" });

    const token = jwt.sign({ id: admin.id }, "secretkey", { expiresIn: "1h" });
    res.status(200).json({ message: "Login Successful", token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
