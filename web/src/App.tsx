import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { ActionsPage } from './pages/ActionsPage';
import { SummaryPage } from './pages/SummaryPage';
import { DemandPage } from './pages/DemandPage';
import { RiskPage } from './pages/RiskPage';
import { PerformancePage } from './pages/PerformancePage';
import { ExplainPage } from './pages/ExplainPage';
import { AdminPage } from './pages/AdminPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
          <Sidebar />
          <main className="flex-1 overflow-y-auto min-h-screen relative">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/actions" element={<ActionsPage />} />
              <Route path="/summary" element={<SummaryPage />} />
              <Route path="/demand" element={<DemandPage />} />
              <Route path="/risk" element={<RiskPage />} />
              <Route path="/performance" element={<PerformancePage />} />
              <Route path="/explain" element={<ExplainPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
