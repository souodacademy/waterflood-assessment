using System.Net.Http.Headers;
using System.Text.Json;
using Server.Models;

namespace Server.Services;

public sealed class SupabaseWorkspaceService(HttpClient http, IConfiguration configuration)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // Reads use the publishable key for the public sample portfolio. A bearer
    // token is additionally validated when the React client requests an
    // authenticated workspace so the response can include the user's role.
    public async Task<WorkspaceResponse> GetAsync(string? authorization, CancellationToken cancellationToken)
    {
        var url = configuration["Supabase:Url"];
        var key = configuration["Supabase:PublishableKey"];
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("Supabase:Url and Supabase:PublishableKey must be configured.");

        http.DefaultRequestHeaders.Remove("apikey");
        http.DefaultRequestHeaders.Remove("Authorization");
        http.DefaultRequestHeaders.Add("apikey", key);
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", key);

        string? role = null;
        if (!string.IsNullOrWhiteSpace(authorization))
        {
            using var userRequest = new HttpRequestMessage(HttpMethod.Get, $"{url}/auth/v1/user");
            userRequest.Headers.TryAddWithoutValidation("apikey", key);
            userRequest.Headers.TryAddWithoutValidation("Authorization", authorization);
            using var userResponse = await http.SendAsync(userRequest, cancellationToken);
            userResponse.EnsureSuccessStatusCode();
            using var userDocument = JsonDocument.Parse(await userResponse.Content.ReadAsStringAsync(cancellationToken));
            var userId = userDocument.RootElement.GetProperty("id").GetString();
            if (string.IsNullOrWhiteSpace(userId))
                throw new InvalidOperationException("The authenticated user is unavailable.");
            var roles = await GetTableAsync<RoleRow>($"user_roles?select=role&user_id=eq.{Uri.EscapeDataString(userId)}", cancellationToken);
            role = roles.Any(r => r.Role == "admin") ? "admin" : roles.Any(r => r.Role == "engineer") ? "engineer" : roles.Any(r => r.Role == "operator") ? "operator" : null;
            if (role is null)
                throw new InvalidOperationException("The authenticated user has no assigned role.");
        }

        var wellsTask = GetTableAsync<Well>("wells?select=*&order=name", cancellationToken);
        var relationshipsTask = GetTableAsync<Relationship>("relationships?select=*", cancellationToken);
        var measurementsTask = GetTableAsync<Measurement>("measurements?select=*&order=measurement_date&limit=10000", cancellationToken);
        var thresholdsTask = GetSingleAsync<Thresholds>("thresholds?select=*&id=eq.1", cancellationToken);
        await Task.WhenAll(wellsTask, relationshipsTask, measurementsTask, thresholdsTask);

        return new WorkspaceResponse
        {
            Wells = wellsTask.Result,
            Relationships = relationshipsTask.Result,
            Measurements = measurementsTask.Result,
            Thresholds = thresholdsTask.Result ?? new Thresholds(),
            Role = role
        };
    }

    private sealed class RoleRow
    {
        [System.Text.Json.Serialization.JsonPropertyName("role")]
        public string Role { get; init; } = "";
    }

    private async Task<List<T>> GetTableAsync<T>(string query, CancellationToken cancellationToken)
    {
        using var response = await http.GetAsync($"{configuration["Supabase:Url"]}/rest/v1/{query}", cancellationToken);
        response.EnsureSuccessStatusCode();
        return await JsonSerializer.DeserializeAsync<List<T>>(await response.Content.ReadAsStreamAsync(cancellationToken), JsonOptions, cancellationToken) ?? [];
    }

    private async Task<T?> GetSingleAsync<T>(string query, CancellationToken cancellationToken)
    {
        var rows = await GetTableAsync<T>(query, cancellationToken);
        return rows.FirstOrDefault();
    }
}
