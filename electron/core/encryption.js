const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_ITERATIONS = 100000
const KEY_LENGTH = 32
const KEY_DIGEST = 'sha512'

class Encryption {
  constructor(masterKey) {
    this.masterKey = masterKey || 'default-app-encryption-key-change-me'
  }

  encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH)
    const key = crypto.pbkdf2Sync(this.masterKey, iv.toString('hex'), KEY_ITERATIONS, KEY_LENGTH, KEY_DIGEST)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag().toString('hex')
    return JSON.stringify({ iv: iv.toString('hex'), tag, data: encrypted })
  }

  decrypt(encryptedData) {
    try {
      const { iv, tag, data } = JSON.parse(encryptedData)
      const key = crypto.pbkdf2Sync(this.masterKey, iv, KEY_ITERATIONS, KEY_LENGTH, KEY_DIGEST)
      const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'))
      decipher.setAuthTag(Buffer.from(tag, 'hex'))
      let decrypted = decipher.update(data, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch {
      return null
    }
  }

  encryptField(obj, field) {
    if (!obj[field]) return obj
    return { ...obj, [field]: this.encrypt(String(obj[field])) }
  }

  decryptField(obj, field) {
    if (!obj[field]) return obj
    const decrypted = this.decrypt(obj[field])
    return { ...obj, [field]: decrypted !== null ? decrypted : obj[field] }
  }

  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  generateKey() {
    return crypto.randomBytes(32).toString('hex')
  }
}

class DbEncryption {
  constructor(encryption, getDb) {
    this.encryption = encryption
    this.getDb = getDb
    this.sensitiveTables = ['settings']
    this.sensitiveColumns = {
      settings: ['value'],
    }
  }

  encryptSensitiveData(table, data) {
    const columns = this.sensitiveColumns[table]
    if (!columns) return data
    const encrypted = { ...data }
    for (const col of columns) {
      if (encrypted[col] !== undefined && encrypted[col] !== null) {
        encrypted[col] = this.encryption.encrypt(String(encrypted[col]))
      }
    }
    return encrypted
  }

  decryptSensitiveData(table, data) {
    if (!data) return data
    const columns = this.sensitiveColumns[table]
    if (!columns) return data
    const decrypted = { ...data }
    for (const col of columns) {
      if (decrypted[col] !== undefined && decrypted[col] !== null) {
        const d = this.encryption.decrypt(decrypted[col])
        if (d !== null) decrypted[col] = d
      }
    }
    return decrypted
  }

  isTableEncrypted(table) {
    return this.sensitiveTables.includes(table)
  }
}

module.exports = { Encryption, DbEncryption }
