const mongoose = require('mongoose');

const DiarySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  timestamp: { type: Number, required: true },
  dateStr: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('DiaryEntry', DiarySchema);