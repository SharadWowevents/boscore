const mongoose = require('mongoose');

// Base connection URI without the database name (e.g. mongodb://localhost:27017)
// If your MONGO_URI in .env has /boscore, we replace it or point directly to usersdb
const centralConn = mongoose.createConnection(
  process.env.USERS_DB_URI || 'mongodb://localhost:27017/usersdb'
);

const CentralUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true }
}, { timestamps: true });

module.exports = centralConn.model('User', CentralUserSchema);