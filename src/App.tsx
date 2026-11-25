import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { WorkoutsPage } from './pages/WorkoutsPage';
import { ProgramEditorPage } from './pages/ProgramEditorPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ActivityEditorPage } from './pages/ActivityEditorPage';
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage';
import { HistoryPage } from './pages/HistoryPage';
import { HistoryDetailPage } from './pages/HistoryDetailPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<WorkoutsPage />} />
        <Route path="workouts/new" element={<ProgramEditorPage />} />
        <Route path="workouts/:programId/edit" element={<ProgramEditorPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:sessionId" element={<HistoryDetailPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="activities/new" element={<ActivityEditorPage />} />
        <Route path="activities/:activityId/edit" element={<ActivityEditorPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="session" element={<ActiveWorkoutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
