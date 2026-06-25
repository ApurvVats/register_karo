import CryptoJS from "crypto-js";
import { config } from "../config";

const KEY = config.encryption.key;

export function encrypt(plaintext: string): string {
  return CryptoJS.AES.encrypt(plaintext, KEY).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function maskPan(pan: string): string {
  if (pan.length < 10) return "***INVALID***";
  return pan.slice(0, 5) + "****" + pan.slice(-1);
}