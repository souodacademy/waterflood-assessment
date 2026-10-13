import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  Droplets,
  Filter,
  GitBranch,
  LayoutDashboard,
  LocateFixed,
  Map,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Waves,
  X,
  Pencil,
  Trash2,
  LogOut,
  Clock3,
  Layers,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/auth";
import { getWorkspace } from "@/lib/waterflood.functions";
import { dotnetRequest } from "@/lib/dotnet-api";
import { getDemoRole, signInDemo, signOutDemo } from "@/lib/demo-auth";
import {
  emptyFilters,
  filterWells,
  metrics,
  number,
  wellAlerts,
  type Filters,
  type Well,
  type WorkspaceData,
} from "@/lib/waterflood";
import fieldPhoto from "@/assets/oilfield-aerial.jpg";

const FieldMap = lazy(() => import("./field-map"));
const Connectivity = lazy(() =>
  import("./connectivity").then((module) => ({ default: module.Connectivity })),
);
const WellTable = lazy(() => import("./well-table").then((module) => ({ default: module.WellTable })));
const FieldProductionChart = lazy(() =>
  import("./charts").then((module) => ({ default: module.FieldProductionChart })),
);
const PerformanceChart = lazy(() =>
  import("./charts").then((module) => ({ default: module.PerformanceChart })),
);
const StatusChart = lazy(() => import("./charts").then((module) => ({ default: module.StatusChart })));
const WellRateChart = lazy(() =>
  import("./charts").then((module) => ({ default: module.WellRateChart })),
);
export const workspaceQuery = queryOptions({
  queryKey: ["waterflood"],
  queryFn: () => getWorkspace({ data: { authenticated: true, demoRole: getDemoRole() } }),
  staleTime: 30000,
  refetchInterval: 30000,
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: true,
});
type View = "Overview" | "Map" | "Analytics" | "Connectivity";
const fieldsInfo: Record<string, { code: string; description: string }> = {
  "North Field": { code: "NF-01", description: "Northern production cluster" },
  "Central Field": { code: "CF-02", description: "Central injection pattern" },
  "South Field": { code: "SF-03", description: "Southern production cluster" },
  "West Field": { code: "WF-04", description: "Western injection pattern" },
};

