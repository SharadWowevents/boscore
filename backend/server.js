const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Routes
// Note: The local /api/auth route has been deleted. SSO handles this now.
app.use('/api/analysis', require('./routes/analysis'));
// Assuming you have this route hooked up as well based on your scores.js file
app.use('/api/scores', require('./routes/scores')); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));