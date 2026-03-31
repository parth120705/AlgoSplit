import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [invitations, setInvitations] = useState([]);
  
  const { groups, setGroups, token } = useStore();

  const fetchGroups = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setGroups(await res.json());
    } catch (e) {
      console.error('Failed to fetch groups', e);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/invitations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setInvitations(await res.json());
    } catch (e) {
      console.error('Failed to fetch invitations', e);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchInvitations();
  }, [token]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: groupName, description: groupDesc })
      });
      if (res.ok) {
        const newGroup = await res.json();
        toast.success('Group created successfully!');
        setGroups([newGroup, ...groups]);
        setShowCreateModal(false);
        setGroupName('');
        setGroupDesc('');
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to create group');
      }
    } catch (e) {
      toast.error('Server error');
      console.error(e);
    }
  };

  const handleRespond = async (id, action) => {
    try {
      const res = await fetch(`http://localhost:5000/api/invitations/${id}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        toast.success(`Invitation ${action === 'accept' ? 'accepted' : 'declined'}`);
        setInvitations(invitations.filter((inv) => inv._id !== id));
        if (action === 'accept') {
          fetchGroups();
        }
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to respond to invitation');
      }
    } catch (e) {
      toast.error('Server error');
      console.error(e);
    }
  };

  return (
    <div className="h-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Your Groups</h1>
          <p className="text-slate-500 mt-1">Manage your shared expenses and balances</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center space-x-2 shadow-lg shadow-primary-500/30 transition-colors"
        >
          <Plus size={20} />
          <span>New Group</span>
        </motion.button>
      </div>

      {invitations.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-4">Pending Invitations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map(inv => (
              <motion.div key={inv._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 flex items-center justify-between border-l-4 border-l-primary-500">
                <div>
                  <h3 className="font-semibold text-slate-800">{inv.group.name}</h3>
                  <p className="text-xs text-slate-500">Invited by <span className="font-medium text-slate-700">{inv.sender.name}</span></p>
                </div>
                <div className="flex space-x-2 shadow-sm rounded-lg overflow-hidden bg-white/50 border border-white">
                  <button onClick={() => handleRespond(inv._id, 'accept')} className="px-3 py-1.5 bg-primary-500/10 text-primary-600 text-sm font-semibold hover:bg-primary-500 hover:text-white transition-colors">Accept</button>
                  <button onClick={() => handleRespond(inv._id, 'reject')} className="px-3 py-1.5 text-slate-500 text-sm font-medium hover:bg-red-500 hover:text-white transition-colors">Decline</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center border border-white/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 bg-gradient-to-br from-primary-500 to-indigo-600 w-full h-full pointer-events-none rounded-3xl" />
          <div className="w-20 h-20 bg-gradient-to-tr from-primary-100 to-indigo-50 text-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-white">
            <Users size={36} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">No groups yet</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto text-lg leading-relaxed">Create a group to start seamlessly splitting expenses with friends, family, or roommates.</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="text-primary-600 font-medium hover:underline"
          >
            Create your first group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={group._id}
              className="glass rounded-3xl p-6 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)] hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden ring-1 ring-white/50 hover:ring-primary-500/30"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl group-hover:bg-primary-500/10 transition-colors pointer-events-none" />
              
              <div className="flex items-center space-x-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-primary-100 flex items-center justify-center text-primary-600 font-bold text-2xl shadow-[inset_0_2px_10px_rgb(255,255,255,0.8)] ring-1 ring-black/5">
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-primary-600 transition-colors">{group.name}</h3>
                  <p className="text-sm font-medium text-slate-500 bg-slate-100/50 inline-block px-2 py-0.5 rounded-lg mt-1">{group.members.length} members</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 line-clamp-2 h-10 mb-6">
                {group.description || 'No description provided.'}
              </p>
              
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex -space-x-2">
                  {group.members.slice(0, 3).map((m, j) => (
                    <img 
                      key={j} 
                      src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} 
                      className="w-8 h-8 rounded-full border-2 border-white"
                      title={group.createdBy === m._id || group.createdBy?._id === m._id ? `${m.name} (Admin)` : m.name}
                    />
                  ))}
                  {group.members.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 text-xs font-medium text-slate-600 flex items-center justify-center">
                      +{group.members.length - 3}
                    </div>
                  )}
                </div>
                
                <Link 
                  to={`/groups/${group._id}`}
                  className="flex items-center text-primary-600 text-sm font-medium hover:text-primary-700 group-hover:translate-x-1 transition-transform"
                >
                  View Details <ArrowRight size={16} className="ml-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="Trip to Bali"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  value={groupDesc}
                  onChange={e => setGroupDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none h-24"
                  placeholder="Expenses for our amazing trip..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white bg-primary-600 hover:bg-primary-700 font-medium transition-colors shadow-lg shadow-primary-500/30"
                >
                  Create Group
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
