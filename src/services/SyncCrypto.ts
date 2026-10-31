export class SyncCrypto {
  private static hexToBytes(hex: string): Uint8Array {
    const clean = hex.trim()
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
    }
    return bytes
  }

  private static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  static generateRandomSecret(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return this.bytesToHex(bytes)
  }

  /**
   * Derive dual keys 1:1 Android/iOS:
   * K_enc = HMAC-SHA256(syncSecret, "puki_encryption_v1")
   * K_auth = HMAC-SHA256(syncSecret, "puki_auth_v1")
   * authVerifier = hex(K_auth)
   */
  static async deriveKeys(syncSecret: string): Promise<{ kEnc: CryptoKey; kAuth: CryptoKey; authVerifier: string }> {
    const secretBytes = this.hexToBytes(syncSecret)
    const masterKey = await crypto.subtle.importKey(
      'raw',
      secretBytes.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const encBytes = new Uint8Array(await crypto.subtle.sign('HMAC', masterKey, new TextEncoder().encode('puki_encryption_v1')))
    const authBytes = new Uint8Array(await crypto.subtle.sign('HMAC', masterKey, new TextEncoder().encode('puki_auth_v1')))

    const kEnc = await crypto.subtle.importKey(
      'raw',
      encBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    )

    const kAuth = await crypto.subtle.importKey(
      'raw',
      authBytes.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const authVerifier = this.bytesToHex(authBytes)

    return { kEnc, kAuth, authVerifier }
  }

  /**
   * AES-256-GCM Wire Format:
   * [12 bytes IV] + [Ciphertext + 16 bytes Tag] -> Base64
   */
  static async encryptPayload(plaintext: string, kEnc: CryptoKey): Promise<string> {
    const iv = new Uint8Array(12)
    crypto.getRandomValues(iv)

    const encoded = new TextEncoder().encode(plaintext)
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      kEnc,
      encoded
    )

    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(cipherBuffer), iv.length)

    // Convert to Base64
    let binary = ''
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i])
    }
    return btoa(binary)
  }

  static async decryptPayload(cipherBase64: string, kEnc: CryptoKey): Promise<string> {
    const binary = atob(cipherBase64.trim())
    const combined = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i)
    }

    if (combined.length < 28) {
      throw new Error('Invalid encrypted payload size')
    }

    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      kEnc,
      ciphertext
    )

    return new TextDecoder().decode(decryptedBuffer)
  }

  static async computeSignature(message: string, kAuth: CryptoKey): Promise<string> {
    const sigBuffer = await crypto.subtle.sign('HMAC', kAuth, new TextEncoder().encode(message))
    return this.bytesToHex(new Uint8Array(sigBuffer))
  }
}
