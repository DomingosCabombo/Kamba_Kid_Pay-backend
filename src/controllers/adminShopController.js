const ShopItem = require("../models/ShopItem");
const LogAdmin = require("../models/LogAdmin");

// ============================================
// GET /api/admin/shop/items
// ============================================
exports.listarItens = async (req, res) => {
    try {
        const { tipo } = req.query;
        const where = {};
        if (tipo) where.tipo = tipo;

        const itens = await ShopItem.findAll({ where });
        res.json({ total: itens.length, itens });
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// POST /api/admin/shop/items
// ============================================
exports.criarItem = async (req, res) => {
    try {
        const { nome, tipo, preco, nivel_necessario, imagem_url } = req.body;

        const novoItem = await ShopItem.create({
            nome, tipo, preco, nivel_necessario, imagem_url
        });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "CRIAR",
            entidade: "shop_item",
            id_entidade: novoItem.id_item,
            detalhes: JSON.stringify({ nome, tipo, preco })
        });

        res.status(201).json(novoItem);
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PUT /api/admin/shop/items/:id
// ============================================
exports.atualizarItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await ShopItem.findByPk(id);
        
        if (!item) {
            return res.status(404).json({ erro: "ITEM_NAO_ENCONTRADO" });
        }

        await item.update(req.body);

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ATUALIZAR",
            entidade: "shop_item",
            id_entidade: id
        });

        res.json(item);
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// DELETE /api/admin/shop/items/:id
// ============================================
exports.deletarItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await ShopItem.findByPk(id);
        
        if (!item) {
            return res.status(404).json({ erro: "ITEM_NAO_ENCONTRADO" });
        }

        await item.destroy();

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "DELETAR",
            entidade: "shop_item",
            id_entidade: id
        });

        res.json({ mensagem: "Item deletado com sucesso" });
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};
