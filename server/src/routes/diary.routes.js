import express from 'express';
import DiaryEntry from '../models/diary.model.js';
import { requireAuth } from '../middleware/auth.middleware.js'; 

const router = express.Router();

// Fetch all diary entries for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const entries = await DiaryEntry.find({ user: req.user._id }).sort({ timestamp: -1 });
    res.json({ success: true, data: { entries } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Save a new diary entry
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, body, timestamp, dateStr } = req.body;
    const entry = await DiaryEntry.create({
      user: req.user._id,
      title: title || 'Untitled',
      body: body || '',
      timestamp: timestamp || Date.now(),
      dateStr: dateStr || new Date().toLocaleDateString()
    });
    res.status(201).json({ success: true, data: { entry } });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Update an existing diary entry
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { title, body } = req.body;
    const entry = await DiaryEntry.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, body },
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, error: { message: "Entry not found" } });
    res.json({ success: true, data: { entry } });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Delete a diary entry
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const entry = await DiaryEntry.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ success: false, error: { message: "Entry not found" } });
    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

export default router;