-- Migración: Auth + RLS para usar solo Supabase (sin backend)
-- Ejecutar en Supabase SQL Editor DESPUÉS de schema.sql

-- 1. Tabla de perfiles (vinculada a Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('viewer', 'agente', 'admin')),
  oficina TEXT
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.rol = 'admin')
  );

-- 2. Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS TEXT AS $$
  SELECT rol FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Función para verificar permiso
CREATE OR REPLACE FUNCTION has_permission(perm TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN profiles p ON p.rol = rp.rol
    WHERE p.id = auth.uid() AND rp.permission = perm
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. RLS en alojamientos
ALTER TABLE alojamientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alojamientos_select"
  ON alojamientos FOR SELECT TO authenticated
  USING (get_my_rol() IN ('viewer', 'agente', 'admin'));

CREATE POLICY "alojamientos_insert"
  ON alojamientos FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() = 'admin' OR has_permission('edit_alojamientos'));

CREATE POLICY "alojamientos_update"
  ON alojamientos FOR UPDATE TO authenticated
  USING (get_my_rol() = 'admin' OR has_permission('edit_alojamientos'));

CREATE POLICY "alojamientos_delete"
  ON alojamientos FOR DELETE TO authenticated
  USING (get_my_rol() = 'admin' OR has_permission('edit_alojamientos'));

-- 5. RLS en relevamientos
ALTER TABLE relevamientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "relevamientos_select"
  ON relevamientos FOR SELECT TO authenticated
  USING (get_my_rol() IN ('viewer', 'agente', 'admin'));

CREATE POLICY "relevamientos_all"
  ON relevamientos FOR ALL TO authenticated
  USING (get_my_rol() = 'admin' OR has_permission('edit_relevamiento'))
  WITH CHECK (get_my_rol() = 'admin' OR has_permission('edit_relevamiento'));

-- 6. RLS en relevamiento_config
ALTER TABLE relevamiento_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "relevamiento_config_select"
  ON relevamiento_config FOR SELECT TO authenticated
  USING (get_my_rol() IN ('viewer', 'agente', 'admin'));

CREATE POLICY "relevamiento_config_all"
  ON relevamiento_config FOR ALL TO authenticated
  USING (get_my_rol() = 'admin' OR has_permission('launch_relevamiento'));

-- 7. RLS en role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select"
  ON role_permissions FOR SELECT TO authenticated
  USING (get_my_rol() IN ('viewer', 'agente', 'admin'));

CREATE POLICY "role_permissions_all"
  ON role_permissions FOR ALL TO authenticated
  USING (get_my_rol() = 'admin' OR has_permission('manage_users'));

-- 8. RLS en inmobiliarias
ALTER TABLE inmobiliarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inmobiliarias_select"
  ON inmobiliarias FOR SELECT TO authenticated
  USING (get_my_rol() = 'admin' OR has_permission('view_inmobiliarias'));

CREATE POLICY "inmobiliarias_modify"
  ON inmobiliarias FOR ALL TO authenticated
  USING (get_my_rol() = 'admin' OR has_permission('edit_inmobiliarias'))
  WITH CHECK (get_my_rol() = 'admin' OR has_permission('edit_inmobiliarias'));

-- 9. RLS en inmobiliarias_config y relevamiento_inmobiliarias
ALTER TABLE inmobiliarias_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inmob_config_select" ON inmobiliarias_config FOR SELECT TO authenticated USING (get_my_rol() IN ('viewer', 'agente', 'admin'));
CREATE POLICY "inmob_config_all" ON inmobiliarias_config FOR ALL TO authenticated USING (get_my_rol() = 'admin' OR has_permission('launch_inmobiliarias'));

ALTER TABLE relevamiento_inmobiliarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "relev_inmob_select" ON relevamiento_inmobiliarias FOR SELECT TO authenticated USING (get_my_rol() = 'admin' OR has_permission('view_inmobiliarias'));
CREATE POLICY "relev_inmob_all" ON relevamiento_inmobiliarias FOR ALL TO authenticated USING (get_my_rol() = 'admin' OR has_permission('edit_inmobiliarias'));

-- 10. RLS en balnearios
ALTER TABLE balnearios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "balnearios_select"
  ON balnearios FOR SELECT TO authenticated
  USING (get_my_rol() = 'admin' OR has_permission('view_balnearios'));

CREATE POLICY "balnearios_modify"
  ON balnearios FOR ALL TO authenticated
  USING (get_my_rol() = 'admin' OR has_permission('edit_balnearios'))
  WITH CHECK (get_my_rol() = 'admin' OR has_permission('edit_balnearios'));

ALTER TABLE balnearios_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "baln_config_select" ON balnearios_config FOR SELECT TO authenticated USING (get_my_rol() IN ('viewer', 'agente', 'admin'));
CREATE POLICY "baln_config_all" ON balnearios_config FOR ALL TO authenticated USING (get_my_rol() = 'admin' OR has_permission('launch_balnearios'));

ALTER TABLE relevamiento_balnearios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "relev_baln_select" ON relevamiento_balnearios FOR SELECT TO authenticated USING (get_my_rol() = 'admin' OR has_permission('view_balnearios'));
CREATE POLICY "relev_baln_all" ON relevamiento_balnearios FOR ALL TO authenticated USING (get_my_rol() = 'admin' OR has_permission('edit_balnearios'));

-- 11. Trigger: al crear un usuario en Auth se crea su perfil (rol viewer por defecto)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    'viewer'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE profiles IS 'Perfiles vinculados a auth.users. Nuevos usuarios obtienen rol viewer; un admin puede cambiarlo.';
