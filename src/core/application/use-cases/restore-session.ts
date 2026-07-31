import { ok, type Result } from '../../shared/result'
import type { Settings } from '../../domain/settings'

export interface ISettingsRepository {
  load(): Promise<Settings>
  save(settings: Settings): Promise<void>
}

export class RestoreSessionUseCase {
  constructor(
    private readonly settingsRepository: ISettingsRepository
  ) {}

  async execute(): Promise<Result<Settings, Error>> {
    const settings = await this.settingsRepository.load()
    return ok(settings)
  }
}
