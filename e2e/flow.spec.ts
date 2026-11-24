import { expect, test, type Page } from '@playwright/test'

async function pickFirstProfile(page: Page) {
  await page.locator('[data-testid^="pick-profile-"]').first().click()
  await expect(page.getByTestId('nav-home')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await pickFirstProfile(page)
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
  await page.getByTestId('level-3').check()
  await page.getByTestId('start-session').click()
  await expect(page.getByTestId('exercise-card')).toBeVisible()
  await expect(page.getByTestId('nav-profiles')).toHaveCount(0)

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
  await expect(page.getByTestId('errors-recap')).toBeVisible()
  await expect(page.locator('[data-testid^="error-row-"]')).toHaveCount(4)
  await expect(page.getByTestId('errors-recap')).toContainText('Réponse attendue')

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
  await page.getByTestId('nav-listes').click()
  await page.getByTestId('delete-examples').click()
  await page.getByTestId('import-type').selectOption('vocab-en')
  await page.getByTestId('import-listname').fill('Test double clic')
  await page.getByTestId('import-textarea').fill('fr;trad;liste\na;x;L1\nb;y;L1\nc;z;L1\nd;w;L1\ne;v;L1\nf;u;L1\n')
  await page.getByTestId('btn-preview').click()
  await page.getByTestId('btn-commit-import').click()

  await page.getByTestId('nav-home').click()
  await page.locator('[data-testid^="select-sublist-"]').first().check()
  await page.getByTestId('level-2').check()
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
  const boxes = Object.values(stored.profiles[0].leitner ?? {}).map((l) => (l as { box: number }).box)
  expect(boxes.length).toBeGreaterThan(0)
  for (const box of boxes) {
    expect(box).toBeLessThanOrEqual(2)
  }
})

test('« Mes mots faibles » est disponible dès l’import, sans session passée (mots non vus = boîte 1)', async ({ page }) => {
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
  await page.getByTestId('nav-listes').click()
  await page.getByTestId('import-textarea').fill('fr;trad;liste\nle chat;;L1\n')
  await page.getByTestId('btn-preview').click()
  await expect(page.getByTestId('import-errors')).toContainText('Ligne 2')
  await expect(page.getByTestId('btn-commit-import')).toHaveCount(0)
})

test('profils : création, sélection, renommage, isolation des données et copie de liste', async ({ page }) => {
  await page.getByTestId('nav-profiles').click()
  await expect(page.getByTestId('profiles-page')).toBeVisible()
  await expect(page.locator('[data-testid^="profile-card-"]')).toHaveCount(1)

  await page.getByTestId('new-profile-name').fill('Lucas')
  await page.getByTestId('emoji-🦊').click()
  await page.getByTestId('create-profile').click()
  await expect(page.locator('[data-testid^="profile-card-"]')).toHaveCount(2)

  await page.locator('[data-testid^="rename-profile-"]').first().fill('Moi (parent)')
  await page.getByTestId('new-profile-name').click()
  await expect(page.locator('[data-testid^="pick-profile-"]').first()).toContainText('Moi (parent)')

  await page.locator('[data-testid^="pick-profile-"]').nth(1).click()
  await expect(page.getByTestId('nav-home')).toBeVisible()
  await expect(page.getByTestId('stat-points')).toContainText('0')

  await page.getByTestId('nav-listes').click()
  await expect(page.locator('[data-testid^="list-card-"]')).toHaveCount(3)
  const firstList = page.locator('[data-testid^="list-card-"]').first()
  await firstList.getByTestId(/^copy-list-/).click()
  await expect(page.getByTestId('copy-info')).toContainText('Moi (parent)')

  await page.getByTestId('nav-profiles').click()
  await page.locator('[data-testid^="pick-profile-"]').first().click()
  await page.getByTestId('nav-listes').click()
  await expect(page.locator('[data-testid^="list-card-"]')).toHaveCount(4)

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('vocab-trainer:state') ?? '{}'))
  expect(stored.profiles).toHaveLength(2)
  const moi = stored.profiles[0]
  const lucas = stored.profiles[1]
  expect(moi.lists).toHaveLength(4)
  const copy = moi.lists[3]
  expect(copy.name).toBe(lucas.lists[0].name)
  expect(copy.id).not.toBe(lucas.lists[0].id)
  expect(copy.isExample).toBe(false)
  expect(Object.keys(copy.items)).toHaveLength(Object.keys(lucas.lists[0].items).length)
  expect(Object.keys(copy.items)).not.toEqual(expect.arrayContaining(Object.keys(lucas.lists[0].items)))
  expect(Object.keys(moi.leitner ?? {})).toHaveLength(0)
})

test('suppression d’un profil après confirmation', async ({ page }) => {
  await page.getByTestId('nav-profiles').click()
  await page.getByTestId('new-profile-name').fill('Temporaire')
  await page.getByTestId('create-profile').click()
  await expect(page.locator('[data-testid^="profile-card-"]')).toHaveCount(2)

  page.once('dialog', (d) => d.accept())
  await page.locator('[data-testid^="delete-profile-"]').nth(1).click()
  await expect(page.locator('[data-testid^="profile-card-"]')).toHaveCount(1)
})

test('niveau 1 (défaut) : « Je ne sais pas » affiche la réponse attendue et compte comme faux', async ({ page }) => {
  await expect(page.getByTestId('level-1')).toBeChecked()
  const group = page.locator('[data-testid^="list-group-"]').first()
  await group.getByTestId(/^select-sublist-/).first().check()
  await page.getByTestId('start-session').click()
  await expect(page.getByTestId('exercise-card')).toBeVisible()
  await expect(page.getByTestId('btn-dont-know')).toBeVisible()
  await page.getByTestId('btn-dont-know').click()
  await expect(page.getByTestId('feedback-ko')).toBeVisible()
  await expect(page.getByTestId('expected-answers')).toContainText('Réponse attendue')
  await page.getByTestId('btn-next').click()
  await expect(page.getByTestId('exercise-card')).toBeVisible()
})

test('migration v1 → v2 : les données existantes partent dans le profil « Moi » sans perte', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.localStorage.setItem(
      'vocab-trainer:state',
      JSON.stringify({
        version: 1,
        lists: [
          {
            id: 'l1',
            name: 'Ma liste perso',
            type: 'vocab-en',
            isExample: false,
            items: { i1: { id: 'i1', fr: 'le chat', translation: 'a cat' } },
            subLists: [{ id: 's1', name: 'L1', itemIds: ['i1'] }],
            unclassifiedItemIds: [],
          },
        ],
        leitner: { i1: { box: 4, lastSeenAt: '2025-01-01T10:00:00.000Z' } },
        profile: { points: 70, streak: { lastDate: '2025-01-02', count: 3 }, history: [] },
      }),
    )
  })
  await page.reload()

  const moi = page.locator('[data-testid^="pick-profile-"]').first()
  await expect(moi).toContainText('Moi')
  await moi.click()
  await expect(page.getByTestId('stat-points')).toContainText('70')
  await expect(page.getByTestId('stat-streak')).toContainText('3')

  await page.getByTestId('nav-listes').click()
  await expect(page.locator('[data-testid^="list-card-"]')).toHaveCount(1)
  await expect(page.locator('[data-testid^="list-card-"]').first()).toContainText('Ma liste perso')
})
