const crypto = require('crypto');

const SECRET_SEED = process.env.ENCRYPTION_KEY || 'modest_restaurant_production_encryption_secret_key_2026';
// Create a guaranteed 32-byte key from seed using SHA-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(String(SECRET_SEED)).digest();
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed. API keys might be corrupted or key mismatches:', error.message);
    return '*** DECRYPTION ERROR ***';
  }
}

module.exports = { encrypt, decrypt };
