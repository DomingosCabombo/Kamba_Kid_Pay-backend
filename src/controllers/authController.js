const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Responsavel = require("../models/Responsavel");
const Criancas = require ("../models/Criancas")

const SECRET = process.env.JWT_SECRET;

 
// ==============================
// GET /api/auth/me
// ==============================
exports.me = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                erro: "NAO_AUTENTICADO",
                mensagem: "Sessão inválida ou expirada."
            });
        }

        const decoded = jwt.verify(token, SECRET);

        const responsavel = await Responsavel.findByPk(decoded.id);

        if (!responsavel) {
            return res.status(404).json({
                erro: "UTILIZADOR_NAO_ENCONTRADO"
            });
        }

        return res.json({
            id: responsavel.id_responsavel,
            nome: responsavel.nome_completo,
            tipo: responsavel.tipo, // ✔ agora correto
            email: responsavel.email
        });

    } catch (error) {
        return res.status(401).json({
            erro: "NAO_AUTENTICADO",
            mensagem: "Sessão inválida ou expirada."
        });
    }
};


// ==============================
// POST /api/auth/login
// ==============================
exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: "CAMPOS_OBRIGATORIOS",
                mensagem: "Email e senha são obrigatórios."
            });
        }

        // 🔥 PRIMEIRO: Tentar como responsável
        const responsavel = await Responsavel.findOne({ where: { email } });

        if (responsavel) {
            const senhaValida = await bcrypt.compare(senha, responsavel.senha);
            if (senhaValida) {
                const token = jwt.sign(
                    { id: responsavel.id_responsavel, tipo: "responsavel" },
                    SECRET,
                    { expiresIn: "7d" }
                );
                return res.json({
                    token,
                    usuario: {
                        id: responsavel.id_responsavel,
                        nome: responsavel.nome_completo,
                        tipo: responsavel.tipo, 
                        email: responsavel.email,
                        telefone: responsavel.telefone,
                        provincia: responsavel.provincia,
                        municipio: responsavel.municipio
                    }
                });
            }
        }

        // 🔥 SEGUNDO: Tentar como criança (usando nome_usuario como email)
        const crianca = await Criancas.findOne({ where: { nome_usuario: email } });
        
        if (crianca) {
            const senhaValida = await bcrypt.compare(senha, crianca.senha);
            if (senhaValida) {
                const token = jwt.sign(
                    { id: crianca.id_crianca, tipo: "crianca" },
                    SECRET,
                    { expiresIn: "7d" }
                );
                return res.json({
                    token,
                    usuario: {
                        id: crianca.id_crianca,
                        nome: crianca.nome_completo,
                        tipo: "crianca",
                        username: crianca.nome_usuario,
                        idade: crianca.idade,
                        nivel: crianca.nivel,
                        xp: crianca.xp,
                        provincia: crianca.provincia,
                        municipio: crianca.municipio,
                        avatar: crianca.avatar,
                        potes: {
                            gastar: parseFloat(crianca.saldo_gastar),
                            poupar: parseFloat(crianca.saldo_poupar),
                            ajudar: parseFloat(crianca.saldo_ajudar),
                            total: parseFloat(crianca.saldo_gastar) + parseFloat(crianca.saldo_poupar) + parseFloat(crianca.saldo_ajudar)
                        }
                    }
                });
            }
        }

        // Se chegou aqui, credenciais inválidas
        return res.status(401).json({
            erro: "CREDENCIAIS_INVALIDAS",
            mensagem: "Conta não encontrada. Verifique seus dados."
        });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({
            erro: "ERRO_INTERNO",
            mensagem: "Erro ao processar login"
        });
    }
};

// ==============================
// POST /api/auth/register
// ==============================
exports.register = async (req, res) => {
    try {
        const { nome, email, senha, tipo, provincia, municipio, telefone } = req.body;

        if (!nome || !email || !senha || !tipo || !provincia || !municipio || !telefone) {
            return res.status(400).json({
                erro: "CAMPOS_OBRIGATORIOS",
                mensagem: "Preencha todos os campos obrigatórios."
            });
        }

        const existe = await Responsavel.findOne({ where: { email } });
        if (existe) {
            return res.status(409).json({
                erro: "EMAIL_JA_REGISTADO",
                mensagem: "Este e-mail já está em uso."
            });
        }

        const existeTelefone = await Responsavel.findOne({ where: { telefone } });
        if (existeTelefone) {
            return res.status(409).json({
                erro: "TELEFONE_JA_REGISTADO",
                mensagem: "Este número de telefone já está em uso."
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const novoResponsavel = await Responsavel.create({
            nome_completo: nome,
            email,
            tipo,
            telefone,
            senha: senhaHash,
            provincia,
            municipio
        });

        const token = jwt.sign(
            { id: novoResponsavel.id_responsavel, tipo: "responsavel" },
            SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            token,
            usuario: {
                id: novoResponsavel.id_responsavel,
                nome: novoResponsavel.nome_completo,
                tipo: novoResponsavel.tipo,
                telefone: novoResponsavel.telefone,
                email: novoResponsavel.email,
                provincia: novoResponsavel.provincia,
                municipio: novoResponsavel.municipio
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: "ERRO_INTERNO",
            mensagem: error.message
        });
    }
};


// ==============================
// POST /api/auth/logout
// ==============================
exports.logout = async (req, res) => {
    return res.json({
        mensagem: "Sessão encerrada com sucesso."
    });
};