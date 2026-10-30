---
quick_id: 261030-pedidos-pdf-con-foto
slug: pedidos-pdf-con-foto
date: 2026-10-30
status: in-progress
branch: feat/pedidos-pdf-con-foto
---

# Quick Task — Pedidos en PDF con foto de la camiseta

## Descripción

El vendedor recibe hoy un `.txt` con texto libre, sin foto. Pide un PDF con una
página por camiseta:

```
Foto de la camiseta
Size: XXL
Version: Fan
Name: MOLTEN 5
Patches: FIFA WORLD CHAMPIONS 2026
```

## Decisiones (cerradas con el usuario)

- **Formulario estructurado**: talla, versión, nombre + dorsal, parches, equipo,
  temporada, notas y foto. Se acaba el texto libre como única entrada.
- **Foto en Supabase Storage** (bucket `jerseys`), subiendo archivo o pegando un
  enlace. La imagen se redimensiona en el navegador antes de subirla.
- **PDF**: foto + las cuatro líneas exactas, más `Team`, `Season`, `Notes` y
  `Price`. Una página A4 por pedido.
- **Compatibilidad**: `order_text` se sigue guardando como resumen legible, así
  el CSV y el TXT anónimo actuales y los pedidos antiguos siguen funcionando.
- **Privacidad intacta**: el tipo de exportación sigue sin campos de identidad ni
  de emparejamiento. El nombre del fichero de la foto es un UUID aleatorio.

## Tareas

1. **Contrato de datos** (`types.ts`, `orders.ts`): columnas nuevas
   (`size`, `version`, `printed_name`, `number`, `patches`, `team`, `season`,
   `notes`, `photo_url`) y resumen generado con una función pura.
2. **Fotos** (`lib/photo.ts`): redimensionado a JPEG ≤ 1400 px, subida al bucket,
   espejo de enlaces externos y degradación explícita si el enlace bloquea CORS.
3. **Formulario** (`JerseyOrderForm.tsx`): campos estructurados, previsualización y
   edición del pedido existente.
4. **PDF** (`domain/ordersPdf.ts` + `lib/ordersPdf.ts`): modelo de páginas puro y
   render con `jsPDF` cargado bajo demanda.
5. **Admin** (`AdminPage.tsx`): botón «Descargar PDF para el vendedor» y aviso si
   algún pedido se queda sin foto.
6. **Esquema** (`supabase-schema.sql` + migración idempotente) y README.
7. **Tests**: modelo de páginas, fallback de pedidos antiguos y PDF generado.

## Verificación

- `npm run test`
- `npm run lint`
- `npm run build`
