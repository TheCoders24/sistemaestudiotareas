function register(ipcMain, { getStmt, automationEngine, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'automation:list', schemas.automation.list, (wsId) => {
    const rows = getStmt('SELECT * FROM automation_rules WHERE workspace_id = ? ORDER BY name ASC').all(wsId || 0)
    return rows.map(r => ({
      ...r,
      conditions: JSON.parse(r.conditions_json || '[]'),
      actions: JSON.parse(r.actions_json || '[]'),
    }))
  })
  safeHandle(ipcMain, 'automation:create', z.object({
    workspaceId: z.number(),
    name: z.string().min(1).max(500),
    trigger: z.string(),
    conditions: z.any().optional(),
    actions: z.any().optional(),
  }).passthrough(), (data) => {
    const result = getStmt('INSERT INTO automation_rules (workspace_id, name, trigger, conditions_json, actions_json) VALUES (?, ?, ?, ?, ?)').run(
      data.workspaceId, data.name, data.trigger, JSON.stringify(data.conditions || []), JSON.stringify(data.actions || [])
    )
    const rule = getStmt('SELECT * FROM automation_rules WHERE id = ?').get(result.lastInsertRowid)
    automationEngine?.addRule(rule)
    return rule
  })
  safeHandle(ipcMain, 'automation:update', schemas.automation.update, ({ id, data }) => {
    const sets = []
    const params = {}
    if (data.name !== undefined) { sets.push('name = @name'); params.name = data.name }
    if (data.enabled !== undefined) { sets.push('enabled = @enabled'); params.enabled = data.enabled ? 1 : 0 }
    if (data.trigger !== undefined) { sets.push('trigger = @trigger'); params.trigger = data.trigger }
    if (data.conditions !== undefined) { sets.push('conditions_json = @conditions_json'); params.conditions_json = JSON.stringify(data.conditions) }
    if (data.actions !== undefined) { sets.push('actions_json = @actions_json'); params.actions_json = JSON.stringify(data.actions) }
    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')")
      getStmt(`UPDATE automation_rules SET ${sets.join(', ')} WHERE id = @id`).run({ ...params, id })
    }
    return getStmt('SELECT * FROM automation_rules WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'automation:delete', schemas.automation.delete, (id) => {
    getStmt('DELETE FROM automation_rules WHERE id = ?').run(id)
    automationEngine?.removeRule(id)
    return true
  })
}

module.exports = { register }
