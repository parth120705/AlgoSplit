import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User who pays the settlement
  paidTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User receiving the settlement
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Settlement', settlementSchema);
