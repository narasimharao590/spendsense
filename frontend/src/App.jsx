import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import GuestRoute from './components/GuestRoute.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Budgets from './pages/Budgets.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Register from './pages/Register.jsx';
import Settings from './pages/Settings.jsx';
import Transactions from './pages/Transactions.jsx';

const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <Register />
                </GuestRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
