<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Waterflood architecture
- Use a shared field-first workspace across the overview, field, and well routes so filters, map, tree and alerts remain consistent.
- Persist waterflood records, measurement snapshots, relationships and thresholds in Cloud; sample rows alone are readable anonymously.
- Enforce operational, engineering and administrative permissions in database policies and triggers; new accounts receive only the operator role.
- Import Leaflet only after hydration and use real latitude/longitude with OpenStreetMap tiles for geographic visualization.
- Keep domain calculations in a browser-safe module and use server functions with scoped clients for initial reads.
- Initial public-route reads always use anonymous sample data; load authenticated records after hydration to avoid session-dependent SSR mismatches.
