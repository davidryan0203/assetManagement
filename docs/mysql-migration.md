# MySQL Migration Guide

This project now uses Prisma + MySQL as the primary database layer.

## 1. Environment Variables

Set these in `.env.local`:

```dotenv
DATABASE_URL="mysql://<user>:<password>@<host>:3306/inventory_system"
JWT_SECRET="<your-secret>"
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_APP_NAME=InventorySystem
```

Legacy `MONGO_URI` is no longer required by the codebase and can be removed.

## 2. Install Dependencies

```bash
npm install
```

## 3. Generate Prisma Client

```bash
npm run prisma:generate
```

## 4. Create and Apply MySQL Schema

For first-time setup:

```bash
npm run prisma:migrate -- --name init_mysql
```

If schema is already managed and you only need client updates:

```bash
npm run prisma:generate
```

## 5. Seed Initial Data

Start the app and call the seed endpoint once:

- `POST /api/seed`

This creates default departments and an admin user if they do not exist.

## 6. Verify Build

```bash
npx tsc --noEmit
```

## 7. Optional: Data Backfill from MongoDB

If you have existing Mongo data, migrate it using a one-time script:

1. Export collections from MongoDB.
2. Transform Mongo `_id` references to Prisma string IDs (or map to new IDs with lookup tables).
3. Insert data in relational order:
   1. `departments`, `sites`, `categories`, `vendors`
   2. `users`, `product_types`, `products`
   3. `assets`
   4. `report_folders`, `reports`
4. Validate foreign key integrity.

## 8. Security Note

If any connection strings or secrets were exposed, rotate them immediately.
