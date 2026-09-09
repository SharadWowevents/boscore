const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
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

module.exports = mongoose.model('Analysis', AnalysisSchema);