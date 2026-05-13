import Invitation from '../models/Invitation.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

// @route   POST /api/invitations
// Body: { groupId, email }
export const sendInvitation = async (req, res) => {
  const { groupId, email } = req.body;

  try {
    const group = await Group.findById(groupId).populate('createdBy', 'name email');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Ensure only the group creator can send invitations
    if (group.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group creator can invite members' });
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email });
    if (existingUser && group.members.includes(existingUser._id)) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }

    // Check if pending invitation already exists
    const existingInvite = await Invitation.findOne({ group: groupId, inviteeEmail: email, status: 'pending' });
    if (existingInvite) {
      return res.status(400).json({ message: 'An invitation is already pending for this email' });
    }

    const invitation = await Invitation.create({
      group: groupId,
      sender: req.user._id,
      inviteeEmail: email
    });

    // Send Email to the invitee
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
        <h2 style="color: #4f46e5;">Welcome to AlgoSplit!</h2>
        <p><strong>${req.user.name}</strong> has invited you to join the group <strong>"${group.name}"</strong> to split expenses seamlessly.</p>
        <p>Log in to your AlgoSplit Dashboard to accept or reject this invitation.</p>
        <br />
        <p>Happy splitting!</p>
        <p><strong>The AlgoSplit Team</strong></p>
      </div>
    `;

    await sendEmail({
      email,
      subject: `Invitation to join ${group.name} on AlgoSplit`,
      html: emailHtml
    });

    res.status(201).json(invitation);
  } catch (error) {
    res.status(500).json({ message: 'Error sending invitation', error: error.message });
  }
};

// @route   GET /api/invitations
export const getMyInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({ inviteeEmail: req.user.email, status: 'pending' })
      .populate('group', 'name description avatar')
      .populate('sender', 'name email avatar')
      .sort({ createdAt: -1 });
      
    res.json(invitations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invitations', error: error.message });
  }
};

// @route   PUT /api/invitations/:id/respond
// Body: { action: 'accept' | 'reject' }
export const respondToInvitation = async (req, res) => {
  const { action } = req.body;
  
  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action' });
  }

  try {
    const invitation = await Invitation.findById(req.params.id)
      .populate('group')
      .populate('sender', 'name email');

    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

    // Verify it belongs to the current user
    if (invitation.inviteeEmail !== req.user.email) {
      return res.status(403).json({ message: 'Not authorized for this invitation' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Invitation already processed' });
    }

    if (action === 'accept') {
      invitation.status = 'accepted';
      
      // Add user to the group
      if (!invitation.group.members.includes(req.user._id)) {
        invitation.group.members.push(req.user._id);
        await invitation.group.save();
      }

      // Send email to sender notifying them of acceptance
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <h2 style="color: #10b981;">Invitation Accepted!</h2>
          <p>Great news! <strong>${req.user.name}</strong> (${req.user.email}) has accepted your invitation and joined <strong>"${invitation.group.name}"</strong>.</p>
          <p>You can now start splitting expenses with them.</p>
        </div>
      `;

      await sendEmail({
        email: invitation.sender.email,
        subject: `${req.user.name} joined ${invitation.group.name}`,
        html: emailHtml
      });

    } else {
      invitation.status = 'rejected';
    }

    await invitation.save();
    
    // Also broadcast over socket if group is modified
    if (action === 'accept') {
      const io = req.app.get('io');
      if (io) io.to(invitation.group._id.toString()).emit('new_expense'); // using the same signal forces group refresh
    }

    res.json(invitation);
  } catch (error) {
    res.status(500).json({ message: 'Error responding to invitation', error: error.message });
  }
};
