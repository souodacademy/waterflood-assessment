# Waterflood Performance Management System

## Demo User Accounts

Use these demo accounts to test the application.

| Role               | Username                   | Password                   |
| ------------------ | -------------------------- | -------------------------- |
| Operator           | `operator@waterflood.demo` | `WaterfloodOperator-2026!` |
| Petroleum Engineer | `engineer@waterflood.demo` | `WaterfloodEngineer-2026!` |
| Administrator      | `admin@waterflood.demo`    | `WaterfloodAdmin-2026!`    |

**Note:** These credentials work only when local demo authentication is enabled and the application has been rebuilt with the required support.

### Role Permissions

- **Operator:** View wells and update operational measurements, including injection rates and well status.
- **Petroleum Engineer:** Operator permissions, plus update engineering information, configure alert thresholds, and analyze waterflood performance.
- **Administrator:** Full CRUD access to wells, injector–producer relationships, thresholds, and user-role management.

## Run the Application

You need two terminal windows: one for the backend and one for the frontend.

### 1. Start the Backend

From the project root, run:

```bash
cd server
dotnet run --urls http://127.0.0.1:5000
```

The backend API will run at:

`http://127.0.0.1:5000`

Keep this terminal running.

### 2. Start the Frontend

Open a second terminal at the project root and run:

```bash
cd client
DOTNET_API_URL=http://127.0.0.1:5000 corepack pnpm dev --host 127.0.0.1
```

Open the local URL printed in the terminal, typically:

`http://127.0.0.1:5173`

Keep this terminal running too.

### 3. Log In

Open the frontend in your browser and sign in using one of the demo accounts listed above.

Test each role to verify its permissions.

## Optional: Set Up Real Supabase Authentication

This step is required only when testing real Supabase sessions and backend authorization.

### 1. Configure the Database

Run the following SQL script in the Supabase SQL Editor:

`database/roles.sql`

### 2. Seed Demo Users

From the project root, run:

```bash
cd server

SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="YOUR_ACTUAL_SERVICE_ROLE_KEY" \
node tools/seed-demo-users.mjs
```

Replace the example URL and key with your actual Supabase project credentials.

The script creates Supabase Auth users, assigns their roles, generates passwords, prints the credentials, and saves them locally in `.demo-credentials.local.md`.

The generated credentials may differ from the local demo credentials listed above.

**Security:** Never commit your Supabase service-role key or generated credentials file to Git. Never expose the service-role key in frontend code.

## Troubleshooting

- **Backend fails to start:** Verify that the .NET SDK is installed and run the command from the `server` directory.
- **Frontend fails to start:** Verify that Node.js and pnpm are available.
- **Login fails:** Confirm that local demo authentication is enabled or that Supabase authentication is configured correctly.
- **API requests fail:** Confirm that the backend is running at `http://127.0.0.1:5000` and that `DOTNET_API_URL` matches the backend URL.
- **Port already in use:** Stop the process using the port or configure an available port and update the API URL accordingly.
