# QuonsApp Phase 9 — Sub-accounts, Worker Restrictions, Map, Membership Fixes

## Ernest's Requirements
1. Sub-accounts (workers/managers) linked to primary, auto-suspend if primary lapses
2. Sub-accounts should NOT see plan selection or membership management
3. Workers: can't create/add shifts, only see own assigned shifts, own clock-in records
4. Workers: hide "Platform Features" and "Quick Actions" on dashboard
5. Fix: paid users should NOT see "Choose a plan" again
6. Fix: if main account pays before trial ends, don't ask for plan
7. Auto-charge membership (PayPal recurring — note: requires subscription API, defer)
8. If primary membership lost → all sub-accounts + primary paused
9. Add more features
10. Add live interactive map of portfolio locations

## Implementation Plan

### Backend
- [x] `convex/shifts.ts` — worker-aware query (find by linked staff, org-scoped)
- [x] `convex/timeTracking.ts` — worker-aware query  
- [x] `convex/featureGating.ts` — add `isPaidSubscriber` to response

### Frontend
- [x] `src/hooks/useFeatureAccess.ts` — expose `isPaidSubscriber`
- [x] `src/pages/DashboardPage.tsx` — hide plan step for paid users, hide features/actions for workers
- [x] `src/components/FeatureGate.tsx` — fix TrialBanner for paid users, hide for sub-accounts
- [x] `src/pages/SchedulePage.tsx` — workers: read-only, own shifts only
- [x] `src/pages/TimeTrackingPage.tsx` — workers: own records only
- [x] `src/pages/PricingPage.tsx` — redirect sub-accounts, fix paid user display
- [x] Interactive map component + page
- [x] Add map to sidebar nav
- [x] More features on landing/pricing pages

### Deploy
- [ ] Build
- [ ] Deploy to production
- [ ] Push to GitHub
- [ ] Notify Ernest
