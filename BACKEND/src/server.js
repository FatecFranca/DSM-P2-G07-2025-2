require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { sanitizeInput } = require('./middleware/sanitize');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:*', 'http://127.0.0.1:*'],
        connectSrc: ["'self'", 'http://localhost:*', 'http://127.0.0.1:*'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Configuração de CORS mais flexível para desenvolvimento
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (ex: Postman, mobile apps, file://)
    if (!origin) return callback(null, true);
    
    // Lista de origens permitidas
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://localhost:5500', // Live Server
      'http://127.0.0.1:5500',
      'file://' // Para arquivos HTML locais
    ];
    
    // Adicionar origem do .env se existir
    if (process.env.CORS_ORIGIN) {
      allowedOrigins.push(process.env.CORS_ORIGIN);
    }
    
    // Em desenvolvimento, permitir qualquer localhost ou 127.0.0.1
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      if (origin.match(/^http:\/\/localhost:\d+$/) || 
          origin.match(/^http:\/\/127\.0\.0\.1:\d+$/) ||
          origin.startsWith('file://') ||
          origin.startsWith('null')) {
        return callback(null, true);
      }
    }
    
    // Verificar se a origem está na lista permitida
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Em desenvolvimento, logar mas permitir
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.warn(`⚠️  CORS: Origem não listada, mas permitindo em desenvolvimento: ${origin}`);
        callback(null, true);
      } else {
        callback(new Error('Não permitido pelo CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Aplicar CORS antes de outros middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging de requisições
app.use(requestLogger);

// Sanitização de dados de entrada
app.use(sanitizeInput);

// Servir arquivos estáticos (uploads) com headers CORS adequados
const path = require('path');
app.use('/uploads', (req, res, next) => {
  // Adicionar headers CORS para arquivos estáticos
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  
  // Continuar para servir o arquivo
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Rate limiting - mais permissivo em desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isDevelopment ? 1000 : 100), // 1000 em dev, 100 em produção
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente mais tarde.',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true, // Retorna rate limit info nos headers
  legacyHeaders: false, // Desabilita headers legados
  // Em desenvolvimento, permitir mais requisições e resetar mais rápido
  skip: (req) => {
    // Em desenvolvimento, não aplicar rate limit em rotas de health check
    if (isDevelopment && req.path === '/health') {
      return true;
    }
    return false;
  }
});
app.use('/api/', limiter);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'SafeBite API - Backend',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/health'
  });
});

// Documentação Swagger
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SafeBite API Documentation'
  })
);

// Rotas da API
app.use('/api', routes);

// Middleware de erro 404 (rota não encontrada)
app.use(notFound);

// Middleware de tratamento de erros
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, async () => {
  logger.info('Servidor iniciado', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  });

  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS: Configurado para aceitar localhost (desenvolvimento)`);
  if (process.env.CORS_ORIGIN) {
    console.log(`   Origem adicional: ${process.env.CORS_ORIGIN}`);
  }
  console.log(`📚 Documentação: http://localhost:${PORT}/api-docs`);

  // Testar conexão com o banco de dados
  await testConnection();
});

module.exports = app;
