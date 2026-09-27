const express = require("express");

const app = express();

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");


//
const userRoute = require("./routes/users");
const authRoute = require("./routes/auth");
const categoryRoute = require("./routes/category");
const deployRoute = require("./routes/deploy")

//Variável de ambiente::
dotenv.config();


// Ligação ao MongoDB (Versão atualizada)
mongoose.connect(process.env.MONGO_URL)
.then(() => {
    console.log("Mongo Connected!");
})
.catch((err) => {
    console.error("MongoDB connection error:", err);
});

//Middleware::
app.use(express.json());
app.use(helmet());
app.use(morgan("combined"));

//Rotas da API::
app.use("/api/users", userRoute);
app.use("/api/auth", authRoute);
app.use("/api/category", categoryRoute);
app.use("/api/deploy", deployRoute);






// Defina uma nova porta aqui (ex: 3000)
const PORT = process.env.PORT || 3000; 

// ... o seu router e outras configurações entram aqui ...

app.listen(PORT, () => {
  console.log(`Servidor a rodar na porta ${PORT}`);
});
