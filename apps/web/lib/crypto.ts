import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard IV length

export function encryptToken(token: string): string {
  if (!token) return '';
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex string');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Format: iv:encrypted:tag (all hex encoded)
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

export function decryptToken(encryptedString: string): string {
  if (!encryptedString) return '';
  
  // Fallback for existing plaintext tokens or invalid formats
  if (!encryptedString.includes(':')) {
    return encryptedString;
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    return encryptedString;
  }

  const [ivHex, encryptedHex, tagHex] = parts;
  if (!ivHex || !encryptedHex || !tagHex) {
    return encryptedString;
  }

  try {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
      throw new Error('ENCRYPTION_KEY is not defined in environment variables');
    }
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be a 32-byte hex string');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // If decryption fails, log it and return as is to maintain stability for existing data
    console.error('Failed to decrypt token, returning original string:', error);
    return encryptedString;
  }
}
