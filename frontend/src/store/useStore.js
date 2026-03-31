import { create } from 'zustand';

const useStore = create((set) => ({
  user: (() => {
    try {
      const item = localStorage.getItem('user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('token') || null,
  groups: [],
  activeGroup: null,
  expenses: [],
  settlements: [],
  balances: {},
  debts: [],

  setUser: (user, token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
    
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, groups: [], activeGroup: null });
  },

  setGroups: (groups) => set({ groups }),
  setActiveGroup: (group) => set({ activeGroup: group }),
  setExpenses: (expenses) => set({ expenses }),
  setBalances: (data) => set({ balances: data.balances, debts: data.debts }),
  
  // Realtime updates
  addExpense: (expense) => set((state) => ({ expenses: [expense, ...state.expenses] })),
  addSettlement: (settlement) => set((state) => ({ settlements: [settlement, ...state.settlements] })),
}));

export default useStore;
