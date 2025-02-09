import { type Locator, type Page } from '@playwright/test'

export class NavigationMenuPage {
  readonly page: Page
  readonly buttonApplications: Locator
  readonly buttonMyApplications: Locator
  readonly buttonTalents: Locator
  readonly buttonVacancies: Locator

  constructor (page: Page) {
    this.page = page
    this.buttonApplications = page.locator('a[href$="candidates"]', { hasText: 'Applications' })
    this.buttonMyApplications = page.locator('a[href$="my-applications"]', { hasText: 'My applications' })
    this.buttonTalents = page.locator('a[href$="talents"]', { hasText: 'Talents' })
    this.buttonVacancies = page.locator('a[href$="vacancies"]', { hasText: 'Vacancies' })
  }
}
