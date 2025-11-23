// Configurações da aplicação
const CONFIG = {
  // URL base da API - ajuste conforme necessário
  API_BASE_URL: 'http://localhost:3001/api',
  
  // Timeout para requisições (em milissegundos)
  REQUEST_TIMEOUT: 30000,
  
  // Chaves do localStorage para armazenar dados do usuário
  STORAGE_KEYS: {
    TOKEN: 'safebite_token',
    USER: 'safebite_user'
  }
};

// Exportar para uso global
window.CONFIG = CONFIG;

