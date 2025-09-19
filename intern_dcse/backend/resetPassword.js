require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the faculty1 user
    const user = await User.findOne({ username: 'faculty1' });
    if (!user) {
      console.log('User faculty1 not found');
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('faculty123', salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    console.log('Password for faculty1 has been reset to: faculty123');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

resetPassword(); 