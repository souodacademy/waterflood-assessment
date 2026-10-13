using Server.Services;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
// The API is intentionally stateless. Supabase remains the identity provider
// and database; this process validates tokens and applies API-level roles.
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddHttpClient<SupabaseWorkspaceService>();
builder.Services.AddHttpClient<SupabaseMutationService>();
builder.Services.AddHttpClient<ThresholdNotificationService>();

var app = builder.Build();
app.UseCors();
// Liveness endpoint used by local development and deployment probes.
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
// Anonymous sample rows remain readable. If a bearer token is supplied, the
// workspace service validates it and includes the resolved role in the result.
app.MapGet("/api/workspace", async (HttpContext context, SupabaseWorkspaceService service, ThresholdNotificationService notifications, CancellationToken cancellationToken) =>
{
    try
    {
        var workspace = await service.GetAsync(context.Request.Headers.Authorization.ToString(), cancellationToken);
        await notifications.NotifyAsync(workspace, cancellationToken);
        return Results.Ok(workspace);
    }
    catch (Exception exception) when (exception is HttpRequestException or InvalidOperationException)
    {
        return Results.Problem("Unable to load field records. Configure Supabase and verify the API connection.");
    }
});
app.MapPost("/api/wells", async (HttpContext context, SupabaseMutationService service, JsonElement body, CancellationToken cancellationToken) =>
    await Mutate(context, service, body, ["admin"], () => service.CreateAsync("wells", body, cancellationToken)));
app.MapPatch("/api/wells/{id}", async (HttpContext context, SupabaseMutationService service, string id, JsonElement body, CancellationToken cancellationToken) =>
    await Mutate(context, service, body, ["operator", "engineer", "admin"], () => service.UpdateAsync("wells", id, body, cancellationToken)));
app.MapDelete("/api/wells/{id}", async (HttpContext context, SupabaseMutationService service, string id, CancellationToken cancellationToken) =>
    await Mutate(context, service, default, ["admin"], () => service.DeleteAsync("wells", id, cancellationToken)));
app.MapPost("/api/relationships", async (HttpContext context, SupabaseMutationService service, JsonElement body, CancellationToken cancellationToken) =>
    await Mutate(context, service, body, ["admin"], () => service.CreateAsync("relationships", body, cancellationToken)));
app.MapPatch("/api/relationships/{id}", async (HttpContext context, SupabaseMutationService service, string id, JsonElement body, CancellationToken cancellationToken) =>
    await Mutate(context, service, body, ["admin"], () => service.UpdateAsync("relationships", id, body, cancellationToken)));
app.MapDelete("/api/relationships/{id}", async (HttpContext context, SupabaseMutationService service, string id, CancellationToken cancellationToken) =>
    await Mutate(context, service, default, ["admin"], () => service.DeleteAsync("relationships", id, cancellationToken)));
app.MapPatch("/api/thresholds/{id:int}", async (HttpContext context, SupabaseMutationService service, int id, JsonElement body, CancellationToken cancellationToken) =>
    await Mutate(context, service, body, ["admin", "engineer"], () => service.UpdateAsync("thresholds", id.ToString(), body, cancellationToken)));
app.MapPost("/api/roles", async (HttpContext context, SupabaseMutationService service, JsonElement body, CancellationToken cancellationToken) =>
    await Mutate(context, service, body, ["admin"], () => service.CreateAsync("user_roles", body, cancellationToken)));
app.Run();

static async Task<IResult> Mutate(HttpContext context, SupabaseMutationService service, JsonElement body, string[] allowedRoles, Func<Task> operation)
{
    try
    {
        // Every mutation goes through one authorization gate so endpoint
        // implementations cannot accidentally skip role enforcement.
        await service.RequireRoleAsync(context.Request.Headers.Authorization.ToString(), allowedRoles, context.RequestAborted);
        await operation();
        return Results.NoContent();
    }
    catch (UnauthorizedAccessException exception) { return Results.Problem(exception.Message, statusCode: StatusCodes.Status401Unauthorized); }
    catch (ForbiddenAccessException exception) { return Results.Problem(exception.Message, statusCode: StatusCodes.Status403Forbidden); }
    catch (HttpRequestException) { return Results.Problem("The Supabase mutation failed.", statusCode: StatusCodes.Status502BadGateway); }
}
