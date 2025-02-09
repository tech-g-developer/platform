import { expect, Locator, Page } from '@playwright/test'
import path from 'path'
import { CalendarPage } from '../calendar-page'

export class CommonRecruitingPage extends CalendarPage {
  readonly page: Page
  readonly inputComment: Locator
  readonly buttonSendComment: Locator
  readonly textComment: Locator
  readonly inputAddAttachment: Locator
  readonly textAttachmentName: Locator
  readonly buttonCreateFirstReview: Locator
  readonly buttonMoreActions: Locator
  readonly buttonDelete: Locator

  constructor (page: Page) {
    super(page)
    this.page = page
    this.inputComment = page.locator('div.text-input div.tiptap')
    this.buttonSendComment = page.locator('g#Send')
    this.textComment = page.locator('div.showMore-content p')
    this.inputAddAttachment = page.locator('div.antiSection #file')
    this.textAttachmentName = page.locator('div.name a')
    this.buttonCreateFirstReview = page.locator('span:has-text("Create review")')
    this.buttonMoreActions = page.locator('.popupPanel-title > .flex-row-center > button >> nth=0')
    this.buttonDelete = page.locator('button[class*="menuItem"] span', { hasText: 'Delete' })
  }

  async addComment (comment: string): Promise<void> {
    await this.inputComment.fill(comment)
    await this.buttonSendComment.click()
  }

  async checkCommentExist (comment: string): Promise<void> {
    await expect(this.textComment.filter({ hasText: comment })).toBeVisible()
  }

  async addAttachments (filePath: string): Promise<void> {
    await this.inputAddAttachment.setInputFiles(path.join(__dirname, `../../files/${filePath}`))
    await expect(this.textAttachmentName.filter({ hasText: filePath })).toBeVisible()
  }

  async addFirstReview (reviewTitle: string, reviewDescription: string): Promise<void> {
    await this.buttonCreateFirstReview.click()
    await this.createNewReviewPopup(this.page, reviewTitle, reviewDescription)
  }

  async createNewTalentPopup (page: Page, firstName: string, lastName: string): Promise<void> {
    await page
      .locator('div.popup form[id="recruit:string:CreateTalent"] input[placeholder="First name"]')
      .fill(firstName)
    await page.locator('div.popup form[id="recruit:string:CreateTalent"] input[placeholder="Last name"]').fill(lastName)
    await page.locator('div.popup form[id="recruit:string:CreateTalent"] button[type="submit"]').click()
  }

  async createNewReviewPopup (page: Page, title: string, description: string): Promise<void> {
    await page.locator('div.popup form[id="recruit:string:CreateReviewParams"] input[placeholder="Title"]').fill(title)
    await page.locator('div.popup form[id="recruit:string:CreateReviewParams"] div.text-editor-view').fill(description)
    await page.locator('div.popup form[id="recruit:string:CreateReviewParams"] button[type="submit"]').click()
  }

  async deleteEntity (): Promise<void> {
    await this.buttonMoreActions.click()
    await this.buttonDelete.click()
    await this.pressYesDeletePopup(this.page)
  }
}
