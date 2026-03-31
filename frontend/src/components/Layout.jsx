import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, LogOut, Settings, CreditCard } from 'lucide-react';
import useStore from '../store/useStore';
import { motion } from 'framer-motion';

export default function Layout() {
  const user = useStore(state => state.user);
  const logout = useStore(state => state.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/' },
    { name: 'Groups', icon: Users, path: '/groups' },
    // { name: 'Payments', icon: CreditCard, path: '/payments' },
    // { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 bg-white/40 backdrop-blur-2xl border-r border-white/40 flex flex-col justify-between shadow-[4px_0_24px_rgb(0,0,0,0.02)] z-10"
      >
        <div>
          <div className="p-6 flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/30">
              A
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-500">
              AlgoSplit
            </span>
          </div>

          <nav className="px-4 space-y-2">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link 
                  key={item.name} 
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                >
                  <item.icon size={20} className={isActive ? 'text-primary-600' : 'text-slate-400'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white/50">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=0D8ABC&color=fff`} alt="Avatar" className="w-10 h-10 rounded-full shadow-sm" />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-transparent">
        <div className="p-8 max-w-7xl mx-auto h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
