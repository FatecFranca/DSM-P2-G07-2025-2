# SAFEBITEPI_BACKEND

Backend da aplicação SafeBite - Plataforma de receitas com foco em restrições alimentares.

## 🚀 Início Rápido

### Pré-requisitos
- Node.js >= 18.0.0
- npm ou yarn
- PostgreSQL (para banco de dados)

### Instalação

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
# Copie o arquivo .env.example para .env e configure as variáveis
cp .env.example .env
```

3. Inicie o servidor:
```bash
# Modo desenvolvimento (com nodemon)
npm run dev

# Modo produção
npm start
```

### Scripts Disponíveis

- `npm start` - Inicia o servidor em modo produção
- `npm run dev` - Inicia o servidor em modo desenvolvimento (com nodemon)
- `npm test` - Executa os testes
- `npm run migrate` - Executa as migrações do banco de dados
- `npm run seed` - Popula o banco de dados com dados iniciais

### Documentação da API

A documentação completa da API está disponível via **Swagger UI**:

**URL**: `http://localhost:3001/api-docs`

A documentação inclui:
- ✅ Todos os endpoints da API
- ✅ Modelos de dados (schemas)
- ✅ Códigos de erro padronizados
- ✅ Exemplos de requisições e respostas
- ✅ Teste interativo dos endpoints
- ✅ Autenticação JWT integrada

Para mais detalhes, consulte: [DOCUMENTACAO_API.md](./DOCUMENTACAO_API.md)

## 📋 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/         # Configurações (banco de dados, etc.)
│   ├── controllers/    # Controladores das rotas
│   ├── models/         # Modelos de dados
│   ├── routes/         # Definição das rotas
│   ├── middleware/     # Middlewares customizados
│   ├── services/       # Lógica de negócio
│   ├── utils/          # Utilitários
│   └── server.js       # Arquivo principal
├── tests/              # Testes
├── migrations/         # Migrações do banco de dados
├── seeds/              # Seeds do banco de dados
└── uploads/            # Arquivos enviados
```

## 🛠️ Stack Tecnológica

- **Backend**: Node.js + Express.js
- **Banco de Dados**: PostgreSQL
- **ORM**: Sequelize
- **Autenticação**: JWT (jsonwebtoken)
- **Validação**: Joi
- **Upload**: Multer
- **Email**: Nodemailer
- **Testes**: Jest

## 📝 Prioridades

1. **Alta Prioridade**: Autenticação, CRUD de Receitas, Gestão de Restrições
2. **Média Prioridade**: Upload de Imagens, Busca e Filtros, Avaliações
3. **Baixa Prioridade**: Favoritos, Email, Testes E2E

## ✅ Checklist Final
- [ ] Todas as funcionalidades implementadas
- [ ] Testes passando
- [ ] Documentação completa
- [ ] Código revisado
- [ ] Deploy realizado
- [ ] Monitoramento configurado
