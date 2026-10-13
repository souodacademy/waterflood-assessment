using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Server.Models;

namespace Server.Services;

public sealed class ThresholdNotificationService(
    HttpClient http,
    IConfiguration configuration,
    ILogger<ThresholdNotificationService> logger)
{
    private static readonly object Gate = new();
    private static string? lastFingerprint;

    public async Task NotifyAsync(WorkspaceResponse workspace, CancellationToken cancellationToken)
    {
        var apiKey = configuration["Notifications:ResendApiKey"];
        var from = configuration["Notifications:FromEmail"];
        var to = configuration["Notifications:RecipientEmail"];
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return;

        var alerts = workspace.Wells
            .SelectMany(well => GetAlerts(well, workspace.Thresholds)
                .Select(alert => $"{well.Name}: {alert}"))
            .OrderBy(alert => alert)
            .ToArray();
        var fingerprint = string.Join("|", alerts);
        lock (Gate)
        {
            if (fingerprint == lastFingerprint) return;
        }
        if (alerts.Length == 0) return;

        var body = string.Join("\n", alerts.Select(alert => $"• {alert}"));
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            from,
            to = new[] { to },
            subject = $"Waterflood threshold alert ({alerts.Length})",
            text = $"The following threshold conditions require attention:\n\n{body}",
        }), Encoding.UTF8, "application/json");

        using var response = await http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogError("Resend rejected threshold notification: {StatusCode} {Detail}", response.StatusCode, detail);
            return;
        }
        lock (Gate) lastFingerprint = fingerprint;
    }

    private static IEnumerable<string> GetAlerts(Well well, Thresholds thresholds)
    {
        if (well.WellType == "Producer")
        {
            if (well.WaterCut > thresholds.WaterCut) yield return $"high water cut ({well.WaterCut}% > {thresholds.WaterCut}%)";
            if (well.OilRate < thresholds.LowOil) yield return $"low oil production ({well.OilRate} < {thresholds.LowOil} bbl/d)";
        }
        else
        {
            if (well.InjectionRate < thresholds.LowInjection) yield return $"low injection rate ({well.InjectionRate} < {thresholds.LowInjection} bbl/d)";
            if (well.Pressure > thresholds.HighPressure) yield return $"high injection pressure ({well.Pressure} > {thresholds.HighPressure} psi)";
        }
        if (well.Status != "Active") yield return $"well status is {well.Status}";
    }
}
