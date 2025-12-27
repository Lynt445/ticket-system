const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);

  const User = mongoose.model("User", {
    name: String,
    email: String,
    password: String,
    role: String,
  });

  const hashedPassword = await bcrypt.hash("Admin123!", 12);

  await User.create({
    name: "Super Admin",
    email: "admin@yourdomain.com",
    password: hashedPassword,
    role: "super_admin",
  });

  console.log("Admin created successfully");
  await mongoose.disconnect();
}

createAdmin().catch(console.error);