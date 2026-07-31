function activate(context) {
  context.log.info('Plugin de ejemplo activado!')
  if (context.eventBus && context.eventBus.subscribe) {
    context.eventBus.subscribe('task.completed', (event) => {
      context.log.info('Tarea completada:', event.payload.taskId)
    })
  }
}

function deactivate(context) {
  context.log.info('Plugin de ejemplo desactivado')
}

module.exports = { activate, deactivate }
