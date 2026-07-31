const crypto = require('crypto')

const ITERATIONS = 100000
const KEY_LENGTH = 64
const DIGEST = 'sha512'
const SALT_LENGTH = 32

class PinLock {
  constructor(getSetting, setSetting) {
    this.getSetting = getSetting
    this.setSetting = setSetting
    this.locked = false
    this.maxAttempts = 5
    this.lockoutMinutes = 15
    this.failedAttempts = 0
  }

  isEnabled() {
    const hash = this.getSetting('pin_hash')
    const salt = this.getSetting('pin_salt')
    return !!(hash && salt)
  }

  isLocked() {
    if (this.locked) return true
    const lockoutUntil = this.getSetting('pin_lockout_until')
    if (lockoutUntil && Date.parse(lockoutUntil) > Date.now()) {
      this.locked = true
      return true
    }
    this.failedAttempts = parseInt(this.getSetting('pin_failed_attempts') || '0', 10)
    return false
  }

  async setPin(pin) {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex')
    const hash = await this.hashPin(pin, salt)
    this.setSetting('pin_hash', hash)
    this.setSetting('pin_salt', salt)
    this.setSetting('pin_failed_attempts', '0')
    this.setSetting('pin_lockout_until', null)
    this.failedAttempts = 0
    this.locked = false
    return true
  }

  async verify(pin) {
    const hash = this.getSetting('pin_hash')
    const salt = this.getSetting('pin_salt')
    if (!hash || !salt) return { ok: true, message: 'PIN no configurado' }

    const lockoutUntil = this.getSetting('pin_lockout_until')
    if (lockoutUntil && Date.parse(lockoutUntil) > Date.now()) {
      const remaining = Math.ceil((Date.parse(lockoutUntil) - Date.now()) / 60000)
      return { ok: false, message: `Demasiados intentos. Intente de nuevo en ${remaining} minuto(s).`, locked: true }
    }

    const computedHash = await this.hashPin(pin, salt)
    if (computedHash === hash) {
      this.setSetting('pin_failed_attempts', '0')
      this.setSetting('pin_lockout_until', null)
      this.failedAttempts = 0
      this.locked = false
      return { ok: true }
    }

    this.failedAttempts = parseInt(this.getSetting('pin_failed_attempts') || '0', 10) + 1
    this.setSetting('pin_failed_attempts', String(this.failedAttempts))

    if (this.failedAttempts >= this.maxAttempts) {
      const until = new Date(Date.now() + this.lockoutMinutes * 60 * 1000).toISOString()
      this.setSetting('pin_lockout_until', until)
      this.locked = true
      return { ok: false, message: `Demasiados intentos. Bloqueado por ${this.lockoutMinutes} minutos.`, locked: true }
    }

    const remaining = this.maxAttempts - this.failedAttempts
    return { ok: false, message: `PIN incorrecto. ${remaining} intento(s) restante(s).` }
  }

  disable() {
    this.setSetting('pin_hash', null)
    this.setSetting('pin_salt', null)
    this.setSetting('pin_failed_attempts', '0')
    this.setSetting('pin_lockout_until', null)
    this.failedAttempts = 0
    this.locked = false
    return true
  }

  hashPin(pin, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(pin, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey.toString('hex'))
      })
    })
  }
}

module.exports = { PinLock }
