const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
  userId: { 
    type: String, // Changed to String to hold the SSO ID
    required: true
  },
  name: { 
    type: String, 
    required: true 
  }, // We will store the Date/Time string here
  scores: { 
    type: Map, 
    of: Number, 
    default: {} 
  }
}, { timestamps: true });

module.exports = mongoose.model('Score', ScoreSchema);