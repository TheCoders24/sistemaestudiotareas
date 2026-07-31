import { ok, fail, type Result } from '../../shared/result'
import type { KanbanCard, KanbanCardId } from '../../domain/kanban'
import type { KanbanColumnId } from '../../domain/kanban'
import type { IKanbanCardRepository } from '../../domain/repositories'
import type { AppEventMap } from '../../domain/events'
import type { IEventBus } from '../../shared/event-bus'

export class MoveKanbanCardUseCase {
  constructor(
    private readonly kanbanCardRepository: IKanbanCardRepository,
    private readonly eventBus: IEventBus<AppEventMap>
  ) {}

  async execute(cardId: KanbanCardId, toColumnId: KanbanColumnId, position: number): Promise<Result<KanbanCard, Error>> {
    const card = await this.kanbanCardRepository.findById(cardId)
    if (!card) return fail(new Error(`Kanban card not found: ${cardId}`))

    const fromColumnId = card.columnId
    const updatedCard: KanbanCard = {
      ...card,
      columnId: toColumnId,
      position,
      updatedAt: new Date().toISOString(),
    }

    await this.kanbanCardRepository.save(updatedCard)

    await this.eventBus.publish({
      id: crypto.randomUUID(),
      type: 'kanban.card.moved',
      occurredAt: updatedCard.updatedAt,
      aggregateId: updatedCard.id,
      payload: {
        taskId: updatedCard.taskId!,
        fromColumnId,
        toColumnId,
        position,
      },
    })

    return ok(updatedCard)
  }
}
