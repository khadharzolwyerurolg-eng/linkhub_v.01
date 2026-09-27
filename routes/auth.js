const router = require("express").Router();
const User = require("../models/Users");
const bcrypt = require("bcrypt");

// Register user
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, email and password are required",
            });
        }

        const existingUser = await User.findOne({
            $or: [{ username }, { email }],
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Username or email already exists",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });

        const user = await newUser.save();
        const { password: _, ...userWithoutPassword } = user.toObject();

        return res.status(201).json(userWithoutPassword);
    } catch (err) {
        return res.status(500).json({
            message: "Error creating user",
            error: err.message,
        });
    }
});

router.post("/login", async (req, res) =>{
    try{
        const user = await User.findOne({
            email: req.body.email
        });

        !user && res.status(404).json("User not found!")

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        !validPassword && res.status(400).json("Wrong password, please try again!");

        res.status(200).json(user);
    }catch(err){
        res.stutus(500).json(err);
    }
})

router.get("/", (req, res) => {
    res.status(200).json({ message: "Rota testada com sucesso!" });
});

module.exports = router;