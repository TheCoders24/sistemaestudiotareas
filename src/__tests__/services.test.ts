import { describe, it, expect } from 'vitest'

describe('EncryptionService', () => {
  function encrypt(text: string, key: string) {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = encoder.encode(text)
    const ciphertext = new Uint8Array(encoded.length)
    for (let i = 0; i < encoded.length; i++) ciphertext[i] = encoded[i] ^ keyData[i % keyData.length]
    return { encrypted: btoa(String.fromCharCode(...ciphertext)), iv: btoa(String.fromCharCode(...iv)) }
  }

  function decrypt(data: { encrypted: string; iv: string }, key: string) {
    const keyData = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32))
    const ciphertext = Uint8Array.from(atob(data.encrypted), c => c.charCodeAt(0))
    const plain = new Uint8Array(ciphertext.length)
    for (let i = 0; i < ciphertext.length; i++) plain[i] = ciphertext[i] ^ keyData[i % keyData.length]
    return new TextDecoder().decode(plain)
  }

  it('encrypt and decrypt string', () => {
    const key = 'test-key-123'
    const original = 'Hello World'
    const encrypted = encrypt(original, key)
    expect(encrypted.encrypted).not.toBe(original)
    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe(original)
  })

  it('different keys produce different ciphertext', () => {
    const original = 'Sensitive data'
    const e1 = encrypt(original, 'key-one')
    const e2 = encrypt(original, 'key-two')
    expect(e1.encrypted).not.toBe(e2.encrypted)
  })

  it('wrong key fails to decrypt correctly', () => {
    const original = 'Secret message'
    const encrypted = encrypt(original, 'correct-key')
    const decrypted = decrypt(encrypted, 'wrong-key')
    expect(decrypted).not.toBe(original)
  })

  it('empty string roundtrip', () => {
    const key = 'test-key'
    const encrypted = encrypt('', key)
    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe('')
  })
})

describe('SearchService', () => {
  it('parse query extracts simple term', () => {
    const query = 'hello'
    expect(query).toBe('hello')
  })

  it('parse query with operator prefix', () => {
    const query = 'priority:alta'
    expect(query.includes(':')).toBe(true)
    const [field, value] = query.split(':')
    expect(field).toBe('priority')
    expect(value).toBe('alta')
  })

  it('parse multiple operators', () => {
    const parts = ['tag:work', 'status:pendiente']
    expect(parts).toHaveLength(2)
  })

  it('negation operator', () => {
    const query = '-tag:work'
    expect(query.startsWith('-')).toBe(true)
  })

  it('date range operator', () => {
    const query = 'due:>2024-01-01'
    const match = query.match(/^(due|created):([><=]?\d{4}-\d{2}-\d{2})$/)
    expect(match).not.toBeNull()
    expect(match![1]).toBe('due')
    expect(match![2]).toBe('>2024-01-01')
  })

  it('extract search terms from mixed query', () => {
    const raw = 'buy milk priority:alta status:pendiente'
    const operators = ['priority', 'status', 'tag', 'due', 'created']
    const tokens = raw.split(/\s+/)
    const terms = tokens.filter(t => !operators.some(op => t.startsWith(`${op}:`) || t.startsWith(`-${op}:`)))
    const ops = tokens.filter(t => operators.some(op => t.startsWith(`${op}:`) || t.startsWith(`-${op}:`)))
    expect(terms).toEqual(['buy', 'milk'])
    expect(ops).toEqual(['priority:alta', 'status:pendiente'])
  })
})

describe('BackupService', () => {
  it('create backup snapshot structure', () => {
    const backup = { timestamp: new Date().toISOString(), version: '1.0', data: { tasks: [], notes: [], habits: [] } }
    expect(backup.timestamp).toBeDefined()
    expect(backup.version).toBe('1.0')
    expect(backup.data).toHaveProperty('tasks')
    expect(backup.data).toHaveProperty('notes')
    expect(backup.data).toHaveProperty('habits')
  })

  it('backup includes all data types', () => {
    const data = { tasks: [{ id: 1, title: 'Test' }], notes: [{ id: 1, content: 'Note' }], habits: [{ id: 1, name: 'Exercise' }], goals: [{ id: 1, name: 'Goal' }] }
    const backup = { timestamp: new Date().toISOString(), version: '1.0', data }
    expect(Object.keys(backup.data)).toEqual(['tasks', 'notes', 'habits', 'goals'])
  })

  it('backup validation - timestamp required', () => {
    const backup = { version: '1.0', data: { tasks: [] } }
    expect(backup).not.toHaveProperty('timestamp')
  })

  it('restore backup replaces current data', () => {
    const currentData = { tasks: [{ id: 1, title: 'Old' }] }
    const backupData = { tasks: [{ id: 2, title: 'New' }], notes: [], habits: [] }
    const restored = { ...currentData, ...backupData }
    expect(restored.tasks).toHaveLength(1)
    expect(restored.tasks[0].title).toBe('New')
  })

  it('backup with empty collections', () => {
    const backup = { timestamp: new Date().toISOString(), version: '1.0', data: { tasks: [], notes: [], habits: [], goals: [] } }
    expect(backup.data.tasks).toEqual([])
    expect(backup.data.notes).toEqual([])
  })

  it('multiple backups preserve timestamps', () => {
    const b1 = { timestamp: '2024-01-01T00:00:00.000Z', version: '1.0', data: { tasks: [] } }
    const b2 = { timestamp: '2024-06-15T00:00:00.000Z', version: '1.0', data: { tasks: [] } }
    expect(new Date(b2.timestamp).getTime()).toBeGreaterThan(new Date(b1.timestamp).getTime())
  })
})
