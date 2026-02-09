-- Corrige el 500 al leer profiles: la política de admins no debe leer profiles en la misma política.
-- Ejecutar en Supabase SQL Editor.

DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (get_my_rol() = 'admin')
  WITH CHECK (get_my_rol() = 'admin');