function MetricCards({ wells }: { wells: Well[] }) {
  const m = metrics(wells);
  return (
    <div className="metrics-grid">
      {[
        {
          label: "Total water injection",
          value: m.injection,
          unit: "bbl/day",
          icon: ArrowDownToLine,
          className: "injection",
          note: `${m.injectors} active injector wells`,
        },
        {
          label: "Total oil production",
          value: m.oil,
          unit: "bbl/day",
          icon: Droplets,
          className: "oil",
          note: `${m.producers} active producer wells`,
        },
        {
          label: "Produced water",
          value: m.water,
          unit: "bbl/day",
          icon: Waves,
          className: "water",
          note: `${wells.filter((w) => w.well_type === "Producer").length} producer wells reporting`,
        },
        {
          label: "Average water cut",
          value: m.waterCut,
          unit: "%",
          icon: Activity,
          className: "cut",
          note: "Arithmetic mean · reporting producers",
        },
      ].map((item) => (
        <div className={`metric-card ${item.className}`} key={item.label}>
          <div className="metric-top">
            <span>{item.label}</span>
            <span className="metric-icon">
              <item.icon size={15} />
            </span>
          </div>
          <div className="metric-value">
            {number(item.value, item.className === "cut" ? 1 : 0)}
            <span className="metric-unit">{item.unit}</span>
          </div>
          <div className="metric-bottom">
            <span>{item.note}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Workspace({
  fieldId,
  wellId,
  section = "fields",
}: {
  fieldId?: string;
  wellId?: string;
  section?: "fields" | "activity" | "settings";
}) {
  const { data } = useSuspenseQuery(workspaceQuery);
  const queryClient = useQueryClient(),
    router = useRouter();
  const loadWorkspace = useServerFn(getWorkspace);
  const [view, setView] = useState<View>("Overview");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false),
    [alertsOpen, setAlertsOpen] = useState(false),
    [authOpen, setAuthOpen] = useState(false),
    [helpOpen, setHelpOpen] = useState(false);
  const [editWell, setEditWell] = useState<Well | null | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    loadWorkspace({ data: { authenticated: true, demoRole: getDemoRole() } })
      .then((result) => queryClient.setQueryData(["waterflood"], result))
      .catch(() => {});
  }, [loadWorkspace, queryClient, data.role]);
  const fieldName = fieldId
    ? data.wells.find((w) => w.field_name.toLowerCase().replace(" field", "") === fieldId)
        ?.field_name
    : undefined;
  const selected = wellId ? data.wells.find((w) => w.id === wellId) : undefined;
  const fieldWells = useMemo(
    () => data.wells.filter((w) => !fieldId || w.field_name === fieldName),
    [data.wells, fieldId, fieldName],
  );
  const wells = useMemo(
    () => filterWells(fieldWells, filters, data.thresholds, search, data.measurements),
    [fieldWells, filters, data.thresholds, search, data.measurements],
  );
  const alerts = useMemo(
    () =>
      wells
        .flatMap((w) =>
          wellAlerts(w, data.thresholds, data.measurements).map((a) => ({ ...a, well: w })),
        )
        .sort((a, b) => (a.severity === "critical" ? -1 : b.severity === "critical" ? 1 : 0)),
    [wells, data],
  );
  const selectWell = useCallback(
    (well: Well) => router.navigate({ to: "/wells/$wellId", params: { wellId: well.id } }),
    [router],
  );
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["waterflood"] });
    await router.invalidate();
  };
  const fieldNames = [...new Set(data.wells.map((w) => w.field_name))].sort(
    (a, b) =>
      ["North Field", "Central Field", "South Field", "West Field"].indexOf(a) -
      ["North Field", "Central Field", "South Field", "West Field"].indexOf(b),
  );
  const filterCount = Object.entries(filters).filter(
    ([key, value]) =>
      !["metric", "comparison"].includes(key) && value !== emptyFilters[key as keyof Filters],
  ).length;
  const exportData = async () => {
    const XLSX = await import("xlsx");
    const rows = wells.map((w) => ({
      "Well name": w.name,
      "Well type": w.well_type,
      Field: w.field_name,
      Latitude: w.latitude,
      Longitude: w.longitude,
      "Injection (bbl/day)": w.injection_rate,
      "Oil (bbl/day)": w.oil_rate,
      "Water (bbl/day)": w.water_rate,
      "Water cut (%)": w.water_cut,
      "Pressure (psi)": w.pressure,
      Status: w.status,
      "Measurement date": w.measurement_date,
      Alerts: wellAlerts(w, data.thresholds, data.measurements)
        .map((a) => a.label)
        .join("; "),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Waterflood wells");
    XLSX.writeFile(workbook, "waterflood-wells.xlsx");
    toast.success(`${wells.length} wells exported`);
  };
  const toolbar = (
    <div className="section-toolbar">
      <div className="view-tabs" role="tablist" aria-label="Workspace view">
        {(
          [
            { name: "Overview", icon: LayoutDashboard },
            { name: "Map", icon: Map },
            { name: "Analytics", icon: Activity },
            { name: "Connectivity", icon: GitBranch },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.name}
            variant="ghost"
            role="tab"
            aria-selected={view === tab.name}
            className={view === tab.name ? "active" : ""}
            onClick={() => setView(tab.name)}
          >
            <tab.icon size={14} />
            {tab.name}
          </Button>
        ))}
      </div>
      <div className="toolbar-tools">
        <div className="search-box">
          <Search size={13} />
          <input
            aria-label="Search wells"
            placeholder="Search wells..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal size={13} />
          Filters{filterCount > 0 && <span className="alert-count">{filterCount}</span>}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAlertsOpen(true)}>
          <Bell size={13} />
          Alerts<span className="alert-count">{alerts.length}</span>
        </Button>
      </div>
    </div>
  );
  const chartPanels = (
    <div className="bottom-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2 className="panel-title">Injection vs. oil production</h2>
            <p className="panel-subtitle">Recorded measurements · bbl/day</p>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-dot injection" />
              Injection
            </span>
            <span>
              <i className="legend-dot oil" />
              Oil
            </span>
          </div>
        </div>
        <PerformanceChart wells={wells} measurements={data.measurements} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2 className="panel-title">Field performance</h2>
            <p className="panel-subtitle">Injection & oil production by field · bbl/day</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            title="View detailed analytics"
            onClick={() => setView("Analytics")}
          >
            <ArrowUpRight size={14} />
          </Button>
        </div>
        <FieldProductionChart wells={wells} />
      </section>
    </div>
  );
  const mapPanel = (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title">
            <Map size={14} />
            {fieldName ?? "Field operations map"}
          </h2>
          <p className="panel-subtitle">
            {wells.length} wells · {new Set(wells.map((w) => w.field_name)).size} fields
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="muted-label">Oman</span>
          <Button variant="ghost" size="icon" title="Expand map" onClick={() => setView("Map")}>
            <ArrowUpRight size={13} />
          </Button>
        </div>
      </div>
      <div className="map-wrapper">
        <div className="map-floating">
          <Layers size={12} />
          {fieldName ?? "All fields"}
          <span className="text-muted-foreground">·</span>
          {wells.length} wells
        </div>
        {mounted ? (
          <Suspense fallback={<div className="empty-state">Loading geographic map…</div>}>
            <FieldMap
              wells={wells}
              relationships={data.relationships}
              thresholds={data.thresholds}
              measurements={data.measurements}
              onSelect={selectWell}
              selectedId={wellId}
            />
          </Suspense>
        ) : (
          <div className="empty-state">Loading geographic map…</div>
        )}
      </div>
      <div className="map-legend">
        <div className="legend-items">
          <span>
            <i className="legend-dot injection" />
            Injector
          </span>
          <span>
            <i className="legend-dot oil" />
            Producer
          </span>
          <span>
            <i className="legend-dot critical" />
            Requires attention
          </span>
        </div>
        <span>WGS 84 · Geographic locations</span>
      </div>
    </section>
  );
  const fieldCards = (
    <aside className="field-list">
      <div className="field-list-heading">
        <h2>Field portfolio</h2>
        <span>{fieldNames.length} fields</span>
      </div>
      {fieldNames.map((field, i) => {
        const items = data.wells.filter((w) => w.field_name === field),
          m = metrics(items),
          attention = items.filter(
            (w) => wellAlerts(w, data.thresholds, data.measurements).length > 0,
          ).length;
        const critical = items.some((w) =>
          wellAlerts(w, data.thresholds, data.measurements).some((a) => a.severity === "critical"),
        );
        return (
          <Link
            to="/fields/$fieldId"
            params={{ fieldId: field.toLowerCase().replace(" field", "") }}
            className="field-item"
            key={field}
          >
            <div className="field-item-head">
              <span className="field-name">
                <MapPin size={13} />
                {field}
              </span>
              <ChevronRight size={13} className="text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between">
              <span className="field-code">
                {fieldsInfo[field]?.code ?? `F-${i + 1}`} · {items.length} wells
              </span>
              <span
                className={`field-status ${critical ? "critical" : attention ? "warning" : ""}`}
              >
                <span
                  className={`legend-dot ${critical ? "critical" : attention ? "warning" : ""}`}
                />
                {attention ? `${attention} need attention` : "Healthy"}
              </span>
            </div>
            <div className="field-item-stats">
              <span>
                Oil <strong>{number(m.oil)}</strong> <small>bbl/d</small>
              </span>
              <span>
                Injection <strong>{number(m.injection)}</strong>
              </span>
            </div>
          </Link>
        );
      })}
      <div className="field-summary">
        <ShieldCheck size={12} />{" "}
        {data.role ? "Connected to Cloud" : "Sample portfolio · 01 Aug 2026"}
      </div>
    </aside>
  );
  const title =
    section === "activity"
      ? "Activity log"
      : section === "settings"
        ? "Performance settings"
        : (selected?.name ?? fieldName ?? "Field overview");
  return (
    <>
      <header className="app-header">
        <div className="header-spacer" aria-hidden="true" />
        <nav className="top-nav">
          <Link to="/" activeOptions={{ exact: true }}>
            <LayoutDashboard size={14} />
            Workspace
          </Link>
          <Link to="/activity">
            <Clock3 size={14} />
            Activity
          </Link>
          <Link to="/settings">
            <Settings2 size={14} />
            Settings
          </Link>
        </nav>
        <div className="header-tools">
          <span className="live-pill">
            <span className="live-dot" />
            {data.role ? "Cloud connected" : "Sample workspace"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHelpOpen(true)}
            title="About this workspace"
          >
            <CircleHelp size={17} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAlertsOpen(true)}
            title="Open alerts"
          >
            <Bell size={17} />
          </Button>
          {data.role ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                signOutDemo();
                queryClient.setQueryData<WorkspaceData>(["waterflood"], (current) =>
                  current ? { ...current, role: null, audit: [] } : current,
                );
                toast.success("Signed out");
                window.location.reload();
              }}
              title="Sign out"
            >
              <span className="avatar">
                {data.role === "admin" ? "AD" : data.role === "engineer" ? "PE" : "OP"}
              </span>
              <LogOut size={13} />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
              Sign in
              <ArrowUpRight size={12} />
            </Button>
          )}
        </div>
      </header>
      <main className="workspace">
        <Suspense fallback={<div className="empty-state">Loading workspace view…</div>}>
        <div className="breadcrumbs">
          <Link to="/">Workspace</Link>
          <ChevronRight size={10} />
          {selected ? (
            <>
              <Link
                to="/fields/$fieldId"
                params={{ fieldId: selected.field_name.toLowerCase().replace(" field", "") }}
              >
                {selected.field_name}
              </Link>
              <ChevronRight size={10} />
              <span>{selected.name}</span>
            </>
          ) : (
            <span>{fieldName ?? (section === "fields" ? "All fields" : title)}</span>
          )}
        </div>
        <div className="page-heading">
          <div>
            <h1>{title}</h1>
            <p>
              {section === "activity"
                ? "Operational changes and record history"
                : section === "settings"
                  ? "Engineering thresholds & access management"
                  : selected
                    ? `${selected.field_name} · ${selected.well_type} · Operational measurements`
                    : fieldName
                      ? `${fieldsInfo[fieldName]?.description ?? "Field operations"} · Injection & production performance`
                      : "A connected view of your waterflood operations."}
            </p>
          </div>
          <div className="heading-actions">
            {section === "fields" && (
              <>
                <div className="date-select">
                  <CalendarDays size={13} />
                  {filters.from || filters.to
                    ? `${filters.from || "Start"} – ${filters.to || "Latest"}`
                    : "01 Aug 2026"}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    title="Filter measurement dates"
                    onClick={() => setFilterOpen(true)}
                  >
                    <ChevronDown size={12} />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download size={13} />
                  Export
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!data.role) setAuthOpen(true);
                    else if (data.role !== "admin")
                      toast.info("Only administrators can create wells.");
                    else setEditWell(null);
                  }}
                >
                  <Plus size={14} />
                  Add well
                </Button>
              </>
            )}
          </div>
        </div>
        {section === "activity" ? (
          <ActivityView data={data} onSignIn={() => setAuthOpen(true)} />
        ) : section === "settings" ? (
          <SettingsView data={data} refresh={refresh} onSignIn={() => setAuthOpen(true)} />
        ) : wellId && !selected ? (
          <div className="empty-state">This well is unavailable.</div>
        ) : fieldId && !fieldName ? (
          <div className="empty-state">This field is unavailable.</div>
        ) : selected ? (
          <WellDetail
            well={selected}
            data={data}
            mounted={mounted}
            onSelect={selectWell}
            onEdit={() => (data.role ? setEditWell(selected) : setAuthOpen(true))}
            refresh={refresh}
          />
        ) : (
          <>
            <section className="field-banner">
              <img
                src={fieldPhoto}
                alt="Illustrative aerial view of oil well pads and access roads in Oman"
                width={1600}
                height={640}
              />
              <div className="banner-content">
                <div className="banner-eyebrow">
                  <span className="live-dot" />
                  Waterflood operations · Oman
                </div>
                <h2>{fieldName ?? "Every field. One perspective."}</h2>
                <div className="banner-meta">
                  <span>
                    <MapPin size={12} />
                    {fieldName ? "1 field" : `${fieldNames.length} fields`}
                  </span>
                  <span>
                    <Layers size={12} />
                    {fieldWells.length} wells
                  </span>
                  <span>
                    <GitBranch size={12} />
                    {
                      data.relationships.filter((r) =>
                        fieldWells.some((w) => w.id === r.injector_id),
                      ).length
                    }{" "}
                    injection–production connections
                  </span>
                </div>
              </div>
              <div className="banner-right">
                <LocateFixed size={12} /> Illustrative field imagery
              </div>
            </section>
            <MetricCards wells={wells} />
            {toolbar}
            {filterCount > 0 && (
              <div className="active-filters">
                {filters.field !== "All fields" && (
                  <span className="active-filter">{filters.field}</span>
                )}
                {filters.type !== "All types" && (
                  <span className="active-filter">{filters.type}</span>
                )}
                {filters.status !== "All statuses" && (
                  <span className="active-filter">{filters.status}</span>
                )}
                {filters.attention && <span className="active-filter">Requires attention</span>}
                {filters.value && (
                  <span className="active-filter">
                    {filters.metric.replaceAll("_", " ")} {filters.comparison} {filters.value}
                  </span>
                )}
                {(filters.from || filters.to) && (
                  <span className="active-filter">
                    {filters.from || "Start"} – {filters.to || "Latest"}
                  </span>
                )}
                <Button size="sm" variant="ghost" onClick={() => setFilters(emptyFilters)}>
                  <X size={12} />
                  Clear all
                </Button>
              </div>
            )}
            {view === "Overview" && (
              <>
                <div className="operations-grid">
                  {mapPanel}
                  {fieldCards}
                </div>
                {chartPanels}
                <WellTable wells={wells} data={data} />
              </>
            )}
            {view === "Map" && (
              <>
                <div className="operations-grid">
                  {mapPanel}
                  {fieldCards}
                </div>
                <WellTable wells={wells} data={data} />
              </>
            )}
            {view === "Analytics" && (
              <>
                {chartPanels}
                <div className="bottom-grid">
                  <section className="panel">
                    <div className="panel-heading">
                      <h2 className="panel-title">Injection rate by well</h2>
                      <span className="muted-label">bbl/day</span>
                    </div>
                    <WellRateChart wells={wells} kind="Injector" />
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2 className="panel-title">Oil production by well</h2>
                      <span className="muted-label">bbl/day</span>
                    </div>
                    <WellRateChart wells={wells} kind="Producer" />
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2 className="panel-title">Water cut trend</h2>
                      <span className="muted-label">%</span>
                    </div>
                    <PerformanceChart
                      wells={wells}
                      measurements={data.measurements}
                      metric="waterCut"
                    />
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2 className="panel-title">Injection pressure trend</h2>
                      <span className="muted-label">psi</span>
                    </div>
                    <PerformanceChart
                      wells={wells}
                      measurements={data.measurements}
                      metric="pressure"
                    />
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2 className="panel-title">Well distribution by status</h2>
                    </div>
                    <StatusChart wells={wells} />
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2 className="panel-title">Injection efficiency</h2>
                    </div>
                    <div className="detail-section">
                      <div className="metric-value">
                        {metrics(wells).injection
                          ? number((metrics(wells).oil / metrics(wells).injection) * 100, 1)
                          : "—"}
                        <span className="metric-unit">%</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-3">
                        Oil production / water injection · reported rates
                      </p>
                      <div className="detail-values mt-8">
                        <div>
                          <dt>Active injectors</dt>
                          <dd>{metrics(wells).injectors}</dd>
                        </div>
                        <div>
                          <dt>Active producers</dt>
                          <dd>{metrics(wells).producers}</dd>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
                <WellTable wells={wells} data={data} />
              </>
            )}
            {view === "Connectivity" && (
              <>
                <Connectivity wells={wells} data={data} />
                <div className="mt-5">
                  <WellTable wells={wells} data={data} />
                </div>
              </>
            )}
          </>
        )}
        <footer className="page-footer">
          <span>Waterflood performance management</span>
          <span>
            {data.role
              ? `${data.role === "engineer" ? "Petroleum engineer" : data.role === "admin" ? "Administrator" : "Operator"} access`
              : "Read-only sample data"}{" "}
            · Units: bbl/day, psi, km
          </span>
        </footer>
        </Suspense>
      </main>
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent className="p-0 w-full sm:max-w-[430px]">
          <SheetHeader className="drawer-header">
            <SheetTitle className="flex items-center gap-2">
              <SlidersHorizontal size={18} />
              Workspace filters
            </SheetTitle>
            <SheetDescription>{wells.length} matching wells</SheetDescription>
          </SheetHeader>
          <div className="drawer-content">
            <div className="filter-grid">
              <FilterSelect
                label="Field"
                value={filters.field}
                values={["All fields", ...fieldNames]}
                onChange={(v) => setFilters({ ...filters, field: v })}
              />
              <FilterSelect
                label="Well type"
                value={filters.type}
                values={["All types", "Injector", "Producer"]}
                onChange={(v) => setFilters({ ...filters, type: v })}
              />
              <FilterSelect
                label="Well status"
                value={filters.status}
                values={["All statuses", "Active", "Shut-in", "Maintenance"]}
                onChange={(v) => setFilters({ ...filters, status: v })}
              />
              <div className="form-field">
                <label>Health</label>
                <label className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    className="!w-4 !h-4"
                    checked={filters.attention}
                    onChange={(e) => setFilters({ ...filters, attention: e.target.checked })}
                  />
                  Requires attention
                </label>
              </div>
            </div>
            <h3 className="form-section-title">Performance condition</h3>
            <div className="filter-grid">
              <div className="form-field">
                <label htmlFor="filter-metric">Measurement</label>
                <select
                  id="filter-metric"
                  value={filters.metric}
                  onChange={(e) =>
                    setFilters({ ...filters, metric: e.target.value as Filters["metric"] })
                  }
                >
                  <option value="injection_rate">Injection rate (bbl/d)</option>
                  <option value="oil_rate">Oil production (bbl/d)</option>
                  <option value="water_cut">Water cut (%)</option>
                  <option value="pressure">Injection pressure (psi)</option>
                </select>
              </div>
              <FilterSelect
                label="Comparison"
                value={filters.comparison}
                values={["above", "below"]}
                onChange={(v) => setFilters({ ...filters, comparison: v as "above" | "below" })}
              />
              <div className="form-field">
                <label htmlFor="filter-value">Threshold value</label>
                <input
                  id="filter-value"
                  type="number"
                  min="0"
                  placeholder="Any value"
                  value={filters.value}
                  onChange={(e) => setFilters({ ...filters, value: e.target.value })}
                />
              </div>
            </div>
            <h3 className="form-section-title">Measurement date</h3>
            <div className="filter-grid">
              <div className="form-field">
                <label htmlFor="filter-from">From</label>
                <input
                  id="filter-from"
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="filter-to">To</label>
                <input
                  id="filter-to"
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                />
              </div>
            </div>
            <div className="drawer-actions">
              <Button variant="ghost" onClick={() => setFilters(emptyFilters)}>
                Reset filters
              </Button>
              <Button onClick={() => setFilterOpen(false)}>Show {wells.length} wells</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
        <SheetContent className="p-0 w-full sm:max-w-[430px]">
          <SheetHeader className="drawer-header">
            <SheetTitle className="flex items-center gap-2">
              <Bell size={18} />
              Operational alerts<span className="alert-count">{alerts.length}</span>
            </SheetTitle>
            <SheetDescription>
              {new Set(alerts.map((a) => a.well.id)).size} wells require attention in this selection
            </SheetDescription>
          </SheetHeader>
          <div className="drawer-content">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">Sorted by severity</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({ ...filters, attention: true });
                  setAlertsOpen(false);
                }}
              >
                <Filter size={12} />
                Isolate wells
              </Button>
            </div>
            {alerts.map((a, i) => (
              <Link
                to="/wells/$wellId"
                params={{ wellId: a.well.id }}
                onClick={() => setAlertsOpen(false)}
                className="alert-item"
                key={`${a.well.id}-${i}`}
              >
                <div className="alert-item-title">
                  <span className="flex items-center gap-2">
                    <TriangleAlert
                      size={14}
                      className={a.severity === "critical" ? "text-destructive" : "text-warning"}
                    />
                    {a.well.name}
                  </span>
                  <span className={`alert-tag ${a.severity === "warning" ? "warning" : ""}`}>
                    {a.severity}
                  </span>
                </div>
                <div className="alert-item-detail">
                  {a.label} · {a.detail}
                </div>
                <div className="alert-item-meta">
                  {a.well.field_name} · {a.well.measurement_date}
                  <ArrowUpRight className="inline ml-2" size={11} />
                </div>
              </Link>
            ))}
            {!alerts.length && (
              <div className="empty-state">
                <ShieldCheck size={30} className="mx-auto mb-3 text-success" />
                All selected wells are within thresholds.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <WellEditor
        well={editWell}
        data={data}
        onClose={() => setEditWell(undefined)}
        refresh={refresh}
      />
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About this workspace</DialogTitle>
            <DialogDescription>Waterflood performance management</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The initial portfolio uses the ten wells and six relationships from your assessment
            document. The field photograph is illustrative; map positions use the supplied
            coordinates. Historical trends appear as measurements are recorded.
          </p>
          <p className="text-sm text-muted-foreground">
            Sign in to update operational measurements. New accounts are operators; an administrator
            grants engineering or administrative access.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setHelpOpen(false);
              window.print();
            }}
          >
            <FileText />
            Print / save as PDF
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="form-field">
      <label htmlFor={`select-${label}`}>{label}</label>
      <select id={`select-${label}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </div>
  );
}

function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")),
      password = String(form.get("password"));
    try {
      if (mode === "reset") {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) throw result.error;
        setMessage("Check your email for a password reset link.");
      } else if (mode === "signup") {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (result.error) throw result.error;
        if (result.data.session) onOpenChange(false);
        else
          setMessage(
            "Check your email to confirm your account. New accounts receive operator access.",
          );
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) {
          const demoRole = signInDemo(email, password);
          if (!demoRole) throw result.error;
          window.location.reload();
          return;
        }
        onOpenChange(false);
        toast.success("Signed in successfully");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[410px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "signup"
              ? "Create your account"
              : mode === "reset"
                ? "Reset your password"
                : "Welcome"}
          </DialogTitle>
          <DialogDescription>
            {mode === "reset"
              ? "We’ll send you a secure reset link."
              : "Secure access to your field operations."}
          </DialogDescription>
        </DialogHeader>
        {mode !== "reset" && (
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                setBusy(false);
                if (result.error) setError(result.error.message);
                else if (!result.redirected) onOpenChange(false);
              }}
            >
              <span className="font-semibold">G</span>Continue with Google
            </Button>
            <div className="auth-divider">or continue with email</div>
          </>
        )}
        <form onSubmit={submit} className="auth-form">
          <div className="form-field">
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
            />
          </div>
          {mode !== "reset" && (
            <div className="form-field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="At least 8 characters"
              />
            </div>
          )}
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}
          <Button type="submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}
          </Button>
        </form>
        <div className="flex justify-between">
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError("");
              setMessage("");
            }}
          >
            {mode === "signup" ? "Already have an account?" : "Create an account"}
          </Button>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setMode(mode === "reset" ? "signin" : "reset");
              setError("");
              setMessage("");
            }}
          >
            {mode === "reset" ? "Back to sign in" : "Forgot password?"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WellDetail({
  well,
  data,
  mounted,
  onSelect,
  onEdit,
  refresh,
}: {
  well: Well;
  data: WorkspaceData;
  mounted: boolean;
  onSelect: (w: Well) => void;
  onEdit: () => void;
  refresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState("Performance"),
    [deleteOpen, setDeleteOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  const relatedIds = data.relationships
    .filter((r) => r.injector_id === well.id || r.producer_id === well.id)
    .flatMap((r) => [r.injector_id, r.producer_id]);
  const associated = data.wells.filter((w) => relatedIds.includes(w.id) && w.id !== well.id);
  const pattern = data.wells.filter((w) => relatedIds.includes(w.id) || w.id === well.id);
  const alerts = wellAlerts(well, data.thresholds, data.measurements);
  const measurements = data.measurements
    .filter((m) => m.well_id === well.id)
    .sort((a, b) => b.measurement_date.localeCompare(a.measurement_date));
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          <span className={`status-pill ${well.status !== "Active" ? "inactive" : ""}`}>
            {well.status}
          </span>
          <span className="status-pill">{well.well_type}</span>
          {alerts.map((a) => (
            <span
              key={a.label}
              className={`alert-tag ${a.severity === "warning" ? "warning" : ""}`}
            >
              <TriangleAlert size={11} />
              {a.label}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil />
            Update measurement
          </Button>
          {data.role === "admin" && (
            <Button
              variant="ghost"
              size="icon"
              title="Delete well"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="text-destructive" />
            </Button>
          )}
        </div>
      </div>
      <MetricCards wells={[well]} />
      <div className="section-toolbar">
        <div className="view-tabs">
          {["Performance", "Relationships", "Measurements"].map((t) => (
            <Button
              variant="ghost"
              className={t === tab ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </Button>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">
          Latest measurement · {well.measurement_date}
        </span>
      </div>
      {tab === "Performance" && (
        <div className="detail-layout">
          <div>
            <section className="panel mb-5">
              <div className="panel-heading">
                <h2 className="panel-title">
                  {well.well_type === "Injector"
                    ? "Injection & associated production"
                    : "Production performance"}
                </h2>
              </div>
              <PerformanceChart
                wells={well.well_type === "Injector" ? pattern : [well]}
                measurements={data.measurements}
              />
            </section>
            <div className="bottom-grid">
              <section className="panel">
                <div className="panel-heading">
                  <h2 className="panel-title">Water cut trend</h2>
                </div>
                <PerformanceChart
                  wells={well.well_type === "Injector" ? associated : [well]}
                  measurements={data.measurements}
                  metric="waterCut"
                />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2 className="panel-title">Injection pressure trend</h2>
                </div>
                <PerformanceChart
                  wells={
                    well.well_type === "Injector"
                      ? [well]
                      : associated.filter((w) => w.well_type === "Injector")
                  }
                  measurements={data.measurements}
                  metric="pressure"
                />
              </section>
            </div>
          </div>
          <aside>
            <section className="panel mb-5">
              <div className="panel-heading">
                <h2 className="panel-title">Well information</h2>
              </div>
              <div className="detail-section">
                <dl className="detail-values">
                  <div>
                    <dt>Field</dt>
                    <dd>
                      <Link
                        to="/fields/$fieldId"
                        params={{ fieldId: well.field_name.toLowerCase().replace(" field", "") }}
                      >
                        {well.field_name}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{well.well_type}</dd>
                  </div>
                  <div>
                    <dt>Latitude</dt>
                    <dd>{well.latitude.toFixed(5)}°</dd>
                  </div>
                  <div>
                    <dt>Longitude</dt>
                    <dd>{well.longitude.toFixed(5)}°</dd>
                  </div>
                  <div>
                    <dt>Pressure</dt>
                    <dd>{number(well.pressure)} psi</dd>
                  </div>
                  <div>
                    <dt>Water cut</dt>
                    <dd>{number(well.water_cut)}%</dd>
                  </div>
                </dl>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2 className="panel-title">Well location</h2>
              </div>
              <div className="map-wrapper !h-[240px]">
                {mounted && (
                  <Suspense fallback={<div className="empty-state">Loading map…</div>}>
                    <FieldMap
                      wells={pattern}
                      relationships={data.relationships}
                      thresholds={data.thresholds}
                      measurements={data.measurements}
                      onSelect={onSelect}
                      selectedId={well.id}
                    />
                  </Suspense>
                )}
              </div>
            </section>
          </aside>
        </div>
      )}
      {tab === "Relationships" && (
        <>
          <Connectivity wells={pattern} data={data} />
          {data.role === "admin" && well.well_type === "Injector" && (
            <RelationshipEditor well={well} data={data} refresh={refresh} />
          )}
          <div className="mt-5">
            <WellTable wells={associated} data={data} title="Associated wells" />
          </div>
        </>
      )}
      {tab === "Measurements" && (
        <section className="panel">
          <div className="panel-heading">
            <h2 className="panel-title">Measurement history</h2>
            <span className="muted-label">{measurements.length} records</span>
          </div>
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Injection bbl/d</th>
                  <th>Oil bbl/d</th>
                  <th>Water bbl/d</th>
                  <th>Water cut %</th>
                  <th>Pressure psi</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m) => (
                  <tr key={m.id}>
                    <td>{m.measurement_date}</td>
                    <td>{number(m.injection_rate)}</td>
                    <td>{number(m.oil_rate)}</td>
                    <td>{number(m.water_rate)}</td>
                    <td>{number(m.water_cut)}</td>
                    <td>{number(m.pressure)}</td>
                    <td>{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {well.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes this well, its measurement history and associated
              connections. The audit entry is retained.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await dotnetRequest(`/api/wells/${well.id}`, { method: "DELETE" });
                  toast.success("Well deleted");
                  await refresh();
                  router.navigate({ to: "/" });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to delete well.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Delete well"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WellEditor({
  well,
  data,
  onClose,
  refresh,
}: {
  well: Well | null | undefined;
  data: WorkspaceData;
  onClose: () => void;
  refresh: () => Promise<void>;
}) {
  const [type, setType] = useState("Injector"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setType(well?.well_type ?? "Injector");
    setError("");
  }, [well]);
  const admin = data.role === "admin",
    engineering = admin || data.role === "engineer";
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget),
      n = (key: string) => (f.get(key) == null || f.get(key) === "" ? null : Number(f.get(key)));
    try {
      const operational = {
        status: String(f.get("status")),
        injection_rate: type === "Injector" ? n("injection_rate") : null,
        measurement_date: String(f.get("measurement_date")),
      };
      const engineeringValues = {
        latitude: n("latitude") ?? well?.latitude ?? 0,
        longitude: n("longitude") ?? well?.longitude ?? 0,
        oil_rate: type === "Producer" ? n("oil_rate") : null,
        water_rate: type === "Producer" ? n("water_rate") : null,
        water_cut: type === "Producer" ? n("water_cut") : null,
        pressure: type === "Injector" ? n("pressure") : null,
      };
      const identity = {
        name: String(f.get("name") ?? well?.name),
        field_name: String(f.get("field_name") ?? well?.field_name),
        well_type: type,
      };
      const values = {
        ...operational,
        ...(engineering ? engineeringValues : {}),
        ...(admin ? identity : {}),
      };
      await dotnetRequest(well ? `/api/wells/${well.id}` : "/api/wells", {
        method: well ? "PATCH" : "POST",
        body: JSON.stringify(values),
      });
      await refresh();
      toast.success(well ? "Measurement saved" : "Well created");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this record.");
    } finally {
      setBusy(false);
    }
  };
  const input = (
    label: string,
    name: string,
    value: number | string | null | undefined,
    options: {
      disabled?: boolean;
      min?: number;
      max?: number;
      type?: string;
      required?: boolean;
    } = {},
  ) => (
    <div className="form-field">
      <label htmlFor={`well-${name}`}>{label}</label>
      <input
        id={`well-${name}`}
        name={name}
        type={options.type ?? "number"}
        step={options.type === "date" || options.type === "text" ? undefined : "any"}
        min={options.min}
        max={options.max}
        required={options.required}
        defaultValue={value ?? ""}
        disabled={options.disabled}
      />
    </div>
  );
  return (
    <Sheet open={well !== undefined} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="p-0 w-full sm:max-w-[490px]">
        <SheetHeader className="drawer-header">
          <SheetTitle>{well ? `Update ${well.name}` : "Create a well"}</SheetTitle>
          <SheetDescription>
            {well
              ? "Record operational measurements and engineering information."
              : "Add a well to your field portfolio."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="drawer-content" key={well?.id ?? "new"}>
          <div className="filter-grid">
            {input("Well name", "name", well?.name, {
              type: "text",
              disabled: !admin,
              required: true,
            })}
            <div className="form-field">
              <label htmlFor="well-field">Field name</label>
              <input
                id="well-field"
                name="field_name"
                list="field-options"
                defaultValue={well?.field_name ?? "North Field"}
                disabled={!admin}
                required
              />
              <datalist id="field-options">
                {[...new Set(data.wells.map((w) => w.field_name))].map((field) => (
                  <option key={field} value={field} />
                ))}
              </datalist>
            </div>
            <div className="form-field">
              <label htmlFor="well-type">Well type</label>
              <select
                id="well-type"
                value={type}
                disabled={!admin}
                onChange={(e) => setType(e.target.value)}
              >
                <option>Injector</option>
                <option>Producer</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="well-status">Operating status</label>
              <select id="well-status" name="status" defaultValue={well?.status ?? "Active"}>
                <option>Active</option>
                <option>Shut-in</option>
                <option>Maintenance</option>
              </select>
            </div>
            {input("Latitude", "latitude", well?.latitude, {
              disabled: !engineering,
              min: -90,
              max: 90,
              required: true,
            })}
            {input("Longitude", "longitude", well?.longitude, {
              disabled: !engineering,
              min: -180,
              max: 180,
              required: true,
            })}
          </div>
          <h3 className="form-section-title">
            {type === "Injector" ? "Injection measurements" : "Production measurements"}
          </h3>
          <div className="filter-grid">
            {type === "Injector" ? (
              <>
                {input("Injection rate (bbl/day)", "injection_rate", well?.injection_rate, {
                  min: 0,
                  required: true,
                })}
                {input("Injection pressure (psi)", "pressure", well?.pressure, {
                  min: 0,
                  disabled: !engineering,
                })}
              </>
            ) : (
              <>
                {input("Oil production (bbl/day)", "oil_rate", well?.oil_rate, {
                  min: 0,
                  disabled: !engineering,
                })}
                {input("Water production (bbl/day)", "water_rate", well?.water_rate, {
                  min: 0,
                  disabled: !engineering,
                })}
                {input("Water cut (%)", "water_cut", well?.water_cut, {
                  min: 0,
                  max: 100,
                  disabled: !engineering,
                })}
              </>
            )}
            {input(
              "Measurement date",
              "measurement_date",
              well?.measurement_date ?? new Date().toISOString().slice(0, 10),
              { type: "date", required: true },
            )}
          </div>
          {!engineering && (
            <p className="text-[11px] text-muted-foreground mt-5">
              Operator access · injection rate, status and measurement date.
            </p>
          )}
          {error && <p className="error-message mt-5">{error}</p>}
          <div className="drawer-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save record"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function RelationshipEditor({
  well,
  data,
  refresh,
}: {
  well: Well;
  data: WorkspaceData;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await dotnetRequest("/api/relationships", {
        method: "POST",
        body: JSON.stringify({
        injector_id: well.id,
        producer_id: String(f.get("producer")),
        distance: Number(f.get("distance")),
        status: "Active",
        }),
      });
      await refresh();
      toast.success("Producer connected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to connect producer.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel mt-5">
      <div className="panel-heading">
        <h2 className="panel-title">Manage relationships</h2>
      </div>
      <div className="detail-section">
        {data.relationships
          .filter((r) => r.injector_id === well.id)
          .map((r) => (
            <div key={r.id} className="flex items-center justify-between mb-3 text-xs">
              <span>
                {data.wells.find((w) => w.id === r.producer_id)?.name} · {r.distance} km
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await dotnetRequest(`/api/relationships/${r.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: r.status === "Active" ? "Inactive" : "Active" }),
                      });
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Unable to update relationship.");
                    }
                  }}
                >
                  {r.status}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Remove connection"
                  onClick={async () => {
                    try {
                      await dotnetRequest(`/api/relationships/${r.id}`, { method: "DELETE" });
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Unable to remove relationship.");
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        <form onSubmit={submit} className="flex gap-3 items-end mt-5">
          <div className="form-field flex-1">
            <label htmlFor="relation-producer">Producer well</label>
            <select id="relation-producer" name="producer" required>
              {data.wells
                .filter(
                  (w) =>
                    w.well_type === "Producer" &&
                    !data.relationships.some(
                      (r) => r.injector_id === well.id && r.producer_id === w.id,
                    ),
                )
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} · {w.field_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-field w-28">
            <label htmlFor="relation-distance">Distance (km)</label>
            <input
              id="relation-distance"
              name="distance"
              type="number"
              min="0"
              step="any"
              required
            />
          </div>
          <Button type="submit" disabled={busy}>
            <Plus />
            Connect
          </Button>
        </form>
      </div>
    </section>
  );
}

function ActivityView({ data, onSignIn }: { data: WorkspaceData; onSignIn: () => void }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2 className="panel-title">
          <Clock3 size={15} />
          Record activity
        </h2>
        <span className="muted-label">Most recent 50 changes</span>
      </div>
      {!data.role ? (
        <div className="empty-state">
          <ShieldCheck size={28} className="mx-auto mb-4" />
          <p>Sign in to view operational audit history.</p>
          <Button className="mt-4" onClick={onSignIn}>
            Sign in
          </Button>
        </div>
      ) : (
        data.audit.map((row) => (
          <div className="activity-row" key={row.id}>
            <span className="well-glyph">
              <FileText size={13} />
            </span>
            <div className="flex-1">
              <p>
                <strong>{row.well_name}</strong> · {row.action}
              </p>
              <small>
                {row.user_id ? "Authenticated operational change" : "Sample data initialization"}
              </small>
            </div>
            <small>{new Date(row.created_at).toLocaleString("en-GB")}</small>
          </div>
        ))
      )}
    </section>
  );
}

function SettingsView({
  data,
  refresh,
  onSignIn,
}: {
  data: WorkspaceData;
  refresh: () => Promise<void>;
  onSignIn: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const edit = data.role === "admin" || data.role === "engineer";
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const values = {
      water_cut: Number(f.get("water_cut")),
      low_oil: Number(f.get("low_oil")),
      low_injection: Number(f.get("low_injection")),
      high_pressure: Number(f.get("high_pressure")),
      decline_pct: Number(f.get("decline_pct")),
    };
    try {
      await dotnetRequest("/api/thresholds/1", { method: "PATCH", body: JSON.stringify(values) });
      await refresh();
      toast.success("Alert thresholds updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update thresholds.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <section className="panel max-w-3xl">
        <div className="panel-heading">
          <div>
            <h2 className="panel-title">
              <TriangleAlert size={15} />
              Alert thresholds
            </h2>
            <p className="panel-subtitle">Applied consistently across maps, tables and analytics</p>
          </div>
          <span className="status-pill">{edit ? "Editable" : "Read only"}</span>
        </div>
        <form className="detail-section" onSubmit={submit}>
          <div className="filter-grid">
            {[
              { key: "water_cut", label: "High water cut (%)", max: 100 },
              { key: "low_oil", label: "Low oil production (bbl/day)" },
              { key: "low_injection", label: "Low injection rate (bbl/day)" },
              { key: "high_pressure", label: "High injection pressure (psi)" },
              { key: "decline_pct", label: "Production decline (%)", max: 100 },
            ].map((item) => (
              <div className="form-field" key={item.key}>
                <label htmlFor={`threshold-${item.key}`}>{item.label}</label>
                <input
                  id={`threshold-${item.key}`}
                  name={item.key}
                  type="number"
                  min="0"
                  max={item.max}
                  step="any"
                  required
                  disabled={!edit}
                  defaultValue={data.thresholds[item.key as keyof typeof data.thresholds]}
                />
              </div>
            ))}
          </div>
          <div className="drawer-actions">
            <span className="text-xs text-muted-foreground">
              Engineering or administrator access required.
            </span>
            {edit ? (
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save thresholds"}
              </Button>
            ) : !data.role ? (
              <Button type="button" onClick={onSignIn}>
                Sign in
              </Button>
            ) : null}
          </div>
        </form>
      </section>
      <section className="panel max-w-3xl mt-5">
        <div className="panel-heading">
          <h2 className="panel-title">
            <ShieldCheck size={15} />
            Access & roles
          </h2>
        </div>
        <div className="detail-section">
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Operator</td>
                <td>View wells; update injection rate, status and measurement date</td>
              </tr>
              <tr>
                <td>Petroleum engineer</td>
                <td>Update engineering measurements; configure alert thresholds</td>
              </tr>
              <tr>
                <td>Administrator</td>
                <td>Manage wells, relationships and user access</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-5">
            New accounts receive operator access. Role changes are restricted to administrators.
          </p>
          {data.role === "admin" && <RoleManager refresh={refresh} />}
        </div>
      </section>
      <section className="panel max-w-3xl mt-5">
        <div className="panel-heading">
          <h2 className="panel-title">Notifications</h2>
          <span className="muted-label">Not connected</span>
        </div>
        <div className="detail-section text-xs text-muted-foreground">
          In-app alerts are active. Email delivery requires a verified sender and notification
          preferences.
        </div>
      </section>
    </>
  );
}

function RoleManager({ refresh }: { refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="filter-grid mt-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        try {
          await dotnetRequest("/api/roles", {
            method: "POST",
            body: JSON.stringify({ user_id: String(f.get("user")), role: String(f.get("role")) }),
          });
          await refresh();
          toast.success("User role updated");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to update user role.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-field">
        <label htmlFor="role-user">User account ID</label>
        <input
          id="role-user"
          name="user"
          type="text"
          required
          placeholder="Account UUID"
          pattern="[0-9a-fA-F-]{36}"
        />
      </div>
      <div className="form-field">
        <label htmlFor="role-level">Access level</label>
        <select id="role-level" name="role">
          <option value="operator">Operator</option>
          <option value="engineer">Petroleum engineer</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      <Button type="submit" disabled={busy}>
        Update access
      </Button>
    </form>
  );
}
