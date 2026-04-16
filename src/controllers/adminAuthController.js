const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const LogAdmin = require("../models/LogAdmin");

const SECRET = process.env.JWT_SECRET;

// ============================================
// POST /api/admin/auth/login
// ============================================
exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: "CAMPOS_OBRIGATORIOS",
                mensagem: "Email e senha são obrigatórios."
            });
        }

        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
            return res.status(401).json({
                erro: "CREDENCIAIS_INVALIDAS",
                mensagem: "Credenciais inválidas."
            });
        }

        if (!admin.ativo) {
            return res.status(401).json({
                erro: "CONTA_DESATIVADA",
                mensagem: "Esta conta está desativada."
            });
        }

        const senhaValida = await bcrypt.compare(senha, admin.senha);
        if (!senhaValida) {
            return res.status(401).json({
                erro: "CREDENCIAIS_INVALIDAS",
                mensagem: "Credenciais inválidas."
            });
        }

        // Atualizar último acesso
        await admin.update({ ultimo_acesso: new Date() });

        // Registrar log
        await LogAdmin.create({
            id_admin: admin.id_admin,
            acao: "LOGIN",
            entidade: "admin",
            ip: req.ip
        });

        const token = jwt.sign(
            { id: admin.id_admin, tipo: "admin", role: admin.tipo },
            SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            usuario: {
                id: admin.id_admin,
                nome: admin.nome,
                email: admin.email,
                tipo: admin.tipo
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/auth/me
// ============================================
exports.me = async (req, res) => {
    try {
        const admin = await Admin.findByPk(req.usuario.id);
        res.json({
            id: admin.id_admin,
            nome: admin.nome,
            email: admin.email,
            tipo: admin.tipo,
            ativo: admin.ativo
        });
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};
