import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI is not set');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri, {
      // Read from primary so students/teachers see new quizzes right after create/publish (avoids replica lag).
      readPreference: 'primary',
      serverSelectionTimeoutMS: 30_000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
