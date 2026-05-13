import Expense from '../models/Expense.js';
import Group from '../models/Group.js';
import Settlement from '../models/Settlement.js';

// @route   POST /api/expenses
export const addExpense = async (req, res) => {
  const { groupId, amount, description, receipt_url, splits } = req.body;
  const paidBy = req.user._id;

  try {
    if (!groupId || !amount || !splits || splits.length === 0) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.members.includes(paidBy)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    // Verify splits total equals amount
    const totalSplit = splits.reduce((acc, curr) => acc + Number(curr.amount), 0);
    if (Math.abs(totalSplit - Number(amount)) > 0.01) {
      return res.status(400).json({ message: 'Splits total must equal total amount' });
    }

    const expense = await Expense.create({
      groupId,
      paidBy,
      amount,
      description,
      receipt_url,
      splits
    });

    req.app.get('io').to(groupId.toString()).emit('new_expense', expense);

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Error adding expense', error: error.message });
  }
};

// @desc    Get expenses for a group
// @route   GET /api/expenses/group/:groupId
// @access  Private
export const getGroupExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ groupId: req.params.groupId })
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
};

// @desc    Calculate balances for a group (Simplified Debts)
// @route   GET /api/expenses/group/:groupId/balances
// @access  Private
export const getGroupBalances = async (req, res) => {
  try {
    const expenses = await Expense.find({ groupId: req.params.groupId });
    
    // Also fetch completed settlements to adjust balances
    const settlements = await Settlement.find({ 
      groupId: req.params.groupId, 
      status: 'completed' 
    });
    
    // balances map
    const balances = {}; 
    
    expenses.forEach(expense => {
      const paidBy = expense.paidBy.toString();
      balances[paidBy] = (balances[paidBy] || 0) + expense.amount; // Owed
      
      expense.splits.forEach(split => {
        const user = split.user.toString();
        balances[user] = (balances[user] || 0) - split.amount; // Owes
      });
    });

    // Apply settlements
    settlements.forEach(settlement => {
      const paidBy = settlement.paidBy.toString(); // person who owed money and just paid
      const paidTo = settlement.paidTo.toString(); // person who was owed
      
      balances[paidBy] = (balances[paidBy] || 0) + settlement.amount; // Debt reduced
      balances[paidTo] = (balances[paidTo] || 0) - settlement.amount; // Credit reduced
    });

    // Simplify debts
    const debtors = [];
    const creditors = [];

    for (const [user, amount] of Object.entries(balances)) {
      if (amount < -0.01) debtors.push({ user, amount: -amount });
      else if (amount > 0.01) creditors.push({ user, amount });
    }

    const debts = []; // { owes: userId, owed: userId, amount }

    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      
      const settledAmount = Math.min(debtor.amount, creditor.amount);
      
      debts.push({
        owes: debtor.user,
        owed: creditor.user,
        amount: Math.round(settledAmount * 100) / 100
      });

      debtor.amount -= settledAmount;
      creditor.amount -= settledAmount;

      if (debtor.amount < 0.01) d++;
      if (creditor.amount < 0.01) c++;
    }

    res.json({ balances, debts });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating balances', error: error.message });
  }
};
