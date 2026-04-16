## 📋 1. AUTENTICAÇÃO ADMIN

### **1.1 Login Admin**
```http
POST http://localhost:3000/api/admin/auth/login
Content-Type: application/json

{
    "email": "admin@kambakidpay.com",
    "senha": "admin123"
}
```

**Resposta esperada:**
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
        "id": 1,
        "nome": "Super Admin",
        "email": "admin@kambakidpay.com",
        "tipo": "super_admin"
    }
}
```

### **1.2 Verificar Sessão**
```http
GET http://localhost:3000/api/admin/auth/me
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "id": 1,
    "nome": "Super Admin",
    "email": "admin@kambakidpay.com",
    "tipo": "super_admin",
    "ativo": true
}
```

---

## 📊 2. DASHBOARD

### **2.1 Dashboard Principal**
```http
GET http://localhost:3000/api/admin/dashboard
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "resumo": {
        "total_responsaveis": 5,
        "total_criancas": 12,
        "total_tarefas_mes": 45,
        "total_missoes_completas": 28,
        "total_doacoes": 12500,
        "total_campanhas_ativas": 3,
        "total_conteudos": 8
    },
    "graficos": {
        "tarefas_por_mes": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 45],
        "meses": ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    },
    "top_criancas": [
        { "id": 1, "nome": "Kiala", "xp": 1250, "nivel": 5 },
        { "id": 2, "nome": "Dulce", "xp": 980, "nivel": 4 }
    ],
    "top_campanhas": [
        { "id": 1, "nome": "Merenda Escolar", "arrecadado": 5000, "meta": 10000, "percentual": 50 }
    ]
}
```

### **2.2 Estatísticas por Período**
```http
GET http://localhost:3000/api/admin/stats?periodo=mensal
Authorization: Bearer {{token_admin}}
```

**Parâmetros:** `periodo` = `diario`, `semanal`, `mensal`, `anual`

**Resposta esperada:**
```json
{
    "periodo": "mensal",
    "tarefas_concluidas": 12,
    "novas_criancas": 2,
    "novas_campanhas": 1,
    "valor_arrecadado": 3500
}
```

---

## 📈 3. ANALYTICS (Filtros Avançados)

### **3.1 Ranking de Províncias**
```http
GET http://localhost:3000/api/admin/analytics/provincias?ano=2025
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "ano": 2025,
    "total_criancas": 50,
    "total_analisadas": 48,
    "ranking": [
        {
            "provincia": "Luanda",
            "total_criancas": 18,
            "total_poupado": 12500,
            "total_gasto": 8700,
            "total_doado": 3200,
            "media_poupanca_por_crianca": 694.44,
            "taxa_poupanca": "58.9"
        }
    ]
}
```

### **3.2 Ranking de Municípios**
```http
GET http://localhost:3000/api/admin/analytics/municipios?provincia=Luanda&ano=2025
Authorization: Bearer {{token_admin}}
```

### **3.3 Análise de Comportamento**
```http
GET http://localhost:3000/api/admin/analytics/comportamento?provincia=Luanda&data_inicio=2025-01-01&data_fim=2025-12-31
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "filtros_aplicados": {
        "provincia": "Luanda",
        "data_inicio": "2025-01-01",
        "data_fim": "2025-12-31"
    },
    "resumo": {
        "total_criancas_analisadas": 18,
        "total_poupado": 12500,
        "total_gasto": 8700,
        "total_doado": 3200,
        "taxa_poupanca": "58.9"
    },
    "top_regioes": {
        "mais_poupam": [{ "provincia": "Luanda", "total_poupado": 12500 }],
        "mais_gastam": [{ "provincia": "Luanda", "total_gasto": 8700 }],
        "mais_doam": [{ "provincia": "Luanda", "total_doado": 3200 }]
    },
    "tendencias_mensais": [
        { "periodo": "2025-1", "poupado": 1200, "gasto": 800, "doado": 300 }
    ]
}
```

### **3.4 Comparativo Anual**
```http
GET http://localhost:3000/api/admin/analytics/ano-comparativo?anos=2024,2025,2026
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "comparativo": [
        { "ano": 2024, "poupado": 8500, "gasto": 6200, "doado": 2100 },
        { "ano": 2025, "poupado": 12500, "gasto": 8700, "doado": 3200 },
        { "ano": 2026, "poupado": 3400, "gasto": 2100, "doado": 800 }
    ],
    "destaques": {
        "ano_mais_poupou": { "ano": 2025, "valor": 12500 },
        "ano_mais_gastou": { "ano": 2025, "valor": 8700 },
        "ano_mais_doou": { "ano": 2025, "valor": 3200 }
    }
}
```

### **3.5 Análise por Faixa Etária**
```http
GET http://localhost:3000/api/admin/analytics/faixa-etaria?ano=2025
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "ano": 2025,
    "faixas_etarias": {
        "6-8": { "criancas": 12, "total_poupado": 3200, "total_gasto": 2800, "total_doado": 800 },
        "9-10": { "criancas": 20, "total_poupado": 6800, "total_gasto": 4200, "total_doado": 1500 },
        "11-12": { "criancas": 15, "total_poupado": 7200, "total_gasto": 4800, "total_doado": 2100 },
        "13+": { "criancas": 3, "total_poupado": 1200, "total_gasto": 900, "total_doado": 400 }
    }
}
```

### **3.6 Campanhas Populares por Região**
```http
GET http://localhost:3000/api/admin/analytics/campanhas-populares?provincia=Luanda&ano=2025
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "provincia": "Luanda",
    "ano": 2025,
    "total_doacoes": 45,
    "ranking": [
        {
            "nome": "Merenda Escolar",
            "causa": "educacao",
            "total_arrecadado": 3200,
            "numero_doacoes": 28
        }
    ]
}
```

### **3.7 Top Poupadores**
```http
GET http://localhost:3000/api/admin/analytics/top-poupadores?periodo=ano&limite=10
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "periodo": "ano",
    "total_poupadores": 45,
    "ranking": [
        {
            "id": 1,
            "nome": "Kiala",
            "idade": 9,
            "provincia": "Luanda",
            "total_poupado": 4300,
            "xp": 1250,
            "nivel": 5
        }
    ]
}
```

### **3.8 Top Gastadores**
```http
GET http://localhost:3000/api/admin/analytics/top-gastadores?periodo=ano&limite=10
Authorization: Bearer {{token_admin}}
```

### **3.9 Top Doadores**
```http
GET http://localhost:3000/api/admin/analytics/top-doadores?periodo=ano&limite=10
Authorization: Bearer {{token_admin}}
```

---

## 👥 4. GESTÃO DE UTILIZADORES

### **4.1 Listar Responsáveis**
```http
GET http://localhost:3000/api/admin/utilizadores/responsaveis?busca=joao&provincia=Luanda&status=Ativo&pagina=1&limite=20
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "total": 5,
    "pagina": 1,
    "totalPaginas": 1,
    "usuarios": [
        {
            "id": 1,
            "nome": "João Manuel",
            "email": "joao@email.com",
            "telefone": "+244 923 456 789",
            "provincia": "Luanda",
            "municipio": "Luanda",
            "tipo": "Pai",
            "status": "Ativo",
            "dataCadastro": "2024-01-15T00:00:00.000Z",
            "saldoKz": 0,
            "dependentes": [
                {
                    "id": 2,
                    "nome": "Kiala",
                    "idade": 9,
                    "nivel": 5,
                    "saldos": { "gastar": 3200, "poupar": 4300, "ajudar": 1000, "total": 8500 }
                }
            ]
        }
    ]
}
```

### **4.2 Listar Dependentes de um Responsável**
```http
GET http://localhost:3000/api/admin/utilizadores/responsaveis/1/dependentes
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "responsavel": {
        "id": 1,
        "nome": "João Manuel",
        "email": "joao@email.com"
    },
    "total": 2,
    "dependentes": [
        {
            "id": 2,
            "nome": "Kiala",
            "idade": 9,
            "nivel": 5,
            "xp": 1250,
            "provincia": "Luanda",
            "municipio": "Talatona",
            "saldos": { "gastar": 3200, "poupar": 4300, "ajudar": 1000, "total": 8500 }
        }
    ]
}
```

### **4.3 Listar Crianças**
```http
GET http://localhost:3000/api/admin/utilizadores/criancas?busca=kiala&provincia=Luanda&idade_min=6&idade_max=12&pagina=1&limite=20
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "total": 12,
    "pagina": 1,
    "totalPaginas": 1,
    "usuarios": [
        {
            "id": 2,
            "nome": "Kiala",
            "email": "kiala123",
            "telefone": "+244 923 456 789",
            "provincia": "Luanda",
            "municipio": "Talatona",
            "tipo": "Criança",
            "status": "Ativo",
            "dataCadastro": "2024-01-20T00:00:00.000Z",
            "saldoKz": 8500,
            "responsavel": {
                "id": 1,
                "nome": "João Manuel",
                "email": "joao@email.com"
            }
        }
    ]
}
```

### **4.4 Buscar Responsável de uma Criança**
```http
GET http://localhost:3000/api/admin/utilizadores/criancas/2/responsavel
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "crianca": {
        "id": 2,
        "nome": "Kiala"
    },
    "responsavel": {
        "id": 1,
        "nome": "João Manuel",
        "email": "joao@email.com",
        "telefone": "+244 923 456 789"
    }
}
```

### **4.5 Ativar/Desativar Responsável**
```http
PATCH http://localhost:3000/api/admin/utilizadores/responsaveis/1/status
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "status": "Inativo"
}
```

**Resposta esperada:**
```json
{
    "mensagem": "Responsável inativo com sucesso"
}
```

### **4.6 Ativar/Desativar Criança**
```http
PATCH http://localhost:3000/api/admin/utilizadores/criancas/2/status
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "status": "Ativo"
}
```

### **4.7 Desativar Responsável (DELETE)**
```http
DELETE http://localhost:3000/api/admin/utilizadores/responsaveis/1
Authorization: Bearer {{token_admin}}
```

---

## ✅ 5. GESTÃO DE TAREFAS

### **5.1 Listar Tarefas**
```http
GET http://localhost:3000/api/admin/tarefas?status=pendente&categoria=save&crianca_id=2&pagina=1&limite=20
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "total": 8,
    "pagina": 1,
    "totalPaginas": 1,
    "tarefas": [
        {
            "id": 1,
            "titulo": "Arrumar o quarto",
            "descricao": "Guardar brinquedos e fazer a cama",
            "recompensaKz": 150,
            "categoria": "Casa",
            "dificuldade": "Fácil",
            "icone": "🛏️",
            "tempoEstimado": "15 min",
            "status": "Ativa",
            "vezesCompletada": 0,
            "crianca": { "id": 2, "nome": "Kiala" },
            "responsavel": { "id": 1, "nome": "João Manuel" },
            "criado_em": "2026-04-01T10:00:00.000Z"
        }
    ]
}
```

### **5.2 Listar Tarefas por Criança**
```http
GET http://localhost:3000/api/admin/tarefas/criancas/2
Authorization: Bearer {{token_admin}}
```

### **5.3 Listar Crianças para Tarefas (Select do Modal)**
```http
GET http://localhost:3000/api/admin/criancas/para-tarefas
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "criancas": [
        { "id": 2, "nome": "Kiala", "idade": 9, "responsavel": "João Manuel" },
        { "id": 3, "nome": "Dulce", "idade": 7, "responsavel": "João Manuel" }
    ]
}
```

### **5.4 Criar Tarefa**
```http
POST http://localhost:3000/api/admin/tarefas
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "titulo": "Lavar a louça",
    "descricao": "Lavar e secar toda a louça após o jantar",
    "recompensa": 200,
    "categoria": "Casa",
    "icone": "🍽️",
    "crianca_id": 2
}
```

### **5.5 Atualizar Tarefa**
```http
PUT http://localhost:3000/api/admin/tarefas/1
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "titulo": "Arrumar o quarto completo",
    "recompensa": 200
}
```

### **5.6 Alterar Status da Tarefa**
```http
PATCH http://localhost:3000/api/admin/tarefas/1/status
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "status": "Inativa"
}
```

### **5.7 Deletar Tarefa**
```http
DELETE http://localhost:3000/api/admin/tarefas/1
Authorization: Bearer {{token_admin}}
```

---

## 🎬 6. GESTÃO DE VÍDEOS

### **6.1 Listar Vídeos**
```http
GET http://localhost:3000/api/admin/videos?tipo=video&faixa_etaria=9-10
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "total": 5,
    "videos": [
        {
            "id": 1,
            "titulo": "O que é dinheiro?",
            "descricao": "Aprenda sobre a história do dinheiro",
            "url": "https://youtube.com/watch?v=abc123",
            "thumbnail": "https://images.unsplash.com/...",
            "duracao": "3:45",
            "categoria": "video",
            "faixa_etaria": "6-8",
            "visualizacoes": 1250,
            "dataCriacao": "2026-01-15T00:00:00.000Z"
        }
    ]
}
```

### **6.2 Estatísticas de Vídeos**
```http
GET http://localhost:3000/api/admin/videos/estatisticas
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "total": 8,
    "total_visualizacoes": 4560,
    "categorias": [
        { "categoria": "video", "total": 6, "visualizacoes": 3200 },
        { "categoria": "artigo", "total": 2, "visualizacoes": 1360 }
    ]
}
```

### **6.3 Criar Vídeo**
```http
POST http://localhost:3000/api/admin/videos
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "titulo": "Como fazer um orçamento",
    "descricao": "Aprenda a planejar seus gastos mensais",
    "tipo": "video",
    "faixa_etaria": "9-10",
    "thumbnail_url": "https://images.unsplash.com/...",
    "url": "https://youtube.com/watch?v=xyz789",
    "duracao": "5:30",
    "topico": "orcamento",
    "xp_recompensa": 25
}
```

### **6.4 Atualizar Vídeo**
```http
PUT http://localhost:3000/api/admin/videos/1
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "titulo": "O que é dinheiro? (Atualizado)",
    "xp_recompensa": 20
}
```

### **6.5 Deletar Vídeo**
```http
DELETE http://localhost:3000/api/admin/videos/1
Authorization: Bearer {{token_admin}}
```

---

## 🧠 7. GESTÃO DE QUIZZES

### **7.1 Listar Quizzes**
```http
GET http://localhost:3000/api/admin/quizzes
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "total": 3,
    "quizzes": [
        {
            "id": 1,
            "titulo": "O que é Poupar?",
            "descricao": "Teste seus conhecimentos sobre poupança",
            "categoria": "Poupar",
            "dificuldade": "Fácil",
            "pergunta": "O que significa poupar dinheiro?",
            "opcoes": [
                { "id": 1, "texto": "Gastar tudo", "correta": false, "icone": "💸" },
                { "id": 2, "texto": "Guardar para o futuro", "correta": true, "icone": "🏦" }
            ],
            "explicacao": "Poupar significa guardar dinheiro para usar no futuro",
            "pontosRecompensa": 50,
            "vezesCompletado": 450,
            "dataCriacao": "2026-01-20T00:00:00.000Z"
        }
    ]
}
```

### **7.2 Criar Quiz**
```http
POST http://localhost:3000/api/admin/quizzes
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "titulo": "Gastar com Sabedoria",
    "descricao": "Teste seus conhecimentos sobre gastos inteligentes",
    "categoria": "Gastar",
    "dificuldade": "Média",
    "pergunta": "Antes de comprar algo, você deve:",
    "opcoes": [
        { "texto": "Comprar imediatamente", "correta": false, "icone": "🛒" },
        { "texto": "Pensar se realmente precisa", "correta": true, "icone": "🤔" },
        { "texto": "Pedir emprestado", "correta": false, "icone": "💳" },
        { "texto": "Esquecer", "correta": false, "icone": "🚫" }
    ],
    "explicacao": "Sempre pense bem antes de gastar!",
    "pontosRecompensa": 75
}
```

### **7.3 Atualizar Quiz**
```http
PUT http://localhost:3000/api/admin/quizzes/1
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "titulo": "O que é Poupar? (Atualizado)",
    "pontosRecompensa": 60
}
```

### **7.4 Deletar Quiz**
```http
DELETE http://localhost:3000/api/admin/quizzes/1
Authorization: Bearer {{token_admin}}
```

---

## 🎯 8. GESTÃO DE CAMPANHAS

### **8.1 Listar Campanhas**
```http
GET http://localhost:3000/api/admin/campanhas?status=true&causa=educacao
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "total": 3,
    "campanhas": [
        {
            "id": 1,
            "titulo": "Merenda Escolar",
            "descricao": "Ajude a fornecer merenda para crianças",
            "imagemCapa": "https://images.unsplash.com/...",
            "categoria": "Educação",
            "metaKz": 50000,
            "arrecadadoKz": 32500,
            "percentualAtingido": 65,
            "dataInicio": "2026-01-01T00:00:00.000Z",
            "dataFim": "2026-12-31T00:00:00.000Z",
            "status": "Ativa",
            "numeroDoadores": 156,
            "organizacao": "ONG Kamba Solidário",
            "localizacao": "Luanda",
            "dataCriacao": "2026-01-01T00:00:00.000Z"
        }
    ]
}
```

### **8.2 Métricas de Campanhas**
```http
GET http://localhost:3000/api/admin/campanhas/metricas
Authorization: Bearer {{token_admin}}
```

**Resposta esperada:**
```json
{
    "total_campanhas_ativas": 3,
    "total_doadores": 234,
    "total_meta": 150000,
    "total_arrecadado": 87500
}
```

### **8.3 Criar Campanha**
```http
POST http://localhost:3000/api/admin/campanhas
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "titulo": "Água Potável em Benguela",
    "descricao": "Construção de poços de água potável",
    "categoria": "Saúde",
    "metaKz": 100000,
    "organizacao": "Água Viva Angola",
    "localizacao": "Benguela",
    "dataInicio": "2026-04-01",
    "dataFim": "2026-12-31",
    "imagemCapa": "https://images.unsplash.com/..."
}
```

### **8.4 Atualizar Campanha**
```http
PUT http://localhost:3000/api/admin/campanhas/1
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "titulo": "Merenda Escolar (Atualizado)",
    "metaKz": 60000
}
```

### **8.5 Ativar/Desativar Campanha**
```http
PATCH http://localhost:3000/api/admin/campanhas/1/status
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "status": "Pausada"
}
```

### **8.6 Deletar Campanha**
```http
DELETE http://localhost:3000/api/admin/campanhas/1
Authorization: Bearer {{token_admin}}
```

### **9. GESTÃO DA LOJA**

9.1 Listar Itens da Loja
http
GET http://localhost:3000/api/admin/shop/items?tipo=cabelo
Authorization: Bearer {{token_admin}}
Parâmetros opcionais: tipo (cabelo, roupa, acessorio)

Resposta esperada:

json
{
    "total": 6,
    "itens": [
        {
            "id_item": 1,
            "nome": "Cabelo Padrão",
            "tipo": "cabelo",
            "preco": 0,
            "nivel_necessario": 1
        }
    ]
}
9.2 Criar Item
http
POST http://localhost:3000/api/admin/shop/items
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "nome": "Novo Acessório",
    "tipo": "acessorio",
    "preco": 300,
    "nivel_necessario": 4,
    "imagem_url": "https://..."
}
9.3 Atualizar Item
http
PUT http://localhost:3000/api/admin/shop/items/1
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "preco": 150,
    "nivel_necessario": 2
}
9.4 Deletar Item
http
DELETE http://localhost:3000/api/admin/shop/items/1
Authorization: Bearer {{token_admin}}

---