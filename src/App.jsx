import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/useAuth';

import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import Questions      from './pages/Questions';
import Quizzes        from './pages/Quizzes';
import CurrentAffairs from './pages/CurrentAffairs';
import Users          from './pages/Users';
import Reports        from './pages/Reports';
import Categories     from './pages/Categories';
import Notifications  from './pages/Notifications';
import Import         from './pages/Import';
import Analytics      from './pages/Analytics';
import LiveTests      from './pages/LiveTests';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Layout>
              <Routes>
                <Route path="/"                 element={<Dashboard />}      />
                <Route path="/questions"        element={<Questions />}      />
                <Route path="/quizzes"          element={<Quizzes />}        />
                <Route path="/current-affairs"  element={<CurrentAffairs />} />
                <Route path="/categories"       element={<Categories />}     />
                <Route path="/users"            element={<Users />}          />
                <Route path="/reports"          element={<Reports />}        />
                <Route path="/notifications"    element={<Notifications />}  />
                <Route path="/import"           element={<Import />}         />
                <Route path="/analytics"        element={<Analytics />}      />
                <Route path="/live-tests"       element={<LiveTests />}      />
                <Route path="*"                 element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}
