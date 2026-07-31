module.exports = { register }

function register(ipcMain, { getStmt, safeHandle, schemas, voidSchema, z }) {
  function getWeekStart() {
    const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff)).toISOString().split('T')[0]
  }

  function updateChallengeProgress(type, amount) {
    try {
      const weekStart = getWeekStart()
      const challenges = getStmt('SELECT * FROM challenges WHERE requirement_type = ?').all(type)
      for (const c of challenges) {
        let uc = getStmt('SELECT * FROM user_challenges WHERE challenge_id = ? AND week_start = ?').get(c.id, weekStart)
        if (!uc) {
          getStmt('INSERT INTO user_challenges (challenge_id, progress, week_start) VALUES (?, ?, ?)').run(c.id, amount, weekStart)
          uc = { progress: amount }
        } else {
          const newProgress = uc.progress + amount
          getStmt('UPDATE user_challenges SET progress = ? WHERE id = ?').run(newProgress, uc.id)
          uc.progress = newProgress
        }
        if (!uc.completed && uc.progress >= c.requirement_count) {
          getStmt("UPDATE user_challenges SET completed = 1, completed_at = datetime('now') WHERE id = ?").run(uc.id)
          addXp(c.xp_reward, `desafío: ${c.name}`)
          const achievement = getStmt("SELECT * FROM achievements WHERE key = 'first_weekly_challenge'").get()
          if (achievement) {
            const already = getStmt('SELECT id FROM user_achievements WHERE achievement_id = ?').get(achievement.id)
            if (!already) {
              getStmt('INSERT INTO user_achievements (achievement_id) VALUES (?)').run(achievement.id)
              if (achievement.xp_reward > 0) addXp(achievement.xp_reward, `logro: ${achievement.name}`)
            }
          }
        }
      }
    } catch (e) { console.error('[ChallengeProgress]', e) }
  }

  function addXp(amount, reason) {
    const oldTotal = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get().total
    getStmt('INSERT INTO xp_log (amount, reason) VALUES (?, ?)').run(amount, reason)
    const totalRow = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get()
    const total = totalRow.total
    const level = Math.floor(total / 100) + 1
    const oldLevel = Math.floor(oldTotal / 100) + 1
    const nextLevelXp = level * 100
    const currentXp = total - ((level - 1) * 100)
    updateChallengeProgress('xp', amount)
    return { total, level, currentXp, nextLevelXp, leveledUp: level > oldLevel }
  }

  safeHandle(ipcMain, 'xp:get', voidSchema(), () => {
    const totalRow = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get()
    const total = totalRow.total
    const level = Math.floor(total / 100) + 1
    return { total, level, currentXp: total - ((level - 1) * 100), nextLevelXp: level * 100 }
  })

  safeHandle(ipcMain, 'xp:add', schemas.gamification.xp.add, ({ amount, reason }) => addXp(amount, reason))

  safeHandle(ipcMain, 'xp:getHistory', schemas.gamification.xp.history, (days = 7) => {
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    return getStmt("SELECT date(created_at) as date, SUM(amount) as xp FROM xp_log WHERE created_at >= ? GROUP BY date(created_at) ORDER BY date").all(since)
  })

  safeHandle(ipcMain, 'xp:getAchievements', voidSchema(), () => {
    return getStmt(`SELECT a.*, ua.unlocked_at IS NOT NULL as unlocked
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
      ORDER BY a.id`).all()
  })

  safeHandle(ipcMain, 'xp:checkAchievements', voidSchema(), async () => {
    const unlocked = []
    const totalRow = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get()
    const totalXp = totalRow.total
    const oldLevel = Math.floor(totalXp / 100) + 1
    const pomodoroCount = getStmt('SELECT COUNT(*) as count FROM pomodoro_sessions').get().count
    const tasksDone = getStmt('SELECT COUNT(*) as count FROM tasks WHERE completed = 1').get().count
    const notesCount = getStmt('SELECT COUNT(*) as count FROM notes WHERE deleted = 0').get().count
    const snippetsCount = getStmt('SELECT COUNT(*) as count FROM snippets').get().count
    const projectsCount = getStmt('SELECT COUNT(*) as count FROM projects WHERE deleted = 0').get().count
    const streak = getStmt("SELECT current FROM streaks WHERE name = 'daily_study'").get()
    const streakDays = streak ? streak.current : 0
    const appStreak = getStmt("SELECT current FROM streaks WHERE name = 'app_usage'").get()
    const appStreakDays = appStreak ? appStreak.current : 0

    const checks = [
      { key: 'first_pomodoro', condition: pomodoroCount >= 1 },
      { key: 'ten_pomodoros', condition: pomodoroCount >= 10 },
      { key: 'fifty_pomodoros', condition: pomodoroCount >= 50 },
      { key: 'first_task', condition: tasksDone >= 1 },
      { key: 'ten_tasks', condition: tasksDone >= 10 },
      { key: 'hundred_tasks', condition: tasksDone >= 100 },
      { key: 'first_note', condition: notesCount >= 1 },
      { key: 'ten_notes', condition: notesCount >= 10 },
      { key: 'fifty_notes', condition: notesCount >= 50 },
      { key: 'ten_snippets', condition: snippetsCount >= 10 },
      { key: 'five_projects', condition: projectsCount >= 5 },
      { key: 'first_streak_3', condition: streakDays >= 3 },
      { key: 'first_streak_7', condition: streakDays >= 7 },
      { key: 'first_streak_30', condition: streakDays >= 30 },
      { key: 'seven_day_streak_app', condition: appStreakDays >= 7 },
    ]

    for (const check of checks) {
      const achievement = getStmt('SELECT * FROM achievements WHERE key = ?').get(check.key)
      if (!achievement) continue
      const alreadyUnlocked = getStmt('SELECT id FROM user_achievements WHERE achievement_id = ?').get(achievement.id)
      if (check.condition && !alreadyUnlocked) {
        getStmt('INSERT INTO user_achievements (achievement_id) VALUES (?)').run(achievement.id)
        if (achievement.xp_reward > 0) addXp(achievement.xp_reward, `logro: ${achievement.name}`)
        unlocked.push(achievement)
      }
    }
    const newTotal = getStmt('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log').get().total
    const newLevel = Math.floor(newTotal / 100) + 1
    return { unlocked, leveledUp: newLevel > oldLevel, newLevel }
  })

  safeHandle(ipcMain, 'db:getStreak', schemas.streaks.get, (name) => {
    return getStmt('SELECT * FROM streaks WHERE name = ?').get(name)
  })

  safeHandle(ipcMain, 'db:updateStreak', schemas.streaks.update, (name) => {
    const today = new Date().toISOString().split('T')[0]
    const streak = getStmt('SELECT * FROM streaks WHERE name = ?').get(name)

    if (!streak) {
      getStmt('INSERT INTO streaks (name, current, max, updated_at) VALUES (?, 1, 1, ?)').run(name, today)
      return { current: 1, max: 1 }
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (streak.updated_at === today) return streak

    let current = streak.current
    if (streak.updated_at === yesterday) {
      current += 1
    } else {
      current = 1
    }

    const max = Math.max(current, streak.max)
    getStmt('UPDATE streaks SET current = ?, max = ?, updated_at = ? WHERE name = ?').run(current, max, today, name)
    addXp(20, 'racha actualizada')
    updateChallengeProgress('streak', 1)

    const usageStreak = getStmt("SELECT * FROM streaks WHERE name = 'app_usage'").get()
    if (!usageStreak) {
      getStmt("INSERT INTO streaks (name, current, max, updated_at) VALUES ('app_usage', 1, 1, ?)").run(today)
    } else if (usageStreak.updated_at !== today) {
      const usageYesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      let usageCurrent = 1
      if (usageStreak.updated_at === usageYesterday) usageCurrent = usageStreak.current + 1
      getStmt("UPDATE streaks SET current = ?, max = MAX(max, ?), updated_at = ? WHERE name = 'app_usage'").run(usageCurrent, usageCurrent, today)
    }

    return { current, max }
  })

  safeHandle(ipcMain, 'db:updateChallengeProgress', schemas.gamification.challenges.updateProgress, ({ type, amount }) => {
    updateChallengeProgress(type, amount)
    return true
  })

  safeHandle(ipcMain, 'db:getChallenges', voidSchema(), () => {
    const weekStart = getWeekStart()
    return getStmt(`SELECT c.*, COALESCE(uc.progress, 0) as progress, COALESCE(uc.completed, 0) as completed, c.requirement_count as target
      FROM challenges c
      LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.week_start = ?
      ORDER BY c.id`).all(weekStart)
  })

  return { addXp, updateChallengeProgress }
}
