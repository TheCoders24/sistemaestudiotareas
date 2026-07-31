import { ok, fail, type Result } from '../../shared/result'
import { TaskNotFoundError } from '../../shared/errors'
import type { Task, TaskId } from '../../domain/task'
import { completeTask, uncompleteTask } from '../../domain/task'
import type { AppEventMap } from '../../domain/events'
import type { IEventBus } from '../../shared/event-bus'

export interface ITaskRepository {
  findById(id: TaskId): Promise<Task | null>
  save(task: Task): Promise<void>
}

export class CompleteTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus<AppEventMap>
  ) {}

  async execute(taskId: TaskId): Promise<Result<Task, TaskNotFoundError>> {
    const task = await this.taskRepository.findById(taskId)
    if (!task) return fail(new TaskNotFoundError(taskId))
    if (task.completedAt !== null) return ok(task)

    const updatedTask = completeTask(task)
    await this.taskRepository.save(updatedTask)

    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'task.completed',
      occurredAt: updatedTask.updatedAt,
      workspaceId: updatedTask.workspaceId,
      aggregateId: updatedTask.id,
      payload: {
        taskId: updatedTask.id,
        projectId: updatedTask.projectId,
        workspaceId: updatedTask.workspaceId,
        completedAt: updatedTask.completedAt!,
      },
    })

    return ok(updatedTask)
  }
}

export class UncompleteTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus<AppEventMap>
  ) {}

  async execute(taskId: TaskId): Promise<Result<Task, TaskNotFoundError>> {
    const task = await this.taskRepository.findById(taskId)
    if (!task) return fail(new TaskNotFoundError(taskId))
    if (task.completedAt === null) return ok(task)

    const updatedTask = uncompleteTask(task)
    await this.taskRepository.save(updatedTask)

    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'task.uncompleted',
      occurredAt: updatedTask.updatedAt,
      workspaceId: updatedTask.workspaceId,
      aggregateId: updatedTask.id,
      payload: { taskId: updatedTask.id, workspaceId: updatedTask.workspaceId },
    })

    return ok(updatedTask)
  }
}
