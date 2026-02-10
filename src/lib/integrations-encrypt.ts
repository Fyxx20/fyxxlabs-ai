/**
 * Chiffrement AES-256-GCM pour les credentials des intégrations (store_integrations.credentials_encrypted).
 * Utilise INTEGRATIONS_ENC_KEY (32 bytes en hex ou base64, ou 32 caractères).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LEN = 32;

function getEncryptionKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENC_KEY;
  if (!raw || raw.length < 16) {
    throw new Error("INTEGRATIONS_ENC_KEY must be set and at least 16 characters (32 bytes recommended)");
  }
  if (Buffer.isBuffer(raw)) return raw as unknown as Buffer;
  const buf = Buffer.from(raw, "utf8");
  if (buf.length >= KEY_LEN) return buf.subarray(0, KEY_LEN);
  return scryptSync(buf, "storepilot-integrations", KEY_LEN);
}

export function encryptCredentials(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptCredentials(cipherText: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(cipherText, "base64");
  if (buf.length < IV_LENGTH + TAG_LENGTH) throw new Error("Invalid credentials payload");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const enc = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}
