import { ok, fail, type Result } from '../../shared/result'
import type { AutomationRule } from '../../domain/automation'
import type { AppEventMap } from '../../domain/events'
import type { IEventBus } from '../../shared/event-bus'

function evaluateConditions(rule: AutomationRule, context: Record<string, unknown>): boolean {
  return rule.conditions.every(condition => {
    switch (condition.type) {
      case 'task.priority.is':
        return context.priority === condition.value
      case 'task.project.is':
        return String(context.projectId) === condition.value
      case 'task.label.has':
        return Array.isArray(context.labels) && (context.labels as string[]).includes(condition.value)
      case 'workspace.is':
        return String(context.workspaceId) === condition.value
      default:
        return false
    }
  })
}

export class RunAutomationUseCase {
  constructor(
    private readonly eventBus: IEventBus<AppEventMap>
  ) {}

  async execute(rule: AutomationRule, context: Record<string, unknown>): Promise<Result<void, Error>> {
    const conditionsMet = evaluateConditions(rule, context)
    if (!conditionsMet) return fail(new Error('Automation conditions not met'))

    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'automation.triggered',
      occurredAt: new Date().toISOString(),
      workspaceId: rule.workspaceId,
      aggregateId: rule.id,
      payload: { ruleId: rule.id, trigger: rule.trigger },
    })

    return ok(undefined)
  }
}
