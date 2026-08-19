# DineManager production deployment

This deployment includes the restaurant system only. The separate `chatbotdinemanager` service and customer chatbot route are intentionally excluded.

## Required services

- A MySQL-compatible database such as TiDB Serverless.
- Vercel Blob for menu/QR image uploads, or a later migration to Azure Blob Storage.
- SMTP credentials for password-reset email.
- Google OAuth and reCAPTCHA credentials if those login protections are enabled.

## Environment variables

Copy `.env.example` into the deployment secret store and set every value. Never commit `.env.local`.

`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` must point to the production database. `JWT_SECRET`, `NEXTAUTH_SECRET`, and `ADMIN_SECRET_KEY` must be long random values. Set `NEXTAUTH_URL` to the public HTTPS URL.

## Database bootstrap

The migration runner creates the baseline schema in `migrations/000_create_core_schema.sql`, applies versioned changes, and verifies required tables.

Run this once against a new/staging database before starting the web service:

```bash
npm run migrate
npm run db:verify
```

For the first administrator, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` only for the one-time command below, then remove them from the secret store:

```bash
npm run admin:create
```

Do not import the production data dump into a shared/public environment. Use the schema migration for new installations and a separately approved data restore for an existing restaurant.

## PM2 deployment

The application can run directly under PM2. Install PM2 on the server (globally or through your server's process-management policy), then run the following from `DineManager`:

```bash
npm ci
npm run build
npm run migrate
npm run db:verify
pm2 start npm --name dinemanager -- start
pm2 save
pm2 startup
```

Set the production environment variables in the server's environment or secret manager before starting PM2. After changing environment variables, restart with:

```bash
pm2 restart dinemanager --update-env
```

Verify the process and health endpoint:

```bash
pm2 status
curl http://127.0.0.1:3000/api/health
```

Configure the reverse proxy (IIS/Nginx) to forward HTTPS traffic to port 3000. Keep the application behind HTTPS and do not expose the Node.js port directly to the public internet.

Before exposing the service, set production secrets, run the database bootstrap, and verify login, menu, order, payment-slip, shop-dashboard, and password-reset flows in staging.
