export interface ICommand {
  execute(): Promise<void>
  undo(): Promise<void>
}

export class CommandHistory {
  private readonly undoStack: ICommand[] = []
  private readonly redoStack: ICommand[] = []

  push(command: ICommand): void {
    this.undoStack.push(command)
    this.redoStack.length = 0
  }

  async undo(): Promise<boolean> {
    const command = this.undoStack.pop()
    if (!command) return false
    await command.undo()
    this.redoStack.push(command)
    return true
  }

  async redo(): Promise<boolean> {
    const command = this.redoStack.pop()
    if (!command) return false
    await command.execute()
    this.undoStack.push(command)
    return true
  }

  async execute(command: ICommand): Promise<void> {
    await command.execute()
    this.push(command)
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }
}
