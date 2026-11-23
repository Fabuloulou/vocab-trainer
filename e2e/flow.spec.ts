import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test('flux complet : importer, lancer une session, répondre, voir les résultats et le streak', async ({ page }) => {
  await page.getByTestId('nav-listes').click()

  await page.getByTestId('delete-examples').click()

  await page.getByTestId('import-type').selectOption('vocab-en')
  await page.getByTestId('import-listname').fill('Anglais test')
  await page.getByTestId('import-textarea').fill('fr;trad;liste\nle chat;a cat;L1\nle chien;a dog;L1\nla maison;the house;L1\nle livre;the book;L1\n')
  await page.getByTestId('btn-preview').click()
  await expect(page.getByTestId('preview-table')).toBeVisible()
  await page.getByTestId('btn-commit-import').click()
  await expect(page.getByTestId('import-info')).toContainText('4 mot(s)')

  await page.getByTestId('nav-home').click()
  await expect(page.getByTestId(/^list-group-/).first()).toBeVisible()
  const group = page.locator('[data-testid^="list-group-"]').first()
  await group.getByTestId(/^toggle-all-/).check()
  expect(await page.locator('[data-testid^="select-sublist-"]:checked').count()).toBeGreaterThan(0)
  await page.getByTestId('start-session').click()
  await expect(page.getByTestId('exercise-card')).toBeVisible()

  for (let i = 0; i < 20; i++) {
    await page.waitForSelector(
      '[data-testid="results-card"], [data-testid="btn-reveal"], [data-testid="qcm-choice-0"], [data-testid="typing-input-0"]',
      { timeout: 15_000 },
    )
    if ((await page.getByTestId('results-card').count()) > 0) break
    if ((await page.getByTestId('btn-reveal').count()) > 0) {
      await page.getByTestId('btn-reveal').click()
      await page.getByTestId('btn-correct').click()
    } else if ((await page.getByTestId('qcm-choice-0').count()) > 0) {
      await page.getByTestId('qcm-choice-0').click()
      await page.waitForSelector('[data-testid="btn-next"], [data-testid="results-card"]', { timeout: 10_000 })
      if ((await page.getByTestId('results-card').count()) > 0) break
      await page.getByTestId('btn-next').click()
    } else {
      const inputs = page.locator('[data-testid^="typing-input-"]')
      const count = await inputs.count()
      for (let j = 0; j < count; j++) {
        await inputs.nth(j).fill('réponse test')
      }
      await page.getByTestId('btn-submit').click()
      await page.waitForSelector('[data-testid="btn-next"], [data-testid="results-card"]', { timeout: 10_000 })
      if ((await page.getByTestId('results-card').count()) > 0) break
      if ((await page.getByTestId('feedback-ko').count()) > 0) {
        await expect(page.getByTestId('feedback-ko')).toContainText("champ(s) en erreur")
        await expect(page.getByTestId('expected-answers')).toContainText('réponse test')
        await expect(page.getByTestId('expected-answers')).toContainText('Réponse attendue')
      }
      await page.getByTestId('btn-next').click()
    }
  }

  await expect(page.getByTestId('results-card')).toBeVisible()
  await expect(page.getByTestId('results-score')).toContainText('/ 4')

  await page.getByTestId('results-stats').click()
  await expect(page.getByTestId('history-list')).toBeVisible()
  await expect(page.getByTestId('history-list')).toContainText('/ 4')

  await page.getByTestId('nav-home').click()
  await expect(page.getByTestId('stat-streak')).toContainText('1')

  await expect(page.getByTestId('start-weak')).toBeEnabled()
  await page.getByTestId('start-weak').click()
  await expect(page.getByTestId('exercise-card')).toBeVisible()
})

test('refus de créer ou renommer une sous-liste avec un nom déjà utilisé dans la liste', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByTestId('nav-listes').click()
  await page.getByTestId('delete-examples').click()
  await page.getByTestId('import-type').selectOption('vocab-en')
  await page.getByTestId('import-listname').fill('Test sous-listes')
  await page.getByTestId('import-textarea').fill('fr;trad;liste\nle chat;a cat;L1\nle chien;a dog;L1\n')
  await page.getByTestId('btn-preview').click()
  await page.getByTestId('btn-commit-import').click()

  await page.locator('[data-testid^="new-sub-"]').fill('L2')
  await page.locator('[data-testid^="create-sub-"]').click()
  await page.locator('[data-testid^="sublist-"]').nth(1).waitFor()

  await page.locator('[data-testid^="new-sub-"]').fill('l2')
  await page.locator('[data-testid^="create-sub-"]').click()
  await expect(page.locator('[data-testid^="sub-error-"]').first()).toContainText('déjà utilisé')

  await page.locator('[data-testid^="rename-sub-"]').first().fill('L2')
  await page.locator('[data-testid^="export-list-"]').first().click()
  await expect(page.locator('[data-testid^="rename-error-"]').first()).toContainText('déjà utilisé')
  await expect(page.locator('[data-testid^="rename-sub-"]').first()).toHaveValue('L1')
})

