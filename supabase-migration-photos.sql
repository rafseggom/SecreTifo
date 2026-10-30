-- =============================================
-- SecretKit — migración 261030: pedido estructurado + foto
-- =============================================
-- Ejecuta este fichero en el SQL Editor de Supabase ANTES de desplegar la rama
-- feat/pedidos-pdf-con-foto. Es idempotente: se puede ejecutar varias veces.
--
-- Añade las columnas que rellena el formulario nuevo y crea el bucket público
-- donde se guardan las fotos de las camisetas. `order_text` se conserva como
-- resumen legible para el CSV/TXT y para los pedidos anteriores.

-- -------------------------------------------------
-- 1. Columnas del pedido estructurado
-- -------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS version TEXT,
  ADD COLUMN IF NOT EXISTS printed_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS patches TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS team TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS season TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- `version` es un enum de tres valores. El nombre se fija para poder recrear la
-- restricción sin acumular duplicados al reejecutar.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_version_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_version_check
  CHECK (version IS NULL OR version IN ('Fan', 'Player', 'Retro'));

-- -------------------------------------------------
-- 2. Bucket de fotos
-- -------------------------------------------------
-- Público en lectura: el Admin necesita pintar el PDF desde el navegador sin
-- sesión de Supabase Auth. El nombre de cada objeto es un UUID aleatorio, así
-- que la URL no revela a quién pertenece la camiseta.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'jerseys',
  'jerseys',
  TRUE,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -------------------------------------------------
-- 3. Políticas del bucket
-- -------------------------------------------------
DROP POLICY IF EXISTS "jerseys_public_read" ON storage.objects;
CREATE POLICY "jerseys_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'jerseys');

DROP POLICY IF EXISTS "jerseys_insert" ON storage.objects;
CREATE POLICY "jerseys_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'jerseys');

DROP POLICY IF EXISTS "jerseys_update" ON storage.objects;
CREATE POLICY "jerseys_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'jerseys');
