using System.Text.Json.Serialization;

namespace Server.Models;

public enum UserRole
{
    Operator,
    Engineer,
    Admin
}

public sealed class Well
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    [JsonPropertyName("field_name")] public string FieldName { get; init; } = "";
    [JsonPropertyName("well_type")] public string WellType { get; init; } = "";
    public string Status { get; init; } = "";
    [JsonPropertyName("injection_rate")] public decimal? InjectionRate { get; init; }
    [JsonPropertyName("oil_rate")] public decimal? OilRate { get; init; }
    [JsonPropertyName("water_rate")] public decimal? WaterRate { get; init; }
    [JsonPropertyName("water_cut")] public decimal? WaterCut { get; init; }
    public decimal? Pressure { get; init; }
    public decimal? Latitude { get; init; }
    public decimal? Longitude { get; init; }
    [JsonPropertyName("measurement_date")] public string MeasurementDate { get; init; } = "";
}

public sealed class Relationship
{
    public string Id { get; init; } = "";
    [JsonPropertyName("injector_id")] public string InjectorId { get; init; } = "";
    [JsonPropertyName("producer_id")] public string ProducerId { get; init; } = "";
}

public sealed class Measurement
{
    public string Id { get; init; } = "";
    [JsonPropertyName("well_id")] public string WellId { get; init; } = "";
    [JsonPropertyName("measurement_date")] public string MeasurementDate { get; init; } = "";
    [JsonPropertyName("injection_rate")] public decimal? InjectionRate { get; init; }
    [JsonPropertyName("oil_rate")] public decimal? OilRate { get; init; }
    [JsonPropertyName("water_cut")] public decimal? WaterCut { get; init; }
    public decimal? Pressure { get; init; }
}

public sealed class Thresholds
{
    [JsonPropertyName("water_cut")] public decimal WaterCut { get; init; } = 80;
    [JsonPropertyName("low_oil")] public decimal LowOil { get; init; } = 500;
    [JsonPropertyName("low_injection")] public decimal LowInjection { get; init; } = 700;
    [JsonPropertyName("high_pressure")] public decimal HighPressure { get; init; } = 3000;
    [JsonPropertyName("decline_pct")] public decimal DeclinePct { get; init; } = 15;
}

public sealed class WorkspaceResponse
{
    public IReadOnlyList<Well> Wells { get; init; } = [];
    public IReadOnlyList<Relationship> Relationships { get; init; } = [];
    public IReadOnlyList<Measurement> Measurements { get; init; } = [];
    public Thresholds Thresholds { get; init; } = new();
    public string? Role { get; init; }
    public IReadOnlyList<object> Audit { get; init; } = [];
}
