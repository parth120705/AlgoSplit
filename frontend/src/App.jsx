import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GroupDetails from './pages/GroupDetails';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const token = useStore(state => state.token);
  const user = useStore(state => state.user);
  const logout = useStore(state => state.logout);

  if (!token || !user) {
    if (token) logout(); // clear invalid state
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/groups" element={<Dashboard />} />
          <Route path="/groups/:id" element={<GroupDetails />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
