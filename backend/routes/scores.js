const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Score = require('../models/Score');

// GET /api/scores - Get user's scores
router.get('/', auth, async (req, res) => {
  try {
    const userScore = await Score.findOne({ userId: req.user.id });
    if (!userScore) {
      return res.json({}); // Return empty object if no scores exist yet
    }
    res.json(userScore.scores);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// POST /api/scores - Save or update user's scores
router.post('/', auth, async (req, res) => {
  const { scores } = req.body; // Expects the full scores object from React state
  
  try {
    // Find existing score doc and update, or create a new one if it doesn't exist
    const userScore = await Score.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { scores: scores } },
      { new: true, upsert: true }
    );
    res.json(userScore.scores);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;