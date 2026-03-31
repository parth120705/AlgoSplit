import Settlement from '../models/Settlement.js';
import Group from '../models/Group.js';

// @desc    Record a settlement (payment)
// @route   POST /api/settlements
// @access  Private
export const recordSettlement = async (req, res) => {
  const { groupId, paidTo, amount, status } = req.body;
  const paidBy = req.user._id;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.members.includes(paidBy) || !group.members.includes(paidTo)) {
      return res.status(403).json({ message: 'Both users must be members of the group' });
    }

    const settlement = await Settlement.create({
      groupId,
      paidBy,
      paidTo,
      amount,
      status: status || 'completed'
    });

    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate('paidBy', 'name email avatar')
      .populate('paidTo', 'name email avatar');

    req.app.get('io').to(groupId.toString()).emit('new_settlement', populatedSettlement);

    res.status(201).json(populatedSettlement);
  } catch (error) {
    res.status(500).json({ message: 'Error recording settlement', error: error.message });
  }
};

// @desc    Get settlements for a group
// @route   GET /api/settlements/group/:groupId
// @access  Private
export const getGroupSettlements = async (req, res) => {
  try {
    const settlements = await Settlement.find({ groupId: req.params.groupId })
      .populate('paidBy', 'name email avatar')
      .populate('paidTo', 'name email avatar')
      .sort({ date: -1 });

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settlements', error: error.message });
  }
};
