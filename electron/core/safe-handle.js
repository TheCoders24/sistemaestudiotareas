const logger = require('./logger')

const registeredIpcChannels = new Set()
const z = require('zod')

function safeHandle(ipcMain, channel, schema, handlerFn) {
  if (registeredIpcChannels.has(channel)) {
    logger.warn('IPC channel already registered, replacing:', channel)
    ipcMain.removeHandler(channel)
  }
  registeredIpcChannels.add(channel)

  ipcMain.handle(channel, async (event, ...args) => {
    const asObject = args.reduce((o, v, i) => { o[i] = v; return o }, {})
    const candidates = args.length === 0
      ? [undefined]
      : args.length === 1
        ? [args[0], asObject]
        : [asObject]
    let parsed = schema.safeParse(candidates[0])
    if (!parsed.success && candidates[1] !== undefined) {
      parsed = schema.safeParse(candidates[1])
    }
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new Error(`Validación falló en ${channel}: ${issues}`)
    }
    try {
      return await Promise.resolve(handlerFn(parsed.data, event))
    } catch (err) {
      logger.error(`Error en handler ${channel}:`, err)
      throw err
    }
  })
}

function voidSchema() {
  return z.undefined().or(z.object({}).passthrough()).optional()
}

module.exports = { safeHandle, voidSchema, z }
