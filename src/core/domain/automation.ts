export type AutomationTrigger =
  | 'task.completed'
  | 'task.due'
  | 'task.created'
  | 'project.completed'
  | 'date.reached'

export type AutomationCondition =
  | { type: 'task.priority.is'; value: string }
  | { type: 'task.project.is'; value: string }
  | { type: 'task.label.has'; value: string }
  | { type: 'workspace.is'; value: string }

export type AutomationAction =
  | { type: 'task.move.column'; value: string }
  | { type: 'task.set.priority'; value: string }
  | { type: 'task.set.color'; value: string }
  | { type: 'task.create'; value: { title: string } }
  | { type: 'project.archive' }
  | { type: 'notification.show'; value: string }

export interface AutomationRule {
  id: string
  workspaceId: number
  name: string
  enabled: boolean
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  createdAt: string
  updatedAt: string
}

export interface AutomationEngine {
  evaluate(rule: AutomationRule, context: Record<string, unknown>): boolean
  execute(rule: AutomationRule, context: Record<string, unknown>): Promise<void>
}
