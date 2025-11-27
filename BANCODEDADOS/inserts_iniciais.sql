-- ============================================
-- INSERTS INICIAIS
-- ============================================

-- Usuários
INSERT INTO public.users (nome_completo, email, senha_hash, telefone, idade)
VALUES
('Admin SafeBite', 'admin@safebite.com', 'hash_senha_admin', '11999999999', 30),
('Usuário Teste', 'teste@safebite.com', 'hash_senha_teste', '11988888888', 25);

-- Restrições alimentares
INSERT INTO public.restrictions (nome, categoria, palavras_chave)
VALUES
('Diabetes Tipo 1', 'Diabetes', '["açúcar", "mel", "xarope", "carboidrato simples"]'::jsonb),
('Doença Celíaca', 'Glúten', '["trigo", "cevada", "centeio", "glúten"]'::jsonb),
('Intolerância à Lactose', 'Laticínios', '["leite", "queijo", "manteiga", "creme de leite"]'::jsonb);

-- Inserir relação usuário-restrição
INSERT INTO public.user_restrictions (user_id, restriction_id)
VALUES
(2, 2), -- usuário teste tem doença celíaca
(2, 3); -- intolerância à lactose

-- Receitas
INSERT INTO public.recipes
(user_id, nome, descricao, ingredientes, modo_preparo, tempo_preparo, rendimento, status)
VALUES
(1, 'Bolo de Chocolate', 'Bolo simples e rápido', '["farinha de trigo", "açúcar", "chocolate", "ovos"]',
 'Misture tudo e asse por 40 minutos.', '40 min', '8 porções', 'publicado'),

(1, 'Salada de Frutas', 'Saudável e sem glúten', '["maçã", "banana", "uva", "mel"]',
 'Pique e misture tudo.', '10 min', '2 porções', 'publicado');

-- Favoritos
INSERT INTO public.recipe_favorites (recipe_id, user_id)
VALUES
(1, 2),
(2, 2);

-- Avaliações
INSERT INTO public.recipe_ratings (recipe_id, user_id, rating, comentario)
VALUES
(1, 2, 5, 'Muito bom!'),
(2, 2, 4, 'Gostei bastante.');
