Importar listado de alojamientos desde planilla
================================================

1. Normalización automática
   - Localidades: VG → Villa Gesell, MDLP → Mar de las Pampas, MA → Mar Azul, LG → Las Gaviotas, CM → Colonia Marina.
   - Categorías: se mapean al listado canónico (Hotel, Hotel 1*/2*/3*, Apart Hotel, Hostería 2*, Departamentos con servicios, Sin categorizar). Cabaña, Camping, Hospedaje, Hostel, etc. → Sin categorizar.

2. No se repiten alojamientos: se considera (localidad + prestador). Si ya existe, no se vuelve a insertar.

3. Exportá tu planilla a TSV o CSV:
   - En Excel: Guardar como → “Texto (delimitado por tabulaciones)” o CSV.
   - En Google Sheets: Archivo → Descargar → Valores separados por tabulaciones (.tsv) o CSV.
   - La primera fila debe ser encabezado. Columnas (en este orden, o con estos nombres):
     Localidad   Categoría   Prestadores   Web   Funcionamiento   Observaciones   Dirección   Teléfono fijo   WhatsApp   Plazas totales
   - “Prestadores” puede llamarse “Prestador”. “Plazas totales” es opcional (columna 10).
   - Separador: TAB (TSV) o coma (CSV).

4. Guardá el archivo como:
   backend/data/alojamientos-gesell.tsv
   (o .csv y pasá la ruta al script).

5. Desde la carpeta backend ejecutá:
   node scripts/import-alojamientos-gesell.js

   O con ruta explícita:
   node scripts/import-alojamientos-gesell.js data/alojamientos-gesell.tsv

6. El script solo agrega alojamientos nuevos (no borra los que ya están). Para reemplazar todo, primero borrá los alojamientos desde la app o desde Supabase.


Inmobiliarias y Balnearios
==========================

Importar desde los JSON que vienen con datos de ejemplo (o desde tu propio TSV/CSV):

  cd backend
  node scripts/import-inmobiliarias.js
  node scripts/import-balnearios.js

Por defecto leen: data/inmobiliarias-importar.json y data/balnearios-importar.json.
Podés pasar otra ruta: node scripts/import-inmobiliarias.js data/mi-listado.tsv

- Localidades normalizadas: VG→Villa Gesell, MDLP→Mar de las Pampas, MA→Mar Azul, LG→Las Gaviotas, CM→Colonia Marina.
- No se repiten: por (localidad + prestador) solo se insertan los que no existan.

Formato TSV: Localidad  Prestadores  Web  Dirección  e-mail  Teléfono fijo  WhatsApp (inmobiliarias);
             Localidad  Prestadores  Web  e-mail  Dirección  Teléfono fijo  WhatsApp (balnearios).

Datos de prueba (seed chico): node scripts/seed-inmobiliarias-balnearios.js  (usa --replace para reemplazar).
