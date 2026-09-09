const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true // One score document per user
  },
  scores: { 
    type: Map, 
    of: Number, // Stores data like { "biz_0": 5, "ppl_2": 3 }
    default: {} 
  }
}, { timestamps: true });

module.exports = mongoose.model('Score', ScoreSchema);