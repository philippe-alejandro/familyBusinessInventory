const mongoose = require("mongoose");
const Schema = mongoose.Schema; 

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true }
  })
);

// Export model
module.exports = User;

