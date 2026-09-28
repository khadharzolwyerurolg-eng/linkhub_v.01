const router = require("express").Router();
const Deploy = require("../models/Deploy"); 
const axios = require("axios");


const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
];

//:: Função auxiliar para gerar cabeçalhos simulados com User-Agent aleatório
const getHeadersConfig = () => {
    const randomAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    return {
        'User-Agent': randomAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };
};

// Helper: verifica se um link está alcançável com retries, logging e resposta consistente
const checkLinkAvailable = async (url) => {
    if (!url) return { available: false, reason: 'no_link' };
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const headers = getHeadersConfig();
        try {
            const resp = await axios.get(url, {
                timeout: 7000,
                maxRedirects: 5,
                headers: { ...headers, 'Range': 'bytes=0-1024' },
                validateStatus: () => true // sempre resolve, lidamos com status abaixo
            });

            return { available: true, status: resp.status };
        } catch (err) {
            // Se o servidor respondeu com erro (4xx/5xx), consideramos alcançável
            if (err.response) {
                return { available: true, status: err.response.status };
            }

            // Falha de rede/timeout: tentar novamente antes de desistir
            if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, 500 * attempt));
                continue;
            }

            console.error(`checkLinkAvailable: failed for ${url} —`, err.code || err.message);
            return { available: false, reason: err.code || err.message };
        }
    }
    return { available: false, reason: 'unknown' };
};

// 2. Procurar um Deploy por ID com Verificação Online e Simulação (GET)
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
            const check = await checkLinkAvailable(deploy.link);
            linkStatus = check.available ? "disponivel" : "indisponivel";
        }

        const responseData = deploy.toObject();
        responseData.status_online = linkStatus;

        return res.status(200).json(responseData);
    } catch (err) {
        return res.status(500).json({ message: "Error fetching deploy.", error: err.message });
    }
});

// 3. Listar TODOS os Deploys com Verificação Online e Simulação Dinâmica (GET)
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
                    const check = await checkLinkAvailable(deployObj.link);
                    linkStatus = check.available ? "disponivel" : "indisponivel";
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
