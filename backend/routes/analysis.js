const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Analysis = require('../models/Analysis');

// GET /api/analysis - Get all history for user
router.get('/', auth, async (req, res) => {
  try {
    const history = await Analysis.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// POST /api/analysis - Create a new analysis record
router.post('/', auth, async (req, res) => {
  const { name, scores } = req.body;
  try {
    const newAnalysis = new Analysis({
      userId: req.user.id,
      name,
      scores
    });
    const savedAnalysis = await newAnalysis.save();
    res.json(savedAnalysis);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// PUT /api/analysis/:id - Update an existing record
router.put('/:id', auth, async (req, res) => {
  const { scores } = req.body;
  try {
    let analysis = await Analysis.findOne({ _id: req.params.id, userId: req.user.id });
    if (!analysis) return res.status(404).json({ msg: 'Analysis not found' });

    analysis.scores = scores;
    await analysis.save();
    res.json(analysis);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// DELETE /api/analysis/:id - Delete a record
router.delete('/:id', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!analysis) return res.status(404).json({ msg: 'Analysis not found' });
    res.json({ msg: 'Deleted successfully' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;