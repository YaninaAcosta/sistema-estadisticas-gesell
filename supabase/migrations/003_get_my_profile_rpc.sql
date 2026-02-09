-- Una sola llamada para obtener perfil + permisos (menos latencia en login/carga)
CREATE OR REPLACE FUNCTION get_my_profile_with_permissions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  p profiles%ROWTYPE;
  perms TEXT[];
BEGIN
  SELECT * INTO p FROM profiles WHERE id = auth.uid() LIMIT 1;
  IF p.id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT array_agg(rp.permission) INTO perms
  FROM role_permissions rp WHERE rp.rol = p.rol;
  RETURN jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'nombre', p.nombre,
    'rol', p.rol,
    'oficina', p.oficina,
    'permissions', COALESCE(perms, ARRAY[]::TEXT[])
  );
END;
$$;

-- Permitir que usuarios autenticados ejecuten la función (solo devuelve su propio perfil)
GRANT EXECUTE ON FUNCTION get_my_profile_with_permissions() TO authenticated;
