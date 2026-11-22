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
  await page.locator('[data-testid^="select-sublist-"]').first().check()
  await page.getByTestId('start-session').click()
  await expect(page.getByTestId('exercise-card')).toBeVisible()

  for (let i = 0; i < 20; i++) {
    if ((await page.getByTestId('results-card').count()) > 0) break
    if ((await page.getByTestId('exercise-card').count()) === 0) break
    await page.waitForSelector('[data-testid="btn-reveal"], [data-testid="qcm-choice-0"], [data-testid="typing-input-0"]', { timeout: 10_000 })
    if ((await page.getByTestId('btn-reveal').count()) > 0) {
      await page.getByTestId('btn-reveal').click()
      await page.getByTestId('btn-correct').click()
    } else if ((await page.getByTestId('qcm-choice-0').count()) > 0) {
      await page.getByTestId('qcm-choice-0').click()
      if ((await page.getByTestId('results-card').count()) > 0) break
      await page.getByTestId('btn-next').click()
    } else {
      const inputs = page.locator('[data-testid^="typing-input-"]')
      const count = await inputs.count()
      for (let j = 0; j < count; j++) {
        await inputs.nth(j).fill('réponse test')
      }
      await page.getByTestId('btn-submit').click()
      if ((await page.getByTestId('results-card').count()) > 0) break
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
