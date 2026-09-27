const router = require("express").Router();
const Deploy = require("../models/Deploy"); // Importa o modelo correto de Deploy
const axios = require("axios");

// 1. Criar / Registar um Deploy (POST) com higienização de Link::
router.post("/register", async (req, res) => {
    try {
        let { userId, categoryId, title, link, description, available } = req.body;

        // Validação dos campos obrigatórios::
        if (!userId || !categoryId || !description) {
            return res.status(400).json({
                message: "userId, categoryId and description are required!",
            });
        }

        if (link) {
            link = link.trim();
            
            // Corrige se o utilizador duplicar o protocolo acidentalmente::
            if (link.startsWith("https://https://")) {
                link = link.replace("https://https://", "https://");
            } else if (link.startsWith("http://http://")) {
                link = link.replace("http://http://", "http://");
            }
            
            // Adiciona o protocolo básico se o utilizador se esquecer completamente dele::
            if (!link.startsWith("http://") && !link.startsWith("https://")) {
                link = "https://" + link;
            }
        }

        const newDeploy = new Deploy({
            userId,
            categoryId,
            title,
            link,
            description,
        });

        const savedDeploy = await newDeploy.save();
        return res.status(201).json(savedDeploy);
    } catch (err) {
        return res.status(500).json({
            message: "Error creating deploy.",
            error: err.message,
        });
    }
});


// 2. Procurar um Deploy por ID com Verificação Online Reforçada (GET)::
router.get("/:id", async (req, res) => {
    try {
        const deploy = await Deploy.findById(req.params.id, { __v: 0 }) 
            .populate("userId", "username email -_id") 
            .populate("categoryId", "name -_id");      

        if (!deploy) {
            return res.status(404).json({ message: "Deploy not found!" });
        }

        let linkStatus = "unavailable (no link provided)";

        if (deploy.link) {
            try {
                // maxRedirects: 5 força o axios a seguir os redirecionamentos (ex: http -> https)
                // validateStatus permite considerar códigos 2xx e 3xx como válidos
                const response = await axios.head(deploy.link, { 
                    timeout: 3000,
                    maxRedirects: 5,
                    validateStatus: (status) => status >= 200 && status < 400
                });
                
                linkStatus = "disponivel";
            } catch (error) {
                try {
                    // PLANO B: Alguns servidores rejeitam o método HEAD (erro 405). 
                    // Se o HEAD falhar, tentamos um GET ligeiro trazendo apenas a primeira linha da página
                    const fallback = await axios.get(deploy.link, { 
                        timeout: 2000, 
                        maxRedirects: 5,
                        headers: { 'Range': 'bytes=0-10' }, // Não faz o download do site todo
                        validateStatus: (status) => status >= 200 && status < 400
                    });
                    linkStatus = "disponivel";
                } catch (fallbackError) {
                    linkStatus = "indisponivel";
                }
            }
        }

        const responseData = deploy.toObject();
        responseData.status_online = linkStatus;

        return res.status(200).json(responseData);
    } catch (err) {
        return res.status(500).json({ message: "Error fetching deploy.", error: err.message });
    }
});

// 3. Listar TODOS os Deploys com Verificação Online Reforçada (GET)
router.get("/", async (req, res) => {
    try {
        const deploys = await Deploy.find({}, { __v: 0 }) 
            .populate("userId", "username -_id")      
            .populate("categoryId", "name -_id");     

        const deploysComStatus = await Promise.all(
            deploys.map(async (deploy) => {
                const deployObj = deploy.toObject();
                let linkStatus = "unavailable (no link provided)";

                if (deployObj.link) {
                    try {
                        const response = await axios.head(deployObj.link, { 
                            timeout: 2500,
                            maxRedirects: 5,
                            validateStatus: (status) => status >= 200 && status < 400
                        });
                        linkStatus = "disponivel";
                    } catch (error) {
                        try {
                            // PLANO B Geral
                            await axios.get(deployObj.link, { 
                                timeout: 2000, 
                                maxRedirects: 5,
                                headers: { 'Range': 'bytes=0-10' },
                                validateStatus: (status) => status >= 200 && status < 400
                            });
                            linkStatus = "disponivel";
                        } catch (fallbackError) {
                            linkStatus = "indisponivel";
                        }
                    }
                }

                deployObj.status_online = linkStatus;
                return deployObj;
            })
        );

        return res.status(200).json(deploysComStatus);
    } catch (err) {
        return res.status(500).json({ message: "Error fetching deploys.", error: err.message });
    }
});

// 4. Atualizar um Deploy (PUT)
router.put("/:id", async (req, res) => {
    try {
        const { title, link, description, available, categoryId } = req.body;

        const updatedDeploy = await Deploy.findByIdAndUpdate(
            req.params.id,
            { 
                $set: { 
                    ...(title && { title }),
                    ...(link && { link }),
                    ...(description && { description }), 
                    ...(categoryId && { categoryId })
                } 
            },
            { new: true } 
        );

        if (!updatedDeploy) {
            return res.status(404).json({
                message: "Deploy not found!",
            });
        }

        return res.status(200).json({
            message: "Deploy has been updated!",
            deploy: updatedDeploy,
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error updating deploy.",
            error: err.message,
        });
    }
});

// 5. Apagar um Deploy (DELETE)
router.delete("/:id", async (req, res) => {
    try {
        const deletedDeploy = await Deploy.findByIdAndDelete(req.params.id);

        if (!deletedDeploy) {
            return res.status(404).json({
                message: "Deploy not found!",
            });
        }

        return res.status(200).json({
            message: "Deploy has been deleted!",
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error deleting deploy.",
            error: err.message,
        });
    }
});

module.exports = router;
