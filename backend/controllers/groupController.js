import Group from '../models/Group.js';
import User from '../models/User.js';

// @route   POST /api/groups
export const createGroup = async (req, res) => {
  const { name, description, avatar, members } = req.body;
  
  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const groupMembers = [req.user._id];
    
    // Add additional members if provided
    if (members && members.length > 0) {
      groupMembers.push(...members);
    }

    const group = await Group.create({
      name,
      description,
      avatar,
      members: [...new Set(groupMembers)], 
      createdBy: req.user._id
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error creating group', error: error.message });
  }
};

// @route   GET /api/groups
export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ updatedAt: -1 });
      
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups', error: error.message });
  }
};

// @route   GET /api/groups/:id
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view this group' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching group', error: error.message });
  }
};

// @route   PUT /api/groups/:id/members
export const addMember = async (req, res) => {
  const { email } = req.body;

  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to add members' });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ message: 'User not found with this email' });

    if (group.members.includes(userToAdd._id)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    group.members.push(userToAdd._id);
    await group.save();

    const updatedGroup = await Group.findById(req.params.id)
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email avatar');
      
    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error adding member', error: error.message });
  }
};
