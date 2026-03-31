import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Receipt, Users, CreditCard, Clock, UserPlus } from 'lucide-react';
import useStore from '../store/useStore';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

export default function GroupDetails() {
  const { id } = useParams();
  const { 
    token, user, 
    activeGroup, setActiveGroup, 
    expenses, setExpenses, 
    balances, debts, setBalances
  } = useStore();
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [exactSplits, setExactSplits] = useState({});
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [settlements, setSettlements] = useState([]);

  const feed = [
    ...expenses.map(e => ({ ...e, type: 'expense', sortDate: new Date(e.date) })),
    ...settlements.map(s => ({ ...s, type: 'settlement', sortDate: new Date(s.date || s.createdAt) }))
  ].sort((a, b) => b.sortDate - a.sortDate);

  useEffect(() => {
    fetch(`http://localhost:5000/api/groups/${id}`, { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => setActiveGroup(data));

    fetch(`http://localhost:5000/api/expenses/group/${id}`, { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => setExpenses(data));

    fetch(`http://localhost:5000/api/expenses/group/${id}/balances`, { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => setBalances(data));

    fetch(`http://localhost:5000/api/settlements/group/${id}`, { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => setSettlements(data));

    const socket = io('http://localhost:5000');
    socket.emit('join_group', id);
    
    socket.on('new_expense', () => {
      fetch(`http://localhost:5000/api/expenses/group/${id}`, { headers: { 'Authorization': `Bearer ${token}` }})
        .then(res => res.json())
        .then(data => { setExpenses(data); fetchBalances(); });
    });

    socket.on('new_settlement', () => {
      fetch(`http://localhost:5000/api/settlements/group/${id}`, { headers: { 'Authorization': `Bearer ${token}` }})
        .then(res => res.json())
        .then(data => setSettlements(data));
      fetchBalances();
    });

    return () => socket.disconnect();
  }, [id, token]);

  const fetchBalances = () => {
    fetch(`http://localhost:5000/api/expenses/group/${id}/balances`, { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => setBalances(data));
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    let splitsArray = [];
    if (splitMethod === 'equal') {
      const perPerson = Number(amount) / activeGroup.members.length;
      splitsArray = activeGroup.members.map(m => ({ user: m._id, amount: perPerson }));
    } else {
      splitsArray = Object.keys(exactSplits).map(k => ({ user: k, amount: Number(exactSplits[k]) }));
      const totalSplit = splitsArray.reduce((acc, curr) => acc + curr.amount, 0);
      if (Math.abs(totalSplit - Number(amount)) > 0.01) {
        toast.error('Split amounts do not match the total expense!');
        return;
      }
    }

    try {
      const res = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          groupId: id,
          amount: Number(amount),
          description,
          splits: splitsArray
        })
      });
      if (res.ok) {
        toast.success('Expense added successfully!');
        setShowExpenseModal(false);
        setAmount('');
        setDescription('');
        setExactSplits({});
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Error adding expense');
      }
    } catch(err) {
      toast.error('Server error');
      console.error(err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ groupId: id, email: memberEmail })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Invitation sent successfully!');
        setShowAddMemberModal(false);
        setMemberEmail('');
      } else {
        toast.error(data.message || 'Error sending invitation');
      }
    } catch(err) {
      toast.error('Server error while sending invitation');
      console.error(err);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSettle = async (debt) => {
    try {
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error("Razorpay SDK failed to load.");
        return;
      }

      const orderRes = await fetch('http://localhost:5000/api/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: debt.amount })
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.id) {
        toast.error("Payment initialization failed! " + (orderData.error || orderData.message || ''));
        return;
      }

      const configRes = await fetch('http://localhost:5000/api/payments/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const { key } = await configRes.json();

      const options = {
        key: key, 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AlgoSplit",
        description: `Settlement to ${activeGroup.members.find(m => m._id === debt.owed)?.name}`,
        order_id: orderData.id,
        handler: async function (response) {
          const verifyRes = await fetch('http://localhost:5000/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            toast.success('Payment completed successfully!');
            await fetch('http://localhost:5000/api/settlements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                groupId: id,
                paidTo: debt.owed,
                amount: debt.amount,
                status: 'completed'
              })
            });
          } else {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#3b82f6"
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch(err) {
      console.error(err);
    }
  };

  if (!activeGroup) {
    return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="h-full flex flex-col xl:flex-row gap-8">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex items-center space-x-4 mb-6">
          <Link to="/groups" className="p-2 bg-white rounded-full text-slate-500 hover:text-primary-600 shadow-sm transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{activeGroup.name}</h1>
            <p className="text-slate-500">{activeGroup.members.length} members</p>
          </div>
          {activeGroup.createdBy?._id === user?._id && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddMemberModal(true)}
              className="ml-auto bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium flex items-center space-x-2 transition-colors mr-3"
            >
              <UserPlus size={20} />
              <span className="hidden sm:inline">Invite</span>
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowExpenseModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center space-x-2 shadow-lg shadow-primary-500/30 transition-colors"
          >
            <Plus size={20} />
            <span>Add Expense</span>
          </motion.button>
        </div>

        <div className="glass rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex-1 overflow-y-auto p-3 relative">
          {feed.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4"><Receipt size={32}/></div>
              <p className="text-slate-500">No activity yet. Add an expense to get started!</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {feed.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item._id} 
                  className="flex items-center p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                >
                  {item.type === 'expense' ? (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center mr-4">
                        <Receipt size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">{item.description}</h3>
                        <div className="flex items-center text-xs text-slate-500 mt-1 space-x-2">
                          <span className="flex items-center"><Clock size={12} className="mr-1"/> {new Date(item.sortDate).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Paid by <span className="font-medium text-slate-700">
                            {item.paidBy.name === user?.name ? 'You' : item.paidBy.name}
                            {activeGroup.createdBy?._id === item.paidBy._id && <span className="ml-1 text-xs text-primary-500 font-bold">(Admin)</span>}
                          </span></span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-slate-800">₹{item.amount.toFixed(2)}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mr-4">
                        <CreditCard size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">Payment Settle Up</h3>
                        <div className="flex items-center text-xs text-slate-500 mt-1 space-x-2">
                          <span className="flex items-center"><Clock size={12} className="mr-1"/> {new Date(item.sortDate).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>
                            <span className="font-medium text-slate-700">
                              {item.paidBy.name === user?.name ? 'You' : item.paidBy.name}
                              {activeGroup.createdBy?._id === item.paidBy._id && <span className="ml-1 text-xs text-primary-500 font-bold">(Admin)</span>}
                            </span> 
                            {' paid '}
                            <span className="font-medium text-slate-700">
                              {item.paidTo.name === user?.name ? 'You' : item.paidTo.name}
                              {activeGroup.createdBy?._id === item.paidTo._id && <span className="ml-1 text-xs text-primary-500 font-bold">(Admin)</span>}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-emerald-500">₹{item.amount.toFixed(2)}</div>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full xl:w-96 flex flex-col gap-8 overflow-y-auto pr-2 pb-6">
        <div className="glass rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center"><Users size={22} className="mr-3 text-primary-500"/> Group Balances</h2>
          <div className="space-y-4">
            {activeGroup.members.map(m => {
              const bal = balances[m._id] || 0;
              return (
                <div key={m._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-8 h-8 rounded-full" />
                    <span className="text-sm font-medium text-slate-700">
                      {m.name === user?.name ? 'You' : m.name}
                      {activeGroup.createdBy?._id === m._id && <span className="ml-1 text-xs text-primary-500 font-bold">(Admin)</span>}
                    </span>
                  </div>
                  <div className={`text-sm font-bold ${bal > 0 ? 'text-emerald-500' : bal < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {bal > 0 ? '+' : ''}₹{bal.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center"><CreditCard size={22} className="mr-3 text-emerald-500"/> How to Settle Up</h2>
          {debts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">All settled up! 🎉</p>
          ) : (
            <div className="space-y-4">
              {debts.map((d, i) => {
                const owesMember = activeGroup.members.find(m => m._id === d.owes);
                const owedMember = activeGroup.members.find(m => m._id === d.owed);
                if (!owesMember || !owedMember) return null;
                
                const isUserOwes = d.owes === user?._id;

                return (
                  <div key={i} className="p-3 bg-white/50 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-600 mb-3 text-center">
                      <span className="font-semibold text-slate-800">
                        {isUserOwes ? 'You' : owesMember.name}
                        {activeGroup.createdBy?._id === owesMember._id && <span className="ml-1 text-xs text-primary-500 font-bold">(Admin)</span>}
                      </span>
                      {' owes '}
                      <span className="font-semibold text-slate-800">
                        {d.owed === user?._id ? 'You' : owedMember.name}
                        {activeGroup.createdBy?._id === owedMember._id && <span className="ml-1 text-xs text-primary-500 font-bold">(Admin)</span>}
                      </span>
                      <div className="font-bold text-xl text-slate-800 mt-2">₹{d.amount.toFixed(2)}</div>
                    </div>
                    {isUserOwes && (
                      <button 
                        onClick={() => handleSettle(d)}
                        className="w-full py-2.5 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5"
                      >
                        Settle Up via Razorpay
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Add Expense</h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="Dinner at the local restaurant"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Split Method</label>
                <div className="flex bg-slate-100 rounded-xl p-1">
                  <button 
                    type="button"
                    onClick={() => setSplitMethod('equal')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${splitMethod === 'equal' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}
                  >
                    Equally
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSplitMethod('exact')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${splitMethod === 'exact' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}
                  >
                    Exact Amounts
                  </button>
                </div>
              </div>

              {splitMethod === 'exact' && (
                <div className="space-y-2 mt-4">
                  {activeGroup.members.map(m => (
                    <div key={m._id} className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-slate-700 w-28 truncate">
                        {m.name === user?.name ? 'You' : m.name}
                        {activeGroup.createdBy?._id === m._id && <span className="ml-1 text-xs text-primary-500 font-bold">(Admin)</span>}
                      </span>
                      <input 
                        type="number" 
                        value={exactSplits[m._id] || ''}
                        onChange={e => setExactSplits({...exactSplits, [m._id]: e.target.value})}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="₹0.00"
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t border-slate-100 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white bg-primary-600 hover:bg-primary-700 font-medium transition-colors shadow-lg shadow-primary-500/30"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Invite Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User Email Address</label>
                <input 
                  type="email" 
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="friend@example.com"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4 border-t border-slate-100 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white bg-primary-600 hover:bg-primary-700 font-medium transition-colors shadow-lg shadow-primary-500/30"
                >
                  Confirm Invite
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
