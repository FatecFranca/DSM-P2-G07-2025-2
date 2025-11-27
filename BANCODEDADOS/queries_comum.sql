-- ============================================
-- QUERIES DE USO COMUM
-- ============================================

-- 1. Lista todas as receitas com os dados do autor
SELECT r.*, u.nome_completo AS autor
FROM recipes r
JOIN users u ON r.user_id = u.id;

-- 2. Receita completa com avaliações e média de nota
SELECT r.id, r.nome, r.descricao, AVG(rt.rating) AS media_nota
FROM recipes r
LEFT JOIN recipe_ratings rt ON rt.recipe_id = r.id
WHERE r.id = 1
GROUP BY r.id;

-- 3. Buscar receitas mais vistas (top 10)
SELECT id, nome, visualizacoes
FROM recipes
ORDER BY visualizacoes DESC
LIMIT 10;

-- 4. Listar favoritos de um usuário
SELECT f.id, r.nome, r.imagem_url
FROM recipe_favorites f
JOIN recipes r ON r.id = f.recipe_id
WHERE f.user_id = 2;

-- 5. Buscar receitas com JOIN de restrições detectadas
SELECT r.id, r.nome, rr.ingrediente_restritivo, rest.nome AS restricao
FROM recipe_restrictions rr
JOIN recipes r ON r.id = rr.recipe_id
JOIN restrictions rest ON rest.id = rr.restriction_id;

-- 6. Buscar todas as restrições de um usuário
SELECT ur.user_id, rest.nome, rest.palavras_chave
FROM user_restrictions ur
JOIN restrictions rest ON rest.id = ur.restriction_id
WHERE ur.user_id = 2;

-- 7. Verificar se um token foi blacklisted
SELECT id
FROM blacklisted_tokens
WHERE token_hash = 'HASH_DO_TOKEN_AQUI';

-- 8. Buscar receitas SEM ingredientes proibidos para um usuário
SELECT DISTINCT r.*
FROM recipes r
WHERE NOT EXISTS (
    SELECT 1
    FROM recipe_restrictions rr
    JOIN user_restrictions ur ON ur.restriction_id = rr.restriction_id
    WHERE rr.recipe_id = r.id
      AND ur.user_id = 2
);

-- 9. Buscar receitas que CONTÉM ingredientes proibidos para um usuário (útil para alertas)
SELECT DISTINCT r.nome, rr.ingrediente_restritivo
FROM recipes r
JOIN recipe_restrictions rr ON rr.recipe_id = r.id
JOIN user_restrictions ur ON ur.restriction_id = rr.restriction_id
WHERE ur.user_id = 2;

-- 10. Receita completa: autor, avaliações, favoritos e restrições
SELECT
    r.*,
    u.nome_completo AS autor,
    COALESCE(AVG(rt.rating), 0) AS media_nota,
    COUNT(f.id) AS total_favoritos
FROM recipes r
JOIN users u ON u.id = r.user_id
LEFT JOIN recipe_ratings rt ON rt.recipe_id = r.id
LEFT JOIN recipe_favorites f ON f.recipe_id = r.id
GROUP BY r.id, u.id;
