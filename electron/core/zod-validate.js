const { z } = require('zod')
const { ValidationError } = require('./result')

function validateWithZod(schema) {
  return (handler) => {
    return async (event, input) => {
      const parsed = schema.safeParse(input ?? {})
      if (!parsed.success) {
        const issues = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
        throw new ValidationError(issues)
      }
      return handler(event, parsed.data)
    }
  }
}

const notificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  severity: z.enum(['info', 'warning', 'error', 'success']).optional().default('info'),
})

const sessionStateSchema = z.object({
  activeTab: z.string().optional(),
  sidebarOpen: z.boolean().optional(),
  scrollPositions: z.record(z.number()).optional(),
}).passthrough()

const linkEntitiesSchema = z.object({
  fromType: z.string().min(1),
  fromId: z.number().int().positive(),
  toType: z.string().min(1),
  toId: z.number().int().positive(),
})

module.exports = { validateWithZod, notificationSchema, sessionStateSchema, linkEntitiesSchema }
