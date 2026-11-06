import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AppBootScreen from './AppBootScreen.jsx';

export default function GuestRoute({ children }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return <AppBootScreen />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return children;
}
