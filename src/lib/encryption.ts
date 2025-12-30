/**
 * Client-side encryption utilities
 * Uses XOR cipher matching the server-side edge function
 * This eliminates the need for edge function calls for encryption/decryption
 */

let encryptionKey: string | null = null;

/**
 * Set the encryption key (fetched from server once per session)
 */
export function setEncryptionKey(key: string): void {
  encryptionKey = key;
}

/**
 * Check if encryption key is available
 */
export function hasEncryptionKey(): boolean {
  return encryptionKey !== null && encryptionKey.length > 0;
}

/**
 * Clear the encryption key (on logout)
 */
export function clearEncryptionKey(): void {
  encryptionKey = null;
}

/**
 * XOR encrypt a string and return base64-encoded result with ENC: prefix
 */
export function encrypt(text: string): string {
  if (!text || !encryptionKey) return text;
  
  // Already encrypted
  if (text.startsWith('ENC:')) return text;
  
  try {
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(encryptionKey);
    const result = new Uint8Array(textBytes.length);
    
    for (let i = 0; i < textBytes.length; i++) {
      result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...result));
    return 'ENC:' + base64;
  } catch (err) {
    console.warn('Encryption error:', err);
    return text;
  }
}

/**
 * Decrypt a base64-encoded XOR encrypted string (with ENC: prefix)
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptionKey) return encryptedText;
  
  // Not encrypted
  if (!encryptedText.startsWith('ENC:')) return encryptedText;
  
  try {
    const base64Data = encryptedText.slice(4); // Remove 'ENC:' prefix
    const encryptedBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(encryptionKey);
    const result = new Uint8Array(encryptedBytes.length);
    
    for (let i = 0; i < encryptedBytes.length; i++) {
      result[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(result);
  } catch (err) {
    console.warn('Decryption error:', err);
    return encryptedText;
  }
}

/**
 * Encrypt phone and email fields in an object
 */
export function encryptFields<T extends { phone?: string; email?: string }>(data: T): T {
  if (!hasEncryptionKey()) return data;
  
  return {
    ...data,
    phone: data.phone ? encrypt(data.phone) : data.phone,
    email: data.email ? encrypt(data.email) : data.email,
  };
}

/**
 * Decrypt phone and email fields in an object
 */
export function decryptFields<T extends { phone?: string; email?: string }>(data: T): T {
  if (!hasEncryptionKey()) return data;
  
  return {
    ...data,
    phone: data.phone ? decrypt(data.phone) : data.phone,
    email: data.email ? decrypt(data.email) : data.email,
  };
}

/**
 * Encrypt phone and email fields in a batch of records
 */
export function encryptBatch<T extends { phone?: string; email?: string }>(records: T[]): T[] {
  if (!hasEncryptionKey() || records.length === 0) return records;
  return records.map(encryptFields);
}

/**
 * Decrypt phone and email fields in a batch of records
 */
export function decryptBatch<T extends { phone?: string; email?: string }>(records: T[]): T[] {
  if (!hasEncryptionKey() || records.length === 0) return records;
  return records.map(decryptFields);
}
