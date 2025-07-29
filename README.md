# SmartBox

Proyecto de Cerrojo Inteligente con ESP32, Backend en Node.js y Frontend en React.

## Descripción

SmartBox es un sistema de cerradura electrónica controlada por ESP32 que se comunica con un backend para registrar eventos y con un frontend para controlar la cerradura y mostrar el estado.

## Tecnologías usadas

- ESP32 (firmware Arduino)
- Backend: Node.js, Express, PostgreSQL
- Frontend: React, Vite
## Cómo ejecutar
### Requisitos previos
- Tener instalado PostgreSQL. Si no lo tenés, podés descargarlo e instalarlo desde:  
  https://www.postgresql.org/download/  
  Durante la instalación, configurá un usuario y contraseña para usar luego en la conexión.


### Configurar la base de datos
1. Crear una base de datos PostgreSQL llamada `smartbox_db` (o el nombre que prefieras).  
2. Importar el archivo `schema.sql` que está en la raíz del proyecto (desde pgAdmin o usando la terminal con:  
```bash
psql -U tu_usuario -d smartbox_db -f schema.sql
```
Crear un archivo .env dentro de la carpeta backend con el siguiente contenido:

DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/smartbox_db

(reemplazá usuario, contraseña y localhost por tus datos)


### Backend

```bash
cd backend
npm install
nodemon

```
### Frontend
```bash
cd frontend
npm install
npm run dev
```
