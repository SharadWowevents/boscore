const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const { sendScoreReportEmail } = require('../services/emailService');

// GET /api/analysis - Get all history for user
router.get('/', auth, async (req, res) => {
  try {
    const history = await Analysis.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error('Error fetching analysis history:', err);
    res.status(500).send('Server Error');
  }
});

// POST /api/analysis - Create a new analysis record and email score report
router.post('/', auth, async (req, res) => {
  const { name, scores } = req.body;
  try {
    const newAnalysis = new Analysis({
      userId: req.user.id,
      name,
      scores,
    });
    const savedAnalysis = await newAnalysis.save();

    // Automatically send score report to user's registered email via Zoho API
    let emailStatus = { success: false };
    try {
      const user = await User.findById(req.user.id);
      if (user && user.email) {
        emailStatus = await sendScoreReportEmail({
          user,
          scores,
          analysisName: name || savedAnalysis.name,
        });
      }
    } catch (mailErr) {
      console.error('[Analysis Route] Score report email failed:', mailErr.message);
      emailStatus = { success: false, error: mailErr.message };
    }

    const responseObj = savedAnalysis.toObject ? savedAnalysis.toObject() : savedAnalysis;
    res.json({
      ...responseObj,
      emailSent: emailStatus.success || false,
      emailMessage: emailStatus.success ? 'Report sent to your email' : (emailStatus.error || undefined),
    });
  } catch (err) {
    console.error('Error creating analysis:', err);
    res.status(500).send('Server Error');
  }
});

// PUT /api/analysis/:id - Update an existing record and optionally email updated report
router.put('/:id', auth, async (req, res) => {
  const { scores, sendEmail = true } = req.body;
  try {
    let analysis = await Analysis.findOne({ _id: req.params.id, userId: req.user.id });
    if (!analysis) return res.status(404).json({ msg: 'Analysis not found' });

    analysis.scores = scores;
    await analysis.save();

    let emailStatus = { success: false };
    if (sendEmail) {
      try {
        const user = await User.findById(req.user.id);
        if (user && user.email) {
          emailStatus = await sendScoreReportEmail({
            user,
            scores: analysis.scores,
            analysisName: analysis.name,
          });
        }
      } catch (mailErr) {
        console.error('[Analysis Route] Updated report email failed:', mailErr.message);
        emailStatus = { success: false, error: mailErr.message };
      }
    }

    const responseObj = analysis.toObject ? analysis.toObject() : analysis;
    res.json({
      ...responseObj,
      emailSent: emailStatus.success || false,
      emailMessage: emailStatus.success ? 'Report sent to your email' : (emailStatus.error || undefined),
    });
  } catch (err) {
    console.error('Error updating analysis:', err);
    res.status(500).send('Server Error');
  }
});

// POST /api/analysis/:id/send-email - Send or resend score report for a specific analysis
router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.user.id });
    if (!analysis) return res.status(404).json({ msg: 'Analysis not found' });

    const user = await User.findById(req.user.id);
    if (!user || !user.email) {
      return res.status(400).json({ msg: 'User email not found' });
    }

    const emailStatus = await sendScoreReportEmail({
      user,
      scores: analysis.scores,
      analysisName: analysis.name,
    });

    res.json({
      success: true,
      msg: `Score report sent successfully to ${user.email}`,
      email: user.email,
      status: emailStatus,
    });
  } catch (err) {
    console.error('[Analysis Route] Manual email dispatch failed:', err);
    res.status(500).json({ success: false, msg: 'Failed to send report email', error: err.message });
  }
});

// POST /api/analysis/send-report - Send score report directly with provided scores
router.post('/send-report', auth, async (req, res) => {
  const { scores, name } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.email) {
      return res.status(400).json({ msg: 'User email not found' });
    }

    const emailStatus = await sendScoreReportEmail({
      user,
      scores: scores || {},
      analysisName: name || 'Business Owner Score Assessment',
    });

    res.json({
      success: true,
      msg: `Score report sent successfully to ${user.email}`,
      email: user.email,
      status: emailStatus,
    });
  } catch (err) {
    console.error('[Analysis Route] Direct send-report failed:', err);
    res.status(500).json({ success: false, msg: 'Failed to send report email', error: err.message });
  }
});

// DELETE /api/analysis/:id - Delete a record
router.delete('/:id', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!analysis) return res.status(404).json({ msg: 'Analysis not found' });
    res.json({ msg: 'Deleted successfully' });
  } catch (err) {
    console.error('Error deleting analysis:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
