import { ok, fail, type Result } from '../../shared/result'
import { ProjectNotFoundError } from '../../shared/errors'
import type { Project, ProjectId } from '../../domain/project'
import type { IProjectRepository } from '../../domain/repositories'
import type { AppEventMap } from '../../domain/events'
import type { IEventBus } from '../../shared/event-bus'

export class ArchiveProjectUseCase {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly eventBus: IEventBus<AppEventMap>
  ) {}

  async execute(projectId: ProjectId): Promise<Result<Project, ProjectNotFoundError>> {
    const project = await this.projectRepository.findById(projectId)
    if (!project) return fail(new ProjectNotFoundError(projectId))

    const now = new Date().toISOString()
    const updatedProject: Project = {
      ...project,
      status: 'archived',
      archivedAt: now,
      updatedAt: now,
    }

    await this.projectRepository.save(updatedProject)

    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'project.archived',
      occurredAt: updatedProject.updatedAt,
      workspaceId: updatedProject.workspaceId,
      aggregateId: updatedProject.id,
      payload: {
        projectId: updatedProject.id,
        workspaceId: updatedProject.workspaceId,
        archivedAt: updatedProject.archivedAt!,
      },
    })

    return ok(updatedProject)
  }
}
