const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Score = require('../models/Score');
const User = require('../models/User');
const { sendScoreReportEmail } = require('../services/emailService');

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

// POST /api/scores - Save or update user's scores and send email report
router.post('/', auth, async (req, res) => {
  const { scores } = req.body; // Expects the full scores object from React state
  
  try {
    // Find existing score doc and update, or create a new one if it doesn't exist
    const userScore = await Score.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { scores: scores } },
      { new: true, upsert: true }
    );

    // Send score report to user's registered email
    let emailStatus = { success: false };
    try {
      const user = await User.findById(req.user.id);
      if (user && user.email) {
        emailStatus = await sendScoreReportEmail({
          user,
          scores,
          analysisName: 'Score Update',
        });
      }
    } catch (mailErr) {
      console.error('[Scores Route] Email sending error:', mailErr.message);
    }

    res.json({
      scores: userScore.scores,
      emailSent: emailStatus.success || false,
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
