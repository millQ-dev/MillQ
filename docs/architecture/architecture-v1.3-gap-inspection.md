# Architecture v1.3 Gap Inspection (pre-change report archive)

- **Date:** 2026-09-04
- **Origin HEAD inspected:** `46f01ecc076e163c7fcf723b46fffeb641345580`
- **Block C:** merged (`a5e84b0`)
- **Command:** KiU correcting command after gap-analysis

Status legend: ALIGNED | PARTIAL | MISSING | CONFLICT | DEFERRED BY DESIGN | LEGAL GATE

| Контур | Repo/ADR evidence | Status | Gap | Required change | ADR | Blocks what |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Organization / LE / Brand / Outlet / jurisdiction | ADR-0008, v1.2, domain map | PARTIAL | JurisdictionProfile thin | Document in v1.3 + ADR-0012 | ADR-0012 | Country packs |
| 2 PackageEntitlement + OutletCapabilityConfig | ADR-0008 | PARTIAL | No capability key catalog | Spec keys in map/v1.3 | NO ADR — refine docs | Package forks |
| 3 CatalogItem + profiles | ADR-0009 | PARTIAL | Code stubs only | Impl later | — | Full catalog |
| 4 Units / conversions / SupplierPack | ADR-0002/0009, Block C packs | PARTIAL | ItemUnitConversion sparse in code | Impl later | — | Complex UoM |
| 5 SupplierItem | ADR-0009, Block C | ALIGNED | — | — | — | — |
| 6 Recipe graph / variants / strategy | ADR-0003/0009, v1.2 | PARTIAL | Not implemented | Impl after v1.3 | — | Sale write-off |
| 7 Cost semantics / certainty | ADR-0003, Block C CostQuote | ALIGNED | Economic margin missing | ADR-0019 | ADR-0019 | Owner economics UX |
| 8 Catalog≠Menu≠POS≠Channel | ADR-0008 | ALIGNED | Impl deferred | — | — | — |
| 9 SalesContext + MenuResolver | v1.2 | PARTIAL | No resolver specs | Specs later | NO ADR yet | Menu vertical |
| 10 Pricing≠Promo≠Loyalty | ADR-0008 | ALIGNED | Loyalty later | — | DEFERRED BY DESIGN | — |
| 11 Orders independent of Table | v1.2 | ALIGNED | Not implemented | — | — | — |
| 12 Settlement / Split Bill | — | MISSING | No settlement model | ADR-0016 + map | ADR-0016 | POS payments |
| 13 FloorPlan / Table Engine | tables optional only | MISSING | No engine concepts | ADR-0017 + map | ADR-0017 | Restaurant POS |
| 14 Production Routing | v1.2 | PARTIAL | Not implemented | — | — | KDS |
| 15 Typed inventory docs + posting | ADR-0010, Block C GR | ALIGNED | Other doc types later | — | — | — |
| 16 InventoryCountSession | ADR-0010 named | PARTIAL | Not implemented | — | — | Count UX |
| 17 Business time / PeriodLock | ADR-0003 chronology | PARTIAL | PeriodLock not specified | Note in v1.3; ADR later if needed | NO ADR — doc | Period close |
| 18 Workforce vs CashShift | domain map | ALIGNED | Not implemented | — | — | — |
| 19 TenderDefinition / payment lifecycle | domain map | PARTIAL | Thin | + ADR-0013 | ADR-0013 | Payments |
| 20 Payment non-custody | — | MISSING | Not hard-stated | ADR-0013 | ADR-0013 | Regulatory scope |
| 21 VN Fiscalization boundary | “deferred research” only | MISSING | Boundary not frozen | ADR-0014 | ADR-0014 | Fiscal/offline |
| 22 VN foreign-owned MillQ LLC | — | MISSING | Not stated | ADR-0015 | ADR-0015 | Corp confusion |
| 23 PII Vault / Privacy plane | chat packet only | MISSING | No architecture | ADR-0015 | ADR-0015 | CRM/migration |
| 24 VN-primary data residency | — | MISSING | Intent missing | ADR-0015 | ADR-0015 | Hosting |
| 25 Cross-border Egress Gate | — | MISSING | — | ADR-0015 | ADR-0015 | Processors |
| 26 Security / GovernmentRequestCase | Audit only | MISSING | No case type | ADR-0015 | ADR-0015 | Lawful requests |
| 27 Offline multi-platform runtime | offline-foundation | PARTIAL | Platforms/sync/gateway unset | ADR-0018 | ADR-0018 | POS start |
| 28 Device / Printing boundary | OutputEndpoint | PARTIAL | Device gateway thin | Note in v1.3 | NO ADR — map | Print/KDS |
| 29 Action / Compliance Center | — | MISSING | Read-side unnamed | v1.3 + Reporting | NO ADR — doc | Owner UX |
| 30 Intelligence evidence | ADR-0006 | ALIGNED | Algorithms deferred | — | — | — |
| 31 Economic facts / channel profit | CostQuote only | MISSING | Margin model | ADR-0019 | ADR-0019 | Owner AI |
| 32 JurisdictionProfile vs providers | Fiscal “adapter” blur | MISSING | Giant-country risk | ADR-0012 | ADR-0012 | Integrations |
| 33 GrabFood / ShopeeFood boundary | Integrations stub | PARTIAL | Connector later | Keep Integrations + ADR-0012 | DEFERRED BY DESIGN | Delivery |
| 34 Migration Core | — | MISSING | Entire capability | ADR-0011 | ADR-0011 | Onboarding |
| 35 Canonical Migration Model | — | MISSING | — | ADR-0011 | ADR-0011 | Importers |
| 36 External Entity Mapping | — | MISSING | — | ADR-0011 | ADR-0011 | Re-import |
| 37 Historical Import Policy | — | MISSING | — | ADR-0011 | ADR-0011 | Ledger safety |
| 38 Migration Privacy Gate | — | MISSING | — | ADR-0011↔0015 | ADR-0011/15 | PII import |
| 39 Audit / provenance | ADR-0010, Block C audit | PARTIAL | Checklist incomplete | v1.3 note | NO ADR — refine | — |
| 40 Event taxonomy | v1.2 | ALIGNED | — | — | — | — |
| Block C code vs v1.3 | block-c-implementation | ALIGNED | No code fix | None | — | — |
| Legal production fiscal/privacy certs | — | LEGAL GATE | Not architecture | External clearance | — | Go-live VN |
