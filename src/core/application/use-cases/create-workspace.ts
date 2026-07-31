import { ok, fail, type Result } from '../../shared/result'
import { ValidationError } from '../../shared/errors'
import type { Workspace } from '../../domain/workspace'
import { createWorkspace as buildWorkspace } from '../../domain/workspace'
import type { IWorkspaceRepository } from '../../domain/repositories'
import type { AppEventMap } from '../../domain/events'
import type { IEventBus } from '../../shared/event-bus'

export class CreateWorkspaceUseCase {
  constructor(
    private readonly workspaceRepository: IWorkspaceRepository,
    private readonly eventBus: IEventBus<AppEventMap>
  ) {}

  async execute(input: { name: string; color?: string; icon?: string; theme?: string }): Promise<Result<Workspace, ValidationError>> {
    if (!input.name || input.name.trim().length === 0) {
      return fail(new ValidationError([{ path: 'name', message: 'Workspace name is required' }]))
    }

    const newWorkspace = buildWorkspace(input as Parameters<typeof buildWorkspace>[0]) as Workspace
    newWorkspace.id = Date.now()

    await this.workspaceRepository.save(newWorkspace)

    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'workspace.created',
      occurredAt: newWorkspace.createdAt,
      workspaceId: newWorkspace.id,
      aggregateId: newWorkspace.id,
      payload: { workspaceId: newWorkspace.id, name: newWorkspace.name },
    })

    return ok(newWorkspace)
  }
}