test('double clic rapide sur un QCM applique la progression Leitner une seule fois', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByTestId('nav-listes').click()
  await page.getByTestId('delete-examples').click()
  await page.getByTestId('import-type').selectOption('vocab-en')
  await page.getByTestId('import-listname').fill('Test double clic')
  await page.getByTestId('import-textarea').fill('fr;trad;liste\na;x;L1\nb;y;L1\nc;z;L1\nd;w;L1\ne;v;L1\nf;u;L1\n')
  await page.getByTestId('btn-preview').click()
  await page.getByTestId('btn-commit-import').click()

  await page.getByTestId('nav-home').click()
  await page.locator('[data-testid^="select-sublist-"]').first().check()
  await page.getByTestId('start-session').click()

  for (let i = 0; i < 20; i++) {
    await page.waitForSelector(
      '[data-testid="results-card"], [data-testid="btn-reveal"], [data-testid="qcm-choice-0"], [data-testid="typing-input-0"]',
      { timeout: 15_000 },
    )
    if ((await page.getByTestId('results-card').count()) > 0) break
    if ((await page.getByTestId('btn-reveal').count()) > 0) {
      await page.getByTestId('btn-reveal').click()
      await page.getByTestId('btn-correct').click()
    } else if ((await page.getByTestId('qcm-choice-0').count()) > 0) {
      await page.getByTestId('qcm-choice-0').dblclick()
      await page.waitForSelector('[data-testid="btn-next"], [data-testid="results-card"]', { timeout: 10_000 })
      if ((await page.getByTestId('results-card').count()) > 0) break
      await page.getByTestId('btn-next').click()
    } else {
      const inputs = page.locator('[data-testid^="typing-input-"]')
      const count = await inputs.count()
      for (let j = 0; j < count; j++) {
        await inputs.nth(j).fill('réponse test')
      }
      await page.getByTestId('btn-submit').click()
      await page.waitForSelector('[data-testid="btn-next"], [data-testid="results-card"]', { timeout: 10_000 })
      if ((await page.getByTestId('results-card').count()) > 0) break
      await page.getByTestId('btn-next').click()
    }
  }

  await expect(page.getByTestId('results-card')).toBeVisible()
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('vocab-trainer:state') ?? '{}'))
  const boxes = Object.values(stored.leitner ?? {}).map((l) => (l as { box: number }).box)
  expect(boxes.length).toBeGreaterThan(0)
  for (const box of boxes) {
    expect(box).toBeLessThanOrEqual(2)
  }
})

test('« Mes mots faibles » est disponible dès l import, sans session passée (mots non vus = boîte 1)', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByTestId('nav-listes').click()
  await page.getByTestId('delete-examples').click()
  await page.getByTestId('import-type').selectOption('vocab-en')
  await page.getByTestId('import-listname').fill('Test faibles')
  await page.getByTestId('import-textarea').fill('fr;trad;liste\nle chat;a cat;L1\nle chien;a dog;L1\n')
  await page.getByTestId('btn-preview').click()
  await page.getByTestId('btn-commit-import').click()

  await page.getByTestId('nav-home').click()
  await expect(page.getByTestId('start-weak')).toBeEnabled()
  await page.getByTestId('start-weak').click()
  await expect(page.getByTestId('exercise-card')).toBeVisible()
  await expect(page.getByTestId('session-progress')).toContainText('/ 2')
})

test('lignes CSV en erreur bloquent la validation', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByTestId('nav-listes').click()
  await page.getByTestId('import-textarea').fill('fr;trad;liste\nle chat;;L1\n')
  await page.getByTestId('btn-preview').click()
  await expect(page.getByTestId('import-errors')).toContainText('Ligne 2')
  await expect(page.getByTestId('btn-commit-import')).toHaveCount(0)
})
