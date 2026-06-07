import { createBrowserRouter, createRoutesFromElements, Route, Navigate, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ForceChangePassword from './pages/ForceChangePassword';
import Dashboard from './pages/Dashboard';
import TrainingActivitiesList from './pages/TrainingActivitiesList';
import TrainingActivityForm from './pages/TrainingActivityForm';
import TrainingActivityDetail from './pages/TrainingActivityDetail';
import ReviewSubmissions from './pages/ReviewSubmissions';
import UsersManagement from './pages/UsersManagement';
import ProvinceManagement from './pages/ProvinceManagement';
import TargetSectorManagement from './pages/TargetSectorManagement';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Force password change — protected but outside main layout */}
      <Route path="/change-password" element={<PrivateRoute><ForceChangePassword /></PrivateRoute>} />

      {/* Main app */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="trainings" element={<TrainingActivitiesList />} />
        <Route path="trainings/new" element={<TrainingActivityForm />} />
        <Route path="trainings/:id/edit" element={<TrainingActivityForm />} />
        <Route path="trainings/:id" element={<TrainingActivityDetail />} />
        <Route path="review" element={<PrivateRoute role="spark_focal"><ReviewSubmissions /></PrivateRoute>} />
        <Route path="users" element={<PrivateRoute role="spark_focal"><UsersManagement /></PrivateRoute>} />
        <Route path="provinces" element={<PrivateRoute role="spark_focal"><ProvinceManagement /></PrivateRoute>} />
        <Route path="target-sectors" element={<PrivateRoute role="spark_focal"><TargetSectorManagement /></PrivateRoute>} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </>
  )
);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
