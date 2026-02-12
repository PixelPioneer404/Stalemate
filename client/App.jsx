import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useSoundEffects } from './hooks/useSoundEffects.js';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const LocalPracticePage = lazy(() => import('./pages/LocalPracticePage.jsx'));
const MultiplayerPage = lazy(() => import('./pages/MultiplayerPage.jsx'));

const PageFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center text-sm uppercase tracking-[0.2em] text-slate-400">
    Loading
  </div>
);

const App = () => {
  const { muted, toggleMuted, playMoveFeedback } = useSoundEffects();

  return (
    <ErrorBoundary>
      <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#020617_45%,_#020617_100%)] text-slate-100">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/local"
              element={
                <LocalPracticePage
                  muted={muted}
                  onToggleMuted={toggleMuted}
                  playMoveFeedback={playMoveFeedback}
                />
              }
            />
            <Route
              path="/match/:matchCode"
              element={
                <MultiplayerPage
                  muted={muted}
                  onToggleMuted={toggleMuted}
                  playMoveFeedback={playMoveFeedback}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default App;
