# Production deployment checklist

Use this when deploying schema or asset UI changes to another server.

## 1. Pull the latest code

Make sure the production server has the latest commit from the repository.

## 2. Set environment variables

Confirm `DATABASE_URL` points to the production MySQL database.

Example:

```env
DATABASE_URL="mysql://<user>:<password>@<host>:3306/inventory_system"
JWT_SECRET="<production-secret>"
```

## 3. Install dependencies

```bash
npm install
```

## 4. Apply database migrations

Run the production-safe Prisma migration command:

```bash
npm run prisma:deploy
```

This applies any pending migrations, including the `associatedToIds` JSON column used for multi-asset associations.

## 5. Regenerate Prisma Client

```bash
npm run prisma:generate
```

## 6. Restart the app

Restart your process manager or hosting service so the new code and schema are loaded.

## 7. Verify

- Open the Assets page
- Edit an asset
- Confirm the Associated To field supports multiple asset selections
- Save and reload to verify the selections persist

## Notes

- Do not use `prisma migrate dev` on production.
- Use `prisma migrate deploy` for server environments.
- If you add more schema changes later, repeat steps 4 and 5 on the target server.
