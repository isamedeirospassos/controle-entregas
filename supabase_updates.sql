-- ========================================================
-- SCRIPT DE ATUALIZAÇÃO DO SUPABASE
-- CONTROLE DE ENTREGAS & PRANCHETA DE ROTAS
-- ========================================================
-- Instruções:
-- 1. Acesse o seu painel do Supabase: https://supabase.com
-- 2. Vá no projeto: qkrfmtykejpqtwtgrwbk
-- 3. Clique em "SQL Editor" no menu lateral esquerdo.
-- 4. Cole este script e clique em "RUN".
-- ========================================================

-- 1. Adicionar colunas de despesas na tabela 'prancheta_registros'
ALTER TABLE prancheta_registros 
ADD COLUMN IF NOT EXISTS alimentacao NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS perfumaria NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS outros_gastos NUMERIC DEFAULT 0;

-- 2. Comentários para documentação das novas colunas
COMMENT ON COLUMN prancheta_registros.alimentacao IS 'Valor gasto com alimentação no dia';
COMMENT ON COLUMN prancheta_registros.perfumaria IS 'Valor gasto com perfumaria no dia';
COMMENT ON COLUMN prancheta_registros.outros_gastos IS 'Outros gastos diversos do dia';
