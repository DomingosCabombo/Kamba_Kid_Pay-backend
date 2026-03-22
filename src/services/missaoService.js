// services/missaoService.js
const sequelize = require("../config/database");
const Crianca = require("../models/Criancas");
const Missao = require("../models/Missoes");
const ProgressoMissao = require("../models/ProgressoMissao");

class MissaoService {
    
    async finalizarMissao(id_crianca, id_missao, dadosExtras = {}) {
        const transaction = await sequelize.transaction();
        
        try {
            const crianca = await Crianca.findByPk(id_crianca, { transaction });
            const missao = await Missao.findByPk(id_missao, { transaction });
            const progresso = await ProgressoMissao.findOne({
                where: { id_crianca, id_missao },
                transaction
            });

            if (!crianca || !missao) {
                throw new Error("Criança ou missão não encontrada");
            }

            if (!progresso) {
                throw new Error("Missão não iniciada");
            }

            if (progresso.estado === 'concluida') {
                throw new Error("Missão já foi concluída");
            }


            // 🔧 Preparar atualização da criança
            const updateCrianca = {};

            // ⚠️ REGRA: Só dá XP se NÃO for tarefa_casa
            if (missao.tipo_missao !== 'tarefa_casa') {
                const novoXP = crianca.xp + missao.xp_recompensa;
                const novoNivel = Math.floor(novoXP / 100) + 1;
                updateCrianca.xp = novoXP;
                updateCrianca.nivel = novoNivel;
            } 

            // Se tiver saldos (já calculados no controller), atualiza
            if (dadosExtras.saldos) {
                updateCrianca.saldo_gastar = dadosExtras.saldos.gastar;
                updateCrianca.saldo_poupar = dadosExtras.saldos.poupar;
                updateCrianca.saldo_ajudar = dadosExtras.saldos.ajudar;
            }

            // Só atualiza se tiver algo para atualizar
            if (Object.keys(updateCrianca).length > 0) {
                await crianca.update(updateCrianca, { transaction });
            }

            // Marcar progresso como concluído
            progresso.estado = 'concluida';
            progresso.data_conclusao = new Date();
            if (dadosExtras.foto) {
                progresso.prova_imagem = dadosExtras.foto;
            }
            await progresso.save({ transaction });

            await transaction.commit();

            return {
                sucesso: true,
                tipo_missao: missao.tipo_missao,
                xp_ganho: missao.tipo_missao !== 'tarefa_casa' ? missao.xp_recompensa : 0,
                xp_total: updateCrianca.xp || crianca.xp,
                novo_nivel: updateCrianca.nivel || crianca.nivel,
                missao_concluida: missao.titulo,
                saldos_atualizados: dadosExtras.saldos || null
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new MissaoService();