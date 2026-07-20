# ADYR Alta Hub

Dashboard estático y navegable para analizar el viaje de alta de clientes:

- solicitudes y personas evaluadas en Experian;
- leads no clientes (`N`);
- altas PGD a través de Experian;
- altas manuales;
- evento extraordinario **G+** de junio 2025, asociado a HBC;
- oferta comercial EMINENT, PLUS y MOVE;
- conversión M0/M1;
- proxies de intentos y fricción.

## Publicar en Vercel

1. Descomprimir el ZIP.
2. Subir la carpeta completa a un repositorio de GitHub.
3. En Vercel, elegir **Add New Project** e importar el repositorio.
4. Framework preset: **Other**.
5. No hace falta build command ni output directory.
6. Deploy.

Es un sitio HTML/CSS/JavaScript puro. No requiere `npm install`, porque bastante dependencia innecesaria existe ya en el mundo.

## Actualizar datos

Reemplazar:

- `data/funnel-data.json`
- `data/funnel-data.csv`
- `data.js`

`data.js` debe mantener la forma:

```js
window.FUNNEL_DATA = { metadata: {...}, records: [...] };
```

## Definiciones importantes

- **Alta a través de Experian**: mismo `Party_ID` marcado `N` y luego presente en PGD en M0 o M1.
- **Alta manual**: residual sin match Experian, excluyendo G+.
- **G+**: residual extraordinario de junio 2025 por la incorporación HBC.
- **Intentos N por lead**: proxy mensual. No equivale todavía a intentos exactos antes del alta.

## SQL incluido

- `sql/funnel_origen_y_oferta.sql`: query usada para origen y oferta comercial.
- `sql/intentos_exactos_antes_alta.sql`: base para calcular intentos exactos previos al alta.
