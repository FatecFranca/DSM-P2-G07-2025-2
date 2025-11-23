# SafeBite Frontend

Frontend da aplicação SafeBite - Plataforma de receitas com foco em restrições alimentares.

## 🚀 Início Rápido

### Pré-requisitos
- Node.js >= 14.0.0
- npm ou yarn

### Instalação

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor de desenvolvimento:
```bash
npm start
```

O servidor será iniciado em `http://localhost:3000` e o navegador abrirá automaticamente.

## 📋 Scripts Disponíveis

- `npm start` - Inicia o servidor na porta 3000 e abre o navegador automaticamente
- `npm run dev` - Inicia o servidor com cache desabilitado (útil para desenvolvimento)
- `npm run serve` - Inicia o servidor sem abrir o navegador automaticamente
- `npm run serve:8080` - Inicia o servidor na porta 8080

## 📁 Estrutura do Projeto

```
FRONTEND/
├── View/
│   ├── Index/          # Páginas HTML
│   ├── Script/         # Arquivos JavaScript
│   ├── Estilos/        # Arquivos CSS
│   └── Images/         # Imagens
├── package.json        # Configuração do projeto
└── README.md          # Este arquivo
```

## 🔧 Configuração

### Porta do Servidor

Para alterar a porta, edite o script no `package.json`:

```json
{
  "scripts": {
    "start": "http-server View -p 3000 -o"
  }
}
```

Altere `-p 3000` para a porta desejada.

### Opções do http-server

O `http-server` suporta várias opções:

- `-p` ou `--port` - Porta (padrão: 8080)
- `-o` - Abre o navegador automaticamente
- `-c-1` - Desabilita cache (útil para desenvolvimento)
- `-a` - Endereço (padrão: 0.0.0.0)
- `-S` - Habilita HTTPS

Exemplo com mais opções:
```json
"start": "http-server View -p 3000 -o -c-1 -a localhost"
```

## 🌐 Acessando a Aplicação

Após iniciar o servidor com `npm start`, acesse:

- **Menu Principal:** http://localhost:3000/Index/tela_4%20-%20menu-principal.html
- **Página de Teste API:** http://localhost:3000/Index/teste-api.html
- **Login:** http://localhost:3000/Index/autenticacao/tela_3%20-%20login.html

## 🔗 Integração com Backend

O frontend está configurado para se comunicar com o backend na porta 3001.

Para alterar a URL da API, edite o arquivo `View/Script/config.js`:

```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:3001/api',
  // ...
};
```

## 📚 Documentação Adicional

- [Guia de Integração com API](./INTEGRACAO_API.md)
- [Guia de Teste](./GUIA_TESTE.md)
- [Guia do Painel de Debug](./GUIA_PAINEL_DEBUG.md)
- [Sistema de Teste no Site](./README_TESTE_SITE.md)

## 🛠️ Desenvolvimento

### Modo de Desenvolvimento

Para desenvolvimento com cache desabilitado:

```bash
npm run dev
```

Isso evita problemas de cache durante o desenvolvimento.

### Estrutura de Arquivos

- **HTML:** Páginas em `View/Index/`
- **JavaScript:** Scripts em `View/Script/`
- **CSS:** Estilos em `View/Estilos/`
- **Imagens:** Imagens em `View/Images/`

## 🐛 Troubleshooting

### Erro: "Cannot find module 'http-server'"

**Solução:** Execute `npm install` para instalar as dependências.

### Erro: "Port 3000 is already in use"

**Solução:** 
- Use outra porta: `npm run serve:8080`
- Ou altere a porta no `package.json`

### Página não carrega corretamente

**Solução:**
- Verifique se o servidor está rodando
- Verifique se está acessando a URL correta
- Limpe o cache do navegador (Ctrl+Shift+Delete)

### Erros de CORS

**Solução:**
- Verifique se o backend está rodando na porta 3001
- Verifique a configuração de CORS no backend
- Verifique a URL da API em `View/Script/config.js`

## 📝 Notas

- O servidor serve arquivos estáticos (HTML, CSS, JS)
- Não é necessário compilar ou buildar o projeto
- Todas as páginas são HTML puro com JavaScript vanilla

## 🎯 Próximos Passos

1. Instale as dependências: `npm install`
2. Inicie o servidor: `npm start`
3. Acesse a aplicação no navegador
4. Comece a desenvolver!

---

**Desenvolvido por:** SafeBite Team
