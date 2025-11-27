CREATE DATABASE safebite_db
  WITH OWNER = current_user
       ENCODING = 'UTF8'
       TEMPLATE = template0;

-- ============================
-- SEQUENCES
-- ============================

CREATE SEQUENCE public.blacklisted_tokens_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE public.recipe_favorites_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE public.recipe_ratings_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE public.recipe_restrictions_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE public.recipes_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE public.restrictions_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE public.user_restrictions_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE public.users_id_seq AS integer START WITH 1 INCREMENT BY 1;

-- ============================
-- TABELA: blacklisted_tokens
-- ============================

CREATE TABLE public.blacklisted_tokens (
    id integer NOT NULL DEFAULT nextval('public.blacklisted_tokens_id_seq'::regclass),
    token_hash character varying(128) NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE public.blacklisted_tokens IS 'Tokens JWT invalidados';
COMMENT ON COLUMN public.blacklisted_tokens.token_hash IS 'Hash SHA-256 do token JWT';

ALTER TABLE public.blacklisted_tokens
    ADD CONSTRAINT blacklisted_tokens_pkey PRIMARY KEY (id);

ALTER TABLE public.blacklisted_tokens
    ADD CONSTRAINT blacklisted_tokens_token_hash_key UNIQUE (token_hash);

CREATE INDEX idx_blacklisted_tokens_token_hash ON public.blacklisted_tokens(token_hash);
CREATE INDEX idx_blacklisted_tokens_expires_at ON public.blacklisted_tokens(expires_at);

-- ============================
-- TABELA: users
-- ============================

CREATE TABLE public.users (
    id integer NOT NULL DEFAULT nextval('public.users_id_seq'::regclass),
    nome_completo character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    senha_hash character varying(255) NOT NULL,
    telefone character varying(20),
    idade integer,
    foto_perfil character varying(255),
    email_verificado boolean DEFAULT false,
    token_verificacao_email character varying(255),
    token_recuperacao_senha character varying(255),
    data_expiracao_token timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tem_restricao boolean DEFAULT false NOT NULL
);

ALTER TABLE public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

-- ============================
-- TABELA: recipes
-- ============================

CREATE TABLE public.recipes (
    id integer NOT NULL DEFAULT nextval('public.recipes_id_seq'::regclass),
    user_id integer NOT NULL,
    nome character varying(255) NOT NULL,
    descricao text,
    ingredientes text NOT NULL,
    modo_preparo text NOT NULL,
    tempo_preparo character varying(255),
    rendimento character varying(255),
    propriedades text,
    imagem_url character varying(255),
    status character varying(50) NOT NULL,
    visualizacoes integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    restricoes_detectadas text
);

ALTER TABLE public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);

CREATE INDEX idx_recipes_nome ON public.recipes(nome);
CREATE INDEX idx_recipes_status ON public.recipes(status);
CREATE INDEX idx_recipes_user_status ON public.recipes(user_id, status);
CREATE INDEX idx_recipes_visualizacoes ON public.recipes(visualizacoes DESC);

ALTER TABLE public.recipes
    ADD CONSTRAINT fk_recipe_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================
-- TABELA: restrictions
-- ============================

CREATE TABLE public.restrictions (
    id integer NOT NULL DEFAULT nextval('public.restrictions_id_seq'::regclass),
    nome character varying(255) NOT NULL,
    categoria character varying(255) NOT NULL,
    palavras_chave jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.restrictions
    ADD CONSTRAINT restrictions_pkey PRIMARY KEY (id);

CREATE INDEX idx_restrictions_nome ON public.restrictions(nome);

-- ============================
-- TABELA: recipe_restrictions
-- ============================

CREATE TABLE public.recipe_restrictions (
    id integer NOT NULL DEFAULT nextval('public.recipe_restrictions_id_seq'::regclass),
    recipe_id integer NOT NULL,
    ingrediente_restritivo text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    restriction_id integer
);

ALTER TABLE public.recipe_restrictions
    ADD CONSTRAINT recipe_restrictions_pkey PRIMARY KEY (id);

CREATE INDEX idx_recipe_restrictions_recipe ON public.recipe_restrictions(recipe_id);
CREATE INDEX idx_recipe_restrictions_restriction_id ON public.recipe_restrictions(restriction_id);
CREATE INDEX idx_recipe_restrictions_recipe_restriction ON public.recipe_restrictions(recipe_id, restriction_id);

ALTER TABLE public.recipe_restrictions
    ADD CONSTRAINT fk_recipe_restriction FOREIGN KEY (recipe_id)
        REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE public.recipe_restrictions
    ADD CONSTRAINT fk_recipe_restrictions_restriction_id FOREIGN KEY (restriction_id)
        REFERENCES public.restrictions(id)
        ON UPDATE CASCADE ON DELETE CASCADE;

-- ============================
-- TABELA: recipe_ratings
-- ============================

CREATE TABLE public.recipe_ratings (
    id integer NOT NULL DEFAULT nextval('public.recipe_ratings_id_seq'::regclass),
    recipe_id integer NOT NULL,
    user_id integer NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comentario text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.recipe_ratings
    ADD CONSTRAINT recipe_ratings_pkey PRIMARY KEY (id);

CREATE INDEX idx_recipe_ratings_recipe ON public.recipe_ratings(recipe_id);
CREATE INDEX idx_recipe_ratings_recipe_user ON public.recipe_ratings(recipe_id, user_id);

ALTER TABLE public.recipe_ratings
    ADD CONSTRAINT fk_rating_recipe FOREIGN KEY (recipe_id)
        REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE public.recipe_ratings
    ADD CONSTRAINT fk_rating_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================
-- TABELA: recipe_favorites
-- ============================

CREATE TABLE public.recipe_favorites (
    id integer NOT NULL DEFAULT nextval('public.recipe_favorites_id_seq'::regclass),
    recipe_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.recipe_favorites
    ADD CONSTRAINT recipe_favorites_pkey PRIMARY KEY (id);

ALTER TABLE public.recipe_favorites
    ADD CONSTRAINT recipe_favorites_recipe_id_user_id_key
        UNIQUE (recipe_id, user_id);

CREATE INDEX idx_recipe_favorites_recipe_user ON public.recipe_favorites(recipe_id, user_id);

ALTER TABLE public.recipe_favorites
    ADD CONSTRAINT fk_favorite_recipe FOREIGN KEY (recipe_id)
        REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE public.recipe_favorites
    ADD CONSTRAINT fk_favorite_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================
-- TABELA: user_restrictions
-- ============================

CREATE TABLE public.user_restrictions (
    id integer NOT NULL DEFAULT nextval('public.user_restrictions_id_seq'::regclass),
    user_id integer NOT NULL,
    restriction_id integer NOT NULL,
    palavras_chave_personalizadas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.user_restrictions
    ADD CONSTRAINT user_restrictions_pkey PRIMARY KEY (id);

CREATE INDEX idx_user_restrictions_user ON public.user_restrictions(user_id);
CREATE INDEX idx_user_restrictions_user_restriction ON public.user_restrictions(user_id, restriction_id);

ALTER TABLE public.user_restrictions
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_restrictions
    ADD CONSTRAINT fk_restriction FOREIGN KEY (restriction_id)
        REFERENCES public.restrictions(id) ON DELETE CASCADE;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
