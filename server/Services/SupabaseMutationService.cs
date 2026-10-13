using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Server.Services;

public sealed class SupabaseMutationService(HttpClient http, IConfiguration configuration)
{
    private readonly string[] roles = ["operator", "engineer", "admin"];
    private sealed class RoleRow
    {
        [System.Text.Json.Serialization.JsonPropertyName("role")]
        public string Role { get; init; } = "";
    }

    // Validates the Supabase session and resolves the highest-priority role
    // before any table mutation is allowed to proceed.
    public async Task<string> RequireRoleAsync(string authorization, string[] allowedRoles, CancellationToken cancellationToken)
    {
        var (key, url) = Configuration();
        if (string.IsNullOrWhiteSpace(authorization))
            throw new UnauthorizedAccessException("Authentication is required.");
        using var userRequest = new HttpRequestMessage(HttpMethod.Get, $"{url}/auth/v1/user");
        userRequest.Headers.TryAddWithoutValidation("apikey", key);
        userRequest.Headers.TryAddWithoutValidation("Authorization", authorization);
        using var userResponse = await http.SendAsync(userRequest, cancellationToken);
        if (!userResponse.IsSuccessStatusCode)
            throw new UnauthorizedAccessException("The session is invalid or expired.");
        using var userDocument = JsonDocument.Parse(await userResponse.Content.ReadAsStringAsync(cancellationToken));
        var userId = userDocument.RootElement.GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(userId))
            throw new UnauthorizedAccessException("The authenticated user is unavailable.");
        http.DefaultRequestHeaders.Remove("apikey");
        http.DefaultRequestHeaders.Remove("Authorization");
        http.DefaultRequestHeaders.Add("apikey", key);
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", key);
        var roleRows = await GetAsync<List<RoleRow>>($"user_roles?select=role&user_id=eq.{Uri.EscapeDataString(userId)}", cancellationToken);
        var role = roles.FirstOrDefault(candidate => roleRows.Any(row => row.Role == candidate));
        if (role is null || !allowedRoles.Contains(role))
            throw new ForbiddenAccessException("Your role does not permit this operation.");
        return role;
    }

    public async Task CreateAsync(string table, JsonElement body, CancellationToken cancellationToken)
    {
        var (key, url) = Configuration();
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/{table}") { Content = JsonContent.Create(body) };
        request.Headers.TryAddWithoutValidation("apikey", key);
        request.Headers.TryAddWithoutValidation("Prefer", "return=minimal");
        using var response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task UpdateAsync(string table, string id, JsonElement body, CancellationToken cancellationToken)
    {
        var (key, url) = Configuration();
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/{table}?id=eq.{Uri.EscapeDataString(id)}") { Content = JsonContent.Create(body) };
        request.Headers.TryAddWithoutValidation("apikey", key);
        request.Headers.TryAddWithoutValidation("Prefer", "return=minimal");
        using var response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task DeleteAsync(string table, string id, CancellationToken cancellationToken)
    {
        var (key, url) = Configuration();
        using var request = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/{table}?id=eq.{Uri.EscapeDataString(id)}");
        request.Headers.TryAddWithoutValidation("apikey", key);
        using var response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private async Task<T> GetAsync<T>(string query, CancellationToken cancellationToken)
    {
        var (key, url) = Configuration();
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/{query}");
        request.Headers.TryAddWithoutValidation("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        using var response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>(cancellationToken: cancellationToken))!;
    }

    private (string Key, string Url) Configuration()
    {
        var url = configuration["Supabase:Url"];
        var key = configuration["Supabase:PublishableKey"];
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("Supabase configuration is missing.");
        return (key, url);
    }
}

public sealed class ForbiddenAccessException(string message) : Exception(message);
