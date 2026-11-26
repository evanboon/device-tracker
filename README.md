# Device Tracker

IT device inventory for CLAC IT (CMPT 339 project). Replaces the Excel workbook with a PostgreSQL database and a web front end.

## Layout

- `db/schema.sql`: the current schema, dumped from the dev server (PostgreSQL 17). Seven tables, plus triggers that log name, user, status and location changes to `workstation_history` and keep `updated_at` current.
- `db/seed.sql`: the sample rows on the dev server (made-up data).
- `web/`: clickable UI prototype (React, Tailwind, Vite). It runs on generated mock data and isn't connected to the database yet.

## Load the database

```sh
createdb device_tracker
psql -d device_tracker -f db/schema.sql -f db/seed.sql
```

## Run the prototype

```sh
cd web
npm install
npm run dev     # or: npm run build, then open dist/index.html
```
