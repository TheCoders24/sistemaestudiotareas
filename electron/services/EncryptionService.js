const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

class EncryptionService {
  constructor(masterKey) {
    this.masterKey = masterKey || this._generateKey()
  }

  _generateKey() {
    return crypto.randomBytes(KEY_LENGTH)
  }

  encrypt(plaintext) {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')
    return JSON.stringify({ iv: iv.toString('hex'), encrypted, authTag })
  }

  decrypt(ciphertext) {
    try {
      const { iv, encrypted, authTag } = JSON.parse(ciphertext)
      const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, Buffer.from(iv, 'hex'))
      decipher.setAuthTag(Buffer.from(authTag, 'hex'))
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch {
      return null
    }
  }

  encryptSettings(settings) {
    const encrypted = {}
    for (const [key, value] of Object.entries(settings)) {
      if (this._isSensitive(key)) {
        encrypted[key] = this.encrypt(String(value))
      } else {
        encrypted[key] = value
      }
    }
    return encrypted
  }

  _isSensitive(key) {
    const sensitiveKeys = ['api_key', 'api_secret', 'token', 'password', 'secret', 'encryption_key']
    return sensitiveKeys.some(s => key.toLowerCase().includes(s))
  }

  getKey() { return this.masterKey }
}

module.exports = { EncryptionService }
