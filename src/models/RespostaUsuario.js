const { DataTypes } = require("sequelize")
const sequelize = require("../config/database")

const RespostaUsuario = sequelize.define("resposta_usuario",{

id_resposta:{
type:DataTypes.INTEGER,
autoIncrement:true,
primaryKey:true
},

id_crianca:{
type:DataTypes.INTEGER
},

id_quiz:{
type:DataTypes.INTEGER
},

id_opcao:{
type:DataTypes.INTEGER
},

correta:{
type:DataTypes.BOOLEAN
}

},{
tableName:"resposta_usuario",
timestamps:false
})

module.exports = RespostaUsuario