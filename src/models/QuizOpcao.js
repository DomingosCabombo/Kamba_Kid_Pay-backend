const { DataTypes } = require("sequelize")
const sequelize = require("../config/database")

const QuizOpcao = sequelize.define("quiz_opcao",{

id_opcao:{
type:DataTypes.INTEGER,
autoIncrement:true,
primaryKey:true
},

texto:{
type:DataTypes.STRING
},

correta:{
type:DataTypes.BOOLEAN
},

id_quiz:{
type:DataTypes.INTEGER
}

},{
tableName:"quiz_opcao",
timestamps:false
})

module.exports = QuizOpcao