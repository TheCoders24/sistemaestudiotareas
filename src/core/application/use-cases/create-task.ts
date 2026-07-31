import { ok, fail, type Result } from '../../shared/result'
import { InvalidTaskTitleError } from '../../shared/errors'
import type { Task, TaskId } from '../../domain/task'
import { createTask } from '../../domain/task'
import type { AppEventMap } from '../../domain/events'
import type { IEventBus } from '../../shared/event-bus'
import { validateCreateTask } from '../validators'
import { ValidationError } from '../../shared/errors'

export interface ITaskRepository {
  save(task: Task): Promise<void>
  getNextId?: () => Promise<TaskId>
}

export class CreateTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus<AppEventMap>
  ) {}

  async execute(input: Record<string, unknown>): Promise<Result<Task, InvalidTaskTitleError | ValidationError>> {
    const issues = validateCreateTask(input)
    if (issues.length > 0) return fail(new ValidationError(issues))

    try {
      const newTask = createTask(input as Parameters<typeof createTask>[0]) as Task
      newTask.id = Date.now()
      await this.taskRepository.save(newTask)

      await this.eventBus.publish({
        id: crypto.randomUUID(),
        type: 'task.created',
        occurredAt: newTask.createdAt,
        workspaceId: newTask.workspaceId,
        aggregateId: newTask.id,
        payload: {
          taskId: newTask.id,
          projectId: newTask.projectId,
          workspaceId: newTask.workspaceId,
        },
      })

      return ok(newTask)
    } catch (err) {
      return fail(new InvalidTaskTitleError())
    }
  }
}
