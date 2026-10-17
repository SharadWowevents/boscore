const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const PASSWORD_RESET_TTL_MS = 5 * 60 * 1000;

const getMailTransport = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !process.env.ADMIN_EMAIL) {
    throw new Error('Password reset email is not configured');
  }
  const port = Number(SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP port is invalid');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password, mobile } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ name, email, password, mobile });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, mobile } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ msg: 'Email is required' });
  }

  try {
    const mailTransport = getMailTransport();
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) throw new Error('Frontend URL is not configured');
    const resetUrl = new URL('/', frontendUrl);
    if (!['http:', 'https:'].includes(resetUrl.protocol)) {
      throw new Error('Frontend URL must use HTTP or HTTPS');
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ msg: 'If an account with that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await user.save();

    resetUrl.searchParams.set('resetToken', resetToken);

    try {
      await mailTransport.sendMail({
        from: process.env.ADMIN_EMAIL,
        to: user.email,
        subject: 'Reset your WOWOS FAST TRACK password',
        text: `Use this link to reset your password. It expires in 5 minutes:\n\n${resetUrl.toString()}`,
        html: `<p>Use the link below to reset your password. It expires in 5 minutes.</p><p><a href="${resetUrl.toString()}">Reset password</a></p>`,
      });
    } catch (err) {
      await User.updateOne(
        { _id: user._id, resetPasswordToken: resetTokenHash },
        { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
      );
      throw err;
    }

    res.json({ msg: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Password reset email failed:', err);
    res.status(500).json({ msg: 'Unable to send password reset email' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const token = req.body?.token;
  const password = req.body?.password;
  if (typeof token !== 'string' || !token || typeof password !== 'string' || !password) {
    return res.status(400).json({ msg: 'Reset token and new password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ msg: 'Password must be at least 8 characters' });
  }

  try {
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const user = await User.findOneAndUpdate({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }, {
      $set: { password: hashedPassword },
      $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 },
    });

    if (!user) return res.status(400).json({ msg: 'Reset link is invalid or has expired' });

    res.json({ msg: 'Password reset successfully' });
  } catch (err) {
    console.error('Password reset failed:', err);
    res.status(500).json({ msg: 'Unable to reset password' });
  }
});

module.exports = router;