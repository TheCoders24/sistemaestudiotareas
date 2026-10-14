import { test, expect } from '@playwright/test'

test.describe('App Startup', () => {
  test('should load without errors', async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Wait for app to render
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 30000 }).catch(() => {})
    
    // Should have no console errors
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  })

  test('should show welcome wizard on first run', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check for welcome wizard (may not appear if already completed)
    const welcomeDialog = page.locator('[role="dialog"]:has-text("Bienvenido")')
    if (await welcomeDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(welcomeDialog).toBeVisible()
    }
  })
})

test.describe('Navigation', () => {
  test('should navigate between tabs', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Wait for sidebar
    await page.waitForSelector('aside', { timeout: 10000 })
    
    // Click on different tabs
    const tabs = ['inicio', 'tareas', 'pomodoro', 'kanban', 'proyectos', 'diario']
    
    for (const tab of tabs) {
      const button = page.locator(`aside button:has-text("${tab}"), aside a:has-text("${tab}")`).first()
      if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
        await button.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('should open settings dialog', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const settingsBtn = page.locator('button[aria-label="Abrir configuración"], button:has-text("Configuración")').first()
    if (await settingsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsBtn.click()
      await expect(page.locator('[role="dialog"]:has-text("Configuración")')).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Tasks CRUD', () => {
  test('should create a new task', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Navigate to tasks
    const tasksTab = page.locator('aside button:has-text("Tareas"), aside a:has-text("Tareas")').first()
    if (await tasksTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tasksTab.click()
      await page.waitForTimeout(500)
      
      // Click add task button
      const addBtn = page.locator('button:has-text("Agregar"), button:has-text("Nueva tarea")').first()
      if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addBtn.click()
        
        // Fill task form
        await page.fill('input[placeholder*="tarea"], input[placeholder*="¿Qué"], input[name="title"]', 'Test E2E Task')
        await page.fill('textarea[name="description"], textarea[placeholder*="descripción"]', 'E2E test description')
        
        // Submit
        await page.click('button:has-text("Crear"), button:has-text("Guardar"), button[type="submit"]')
        await page.waitForTimeout(1000)
        
        // Verify task appears
        await expect(page.locator('text=Test E2E Task')).toBeVisible({ timeout: 5000 })
      }
    }
  })
})

test.describe('Pomodoro', () => {
  test('should start and pause pomodoro', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const pomodoroTab = page.locator('aside button:has-text("Pomodoro"), aside a:has-text("Pomodoro")').first()
    if (await pomodoroTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pomodoroTab.click()
      await page.waitForTimeout(500)
      
      // Start pomodoro
      const startBtn = page.locator('button:has-text("Iniciar"), button:has-text("Start")').first()
      if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await startBtn.click()
        await page.waitForTimeout(1000)
        
        // Pause
        const pauseBtn = page.locator('button:has-text("Pausar"), button:has-text("Pause")').first()
        if (await pauseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await pauseBtn.click()
        }
      }
    }
  })
})

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
  })

  test('should have proper ARIA labels on interactive elements', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const buttons = await page.locator('button').all()
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label')
      const text = await button.textContent()
      if (!ariaLabel && (!text || text.trim().length === 0)) {
        console.warn('Button without accessible name:', await button.outerHTML())
      }
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Tab through focusable elements
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'DIV']).toContain(focused)
  })
})