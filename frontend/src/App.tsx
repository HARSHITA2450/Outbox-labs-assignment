import { Header } from './components/Header';
import { Spinner } from './components/ui';
import { useAuth } from './hooks/useAuth';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';

export default function App() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center text-gray-400"><Spinner /></div>;
  if (!user) return <Login />;

  return (
    <>
      <Header user={user} onLogout={logout} />
      <Dashboard />
    </>
  );
}
