/** Categorías para selector (incluye variantes para nuevo/editar alojamiento) */
export const CATEGORIAS_OPTIONS = [
  'Sin categorizar',
  'Hotel',
  'Hotel 1*',
  'Hotel 2*',
  'Hotel 3*',
  'Apart Hotel',
  'Hostería 1*',
  'Hostería 2*',
  'Hostería 3*',
  'Hostería 4*',
  'Departamentos con servicios',
  'Cabaña',
  'Cabaña 1*',
  'Cabaña 2*',
  'Camping',
  'Hospedaje',
  'Hostel',
];

/**
 * Normaliza el texto de categoría para mostrar (unifica acentos y variantes).
 */
export function normalizeCategoriaDisplay(str) {
  if (!str || typeof str !== 'string') return '—';
  const normalized = str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const lower = s.toLowerCase();
      const match = CATEGORIAS_OPTIONS.find((c) => c.toLowerCase() === lower);
      return match || s;
    });
  return normalized.length ? normalized.join(', ') : '—';
}
