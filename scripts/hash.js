// Generate a bcrypt hash:  node scripts/hash.js "mypassword"
const bcrypt = require('bcrypt');
const pw = process.argv[2] || '12345678';
bcrypt.hash(pw, 10).then((h) => console.log(h));
