const mongoose = require("mongoose");

const DeploySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, // Define como um ID do MongoDB
        ref: "User",                          // Aponta para o modelo "User"
        required: [true, "O utilizador (userId) é obrigatório"]
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId, // Define como um ID do MongoDB
        ref: "Category",                      // Aponta para o modelo "Category"
        required: [true, "A categoria (categoryId) é obrigatória"]
    },
    title: {
        type: String,
        required: [true, "O titulo é obrigatório"],
        trim: true
    },
    link: {
        type: String,
        required: [true, "O link é obrigatório"],
        trim: true
    },
    description: {
        type: String,
        required: [true, "A descrição é obrigatória"],
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Deploy", DeploySchema);
