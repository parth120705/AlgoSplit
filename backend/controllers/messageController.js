import Message from '../models/Message.js';
import Group from '../models/Group.js';

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Verify user is part of group
    if (!group.members.includes(req.user.id) && group.createdBy.toString() !== req.user.id) {
       // Allow if user is in members or is the creator
       const isMember = group.members.some(memberId => memberId.toString() === req.user.id);
       if (!isMember) {
          return res.status(403).json({ message: 'Not authorized to view messages in this group' });
       }
    }

    const messages = await Message.find({ group: groupId })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some(memberId => memberId.toString() === req.user.id) || group.createdBy.toString() === req.user.id;
    if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to send messages in this group' });
    }

    const newMessage = await Message.create({
      sender: req.user.id,
      group: groupId,
      text: text.trim()
    });

    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name email avatar');

    // Emit via socket io
    const io = req.app.get('io');
    if (io) {
      io.to(groupId).emit('receive_message', populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
};
