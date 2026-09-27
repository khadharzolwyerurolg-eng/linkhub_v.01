const router = require("express").Router();
const Category = require("../models/Category");

// Register category
router.post("/register", async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !description) {
            return res.status(400).json({
                message: "Name and description are required!",
            });
        }

        const existingCategory = await Category.findOne({
            $or: [{ name }, { description }],
        });

        if (existingCategory) {
            return res.status(400).json({
                message: "Category already exists.",
            });
        }

        const newCategory = new Category({
            name,
            description,
        });

        const category = await newCategory.save();
        return res.status(201).json(category);
    } catch (err) {
        return res.status(500).json({
            message: "Error creating category.",
            error: err.message,
        });
    }
});

//Get By ID category::
router.get("/:id", async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                message: "Category not found!",
            });
        }

        return res.status(200).json({
            category
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error deleting category.",
            error: err.message,
        });
    }
});

//Get All category::
router.get("/", async (req, res) => {
    try {
        const category = await Category.find(req.params.id);

        if (!category) {
            return res.status(404).json({
                message: "Category not found!",
            });
        }
        return res.status(200).json(category);
    } catch (err) {
        return res.status(500).json({
            message: "Error deleting category.",
            error: err.message,
        });
    }
});

//Update category::
router.put("/:id", async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name && !description) {
            return res.status(400).json({
                message: "Provide at least one field to update.",
            });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { $set: { ...(name && { name }), ...(description && { description }) } },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                message: "Category not found!",
            });
        }

        return res.status(200).json({
            message: "Category has been updated!",
            category: updatedCategory,
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error updating category.",
            error: err.message,
        });
    }
});

//Delete category::
router.delete("/:id", async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                message: "Category not found!",
            });
        }

        await Category.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            message: "Category has been deleted!",
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error deleting category.",
            error: err.message,
        });
    }
});

module.exports = router;