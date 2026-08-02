export interface EncryptedPayload {
  encryptedValue: string;
  iv: string;
  authTag: string;
  keyVersion: number;
  algorithm: string;
}

export interface DecryptPayload {
  encryptedValue: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

export interface ISecretEncryptionProvider {
  encrypt(plainText: string): Promise<EncryptedPayload>;
  decrypt(payload: DecryptPayload): Promise<string>;
  rotateKey(payload: DecryptPayload, targetVersion: number): Promise<EncryptedPayload>;
  getCurrentKeyVersion(): number;
}
