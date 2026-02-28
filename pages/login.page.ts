import { Page, Locator } from "@playwright/test"
import { testData } from "../test-data/data.ts"
import { loginLocators } from "../locators/login.locators.ts"


export class Login {

    readonly page: Page
    readonly userInput: Locator
    readonly passwordInput: Locator
    readonly loginButton: Locator

    constructor(page: Page) {
        this.page = page
        this.userInput = page.getByPlaceholder(testData.username)
        this.passwordInput = page.getByPlaceholder(testData.password)
        this.loginButton = page.getByRole(loginLocators.loginButton.role, loginLocators.loginButton.options)
    }

    async goTo(): Promise<void>{
        await this.page.goto(loginLocators.baseUrl)
    }

    async loginWithCorrectCredentials(username: string, password:string): Promise<void>{
        await this.userInput.fill(username)
        await this.passwordInput.fill(password)
        await this.loginButton.click()
    }
}