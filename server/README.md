# Waterflood API

This ASP.NET Core service is the server boundary for the copied React
workspace. It does not store a second copy of the data: it reads and writes
the existing Supabase tables through Supabase REST.

## Configuration

Do not commit credentials. Configure the service with environment variables:

```sh
export Supabase__Url="https://your-project.supabase.co"
export Supabase__PublishableKey="your-publishable-key"
dotnet run --urls http://127.0.0.1:5000
```

The publishable key is used for anonymous sample reads. Authenticated writes
also require a Supabase access token in:

```text
Authorization: Bearer <supabase-access-token>
```

## Creating the three demo users

Run `database/roles.sql` in the Supabase SQL editor, then create the demo
accounts with the local seed script:

```sh
cd server
SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
node tools/seed-demo-users.mjs
```

The script creates confirmed accounts for:

- `operator@waterflood.demo` as `operator`
- `engineer@waterflood.demo` as `engineer`
- `admin@waterflood.demo` as `admin`

Passwords are generated at runtime and written only to the ignored local file
`.demo-credentials.local.md`. The service-role key and generated passwords
must never be committed.

## Role model

Roles are read from the `user_roles` table:

| Role | Permissions |
| --- | --- |
| `operator` | Update operational well fields: status, injection rate, measurement date |
| `engineer` | Operator permissions plus engineering measurements and thresholds |
| `admin` | Manage wells, relationships, thresholds, and user roles |

The service first validates the access token with Supabase Auth, then loads the
role for the authenticated user. Missing or expired sessions return `401`.
Users without the required role return `403`.

### Permission examples

An operator can submit a new injection measurement:

```http
PATCH /api/wells/{well-id}
Authorization: Bearer <operator-token>
Content-Type: application/json

{
  "status": "Active",
  "injection_rate": 4250,
  "measurement_date": "2026-10-13"
}
```

An operator attempting to change engineering fields is rejected by the API
authorization policy. An engineer can update engineering measurements and
thresholds, while only an administrator can create or delete records and
assign roles.

The role is not trusted from the request body. It is always resolved from the
authenticated Supabase user and `user_roles` record.

## Endpoints

### Read

- `GET /api/health` - process/liveness check
- `GET /api/workspace` - wells, relationships, measurements, thresholds, and role

### Role-protected mutations

- `POST /api/wells` - admin only
- `PATCH /api/wells/{id}` - operator, engineer, or admin
- `DELETE /api/wells/{id}` - admin only
- `POST /api/relationships` - admin only
- `PATCH /api/relationships/{id}` - admin only
- `DELETE /api/relationships/{id}` - admin only
- `PATCH /api/thresholds/{id}` - engineer or admin
- `POST /api/roles` - admin only

The React client uses `src/lib/dotnet-api.ts` to attach the current Supabase
session token to mutation requests. Supabase remains the identity provider;
the .NET service is responsible for API authorization and database access.

## Source map

- `Program.cs` - dependency injection, CORS, routes, and HTTP status mapping
- `Services/SupabaseWorkspaceService.cs` - authenticated workspace reads
- `Services/SupabaseMutationService.cs` - role checks and REST mutations
- `Models/WorkspaceModels.cs` - API contract and role model
