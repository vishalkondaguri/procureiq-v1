import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageLayout from '@/core/components/PageLayout/PageLayout';
import LoadingScreen from '@/core/components/LoadingScreen';
import RequireAuth from '@/core/auth/RequireAuth';

// ── Public pages ──────────────────────────────────────────────────────────────
const CoverPage              = lazy(() => import('@/core/auth/CoverPage'));
const LoginPage              = lazy(() => import('@/core/auth/LoginPage'));
const ForgotPasswordPage     = lazy(() => import('@/core/auth/ForgotPasswordPage'));
const ResetPasswordPage      = lazy(() => import('@/core/auth/ResetPasswordPage'));

// ── Phase 1 ──────────────────────────────────────────────────────────────────
const ExecutiveCommandCenter = lazy(() => import('@/modules/executive-command-center/pages/ExecutiveCommandCenter'));
const IDEPage                = lazy(() => import('@/modules/ide/pages/IDEPage'));
const TailSpendPage          = lazy(() => import('@/modules/tail-spend/pages/TailSpendPage'));
const Supplier360Page        = lazy(() => import('@/modules/supplier-360/pages/Supplier360Page'));

// ── Phase 2 ──────────────────────────────────────────────────────────────────
const ContractIntelligence   = lazy(() => import('@/modules/contract-intelligence/pages/ContractIntelligencePage'));
const SupplierRisk           = lazy(() => import('@/modules/supplier-risk/pages/SupplierIntelligencePage'));
const ParetoAnalysis         = lazy(() => import('@/modules/pareto-analysis/pages/ParetoAnalysisPage'));
const HealthScore            = lazy(() => import('@/modules/health-score/pages/HealthScorePage'));
const SavingsEngine          = lazy(() => import('@/modules/savings-engine/pages/SavingsEnginePage'));

// ── Phase 3 stubs ─────────────────────────────────────────────────────────────
const WhatIfAnalysis         = lazy(() => import('@/modules/what-if-analysis/pages/WhatIfAnalysisPage'));
const SpendForecasting       = lazy(() => import('@/modules/spend-forecasting/pages/SpendForecastingPage'));
const ExecutiveReporting     = lazy(() => import('@/modules/executive-reporting/pages/ExecutiveReportingPage'));

// ── Phase 4 stubs ─────────────────────────────────────────────────────────────
const Documentation          = lazy(() => import('@/modules/documentation/pages/DocumentationPage'));
const Settings               = lazy(() => import('@/modules/settings/pages/SettingsPage'));

const S = (el: React.ReactNode) => <Suspense fallback={<LoadingScreen />}>{el}</Suspense>;

export const router = createBrowserRouter([
  // ── Public routes (no auth required) ────────────────────────────────────────
  { path: '/',                  element: S(<CoverPage />) },
  { path: '/login',             element: S(<LoginPage />) },
  { path: '/forgot-password',   element: S(<ForgotPasswordPage />) },
  { path: '/reset-password',    element: S(<ResetPasswordPage />) },

  // ── Protected routes (RequireAuth wraps PageLayout) ──────────────────────────
  {
    path: '/app',
    element: (
      <RequireAuth>
        <PageLayout />
      </RequireAuth>
    ),
    children: [
      { index: true,            element: <Navigate to="/app/dashboard" replace /> },
      // Phase 1
      { path: 'dashboard',      element: S(<ExecutiveCommandCenter />) },
      { path: 'data-engine',    element: S(<IDEPage />) },
      { path: 'tail-spend',     element: S(<TailSpendPage />) },
      { path: 'suppliers',      element: S(<Supplier360Page />) },
      // Phase 2
      { path: 'contracts',      element: S(<ContractIntelligence />) },
      { path: 'supplier-risk',  element: S(<SupplierRisk />) },
      { path: 'pareto',         element: S(<ParetoAnalysis />) },
      { path: 'health-score',   element: S(<HealthScore />) },
      { path: 'savings',        element: S(<SavingsEngine />) },
      // Phase 3 (stubs)
      { path: 'what-if',        element: S(<WhatIfAnalysis />) },
      { path: 'forecasting',    element: S(<SpendForecasting />) },
      { path: 'reporting',      element: S(<ExecutiveReporting />) },
      // Phase 4 (stubs)
      { path: 'documentation',  element: S(<Documentation />) },
      { path: 'settings',       element: S(<Settings />) },
    ],
  },

  // ── Catch-all ────────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
]);
