// scripts/hash-password.mjs
import bcrypt from 'bcryptjs'; // Using bcryptjs as it's already in package.json

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}

// Use a salt round that matches the application's configuration.
// 10 is a common default. Ensure this matches the application's bcrypt salt rounds.
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }
  console.log(hash);
});
