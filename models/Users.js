const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        min: 5,
        max: 15,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/.+\@.+\..+/, 'Por favor, insira um e-mail válido']
    },
    password: {
        type: String,
        required: true,
        min: 8
    }
});

module.exports = mongoose.model("User", UserSchema);