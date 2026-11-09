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

-- 1. Adicionar colunas de despesas e quilometragem na tabela 'prancheta_registros'
ALTER TABLE prancheta_registros 
ADD COLUMN IF NOT EXISTS alimentacao NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS perfumaria NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS outros_gastos NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS km_inicial NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS km_final NUMERIC DEFAULT NULL;

-- 3. Liberar permissão de EXCLUIR (DELETE) nas tabelas
DROP POLICY IF EXISTS "Permitir delete em prancheta_registros" ON prancheta_registros;
CREATE POLICY "Permitir delete em prancheta_registros" 
ON prancheta_registros 
FOR DELETE 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir delete em movimentos" ON movimentos;
CREATE POLICY "Permitir delete em movimentos" 
ON movimentos 
FOR DELETE 
TO anon, authenticated 
USING (true);
