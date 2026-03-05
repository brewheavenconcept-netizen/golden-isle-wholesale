# Project Memory

## Project Structure
- **Admin Dashboard**: `brewcart-admin/` — Vite + React + TypeScript + Tailwind v3, NOT Next.js
- **Landing Page**: `LANDING PAGE/` — Next.js app
- **Main entry**: `brewcart-admin/src/App.tsx`
- **Admin pages**: `brewcart-admin/src/components/` and `brewcart-admin/src/pages/admin/`

## Dark Mode Architecture (Admin)
- Theme stored in `localStorage` as `brewcart_theme` ('dark' | 'light')
- `useTheme` hook: `src/hooks/useTheme.ts` — adds/removes `dark` class on `document.documentElement`
- Tailwind config: `darkMode: 'class'` (confirmed working)
- Default theme: `dark` (starts dark by default)
- Toggle button: in `Sidebar.tsx` bottom section

## Dark Mode Fix Applied (2026-03-05)
Root causes found and fixed:
1. **`index.css`**: `body { @apply bg-slate-50 }` had no dark variant → added `.dark body { @apply bg-gray-900 }` and `.dark h1-h6 { @apply text-white }`
2. **`Skeleton.tsx`**: `SkeletonCard` and `SkeletonTable` used `bg-white`/`bg-slate-50` without dark variants → added `dark:bg-gray-800`, `dark:border-gray-700`, `dark:bg-gray-900/50`
3. **`VariantBuilder.tsx`**: All inputs and containers lacked dark variants → added throughout
4. **`ProtectedRoute.tsx`** (system): Loading spinner wrapper `bg-slate-100` → added `dark:bg-gray-900`
5. **`OrderList.tsx`**: Order card inner divider `border-gray-100` → added `dark:border-gray-700`

## Admin Components Dark Mode Status
- Dashboard.tsx ✓ already had dark: variants
- AdminProductPage.tsx ✓ already had dark: variants
- ProductTableRow.tsx ✓ already had dark: variants
- Analytics.tsx ✓ already had dark: variants
- Settings.tsx ✓ already had dark: variants
- OrderList.tsx ✓ fixed one missing divider border
- MarketingSettings.tsx ✓ already had dark: variants
- PaymentSettings.tsx ✓ already had dark: variants
- ProductManagement.tsx ✓ already had dark: variants
- SuperAdminDashboard.tsx ✓ already had dark: variants
- ProductForm.tsx ✓ already had dark: variants

## Build Commands
- Admin: `cd brewcart-admin && npm run build` (Vite build, ~8s)
- Build warnings about chunk size (>500KB) are pre-existing, not errors

## Key File Paths
- CSS: `brewcart-admin/index.css`
- App wrapper: `brewcart-admin/src/App.tsx` — has `dark:bg-gray-900` on wrapper div
- Tailwind config: `brewcart-admin/tailwind.config.ts`
- Theme hook: `brewcart-admin/src/hooks/useTheme.ts`
