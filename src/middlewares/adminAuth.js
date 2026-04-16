const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const SECRET = process.env.JWT_SECRET;

exports.adminAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        
        if (!token) {
            return res.status(401).json({ 
                erro: "NAO_AUTENTICADO", 
                mensagem: "Token não fornecido." 
            });
        }

        const decoded = jwt.verify(token, SECRET);
        
        if (decoded.tipo !== 'admin') {
            return res.status(403).json({ 
                erro: "SEM_PERMISSAO", 
                mensagem: "Acesso apenas para administradores." 
            });
        }

        const admin = await Admin.findByPk(decoded.id);
        if (!admin || !admin.ativo) {
            return res.status(401).json({ 
                erro: "NAO_AUTENTICADO", 
                mensagem: "Administrador não encontrado ou inativo." 
            });
        }

        req.usuario = {
            id: admin.id_admin,
            nome: admin.nome,
            tipo: 'admin',
            role: admin.tipo
        };
        
        next();
    } catch (error) {
        return res.status(401).json({ 
            erro: "NAO_AUTENTICADO", 
            mensagem: "Token inválido ou expirado." 
        });
    }
};

exports.requireSuperAdmin = (req, res, next) => {
    if (req.usuario.role !== 'super_admin') {
        return res.status(403).json({ 
            erro: "SEM_PERMISSAO", 
            mensagem: "Acesso restrito a super administradores." 
        });
    }
    next();
};
