// import { Page, Locator } from "@playwright/test"
// import { loginLocators } from "../locators/login.locators.ts"


// export class Login {

//     readonly page: Page
//     readonly userInput: Locator
//     readonly passwordInput: Locator
//     readonly loginButton: Locator

//     constructor(page: Page) {
//         this.page = page
//         this.userInput = page.getByPlaceholder(loginLocators.usernmameField)
//         this.passwordInput = page.getByPlaceholder(loginLocators.passwordField)
//         this.loginButton = page.getByRole(loginLocators.loginButton.role, loginLocators.loginButton.options)
//     }

//     async goTo(): Promise<void>{
//         await this.page.goto(loginLocators.baseUrl)
//     }

//     async loginWithCorrectCredentials(username: string, password:string): Promise<void>{
//         await this.userInput.fill(username)
//         await this.passwordInput.fill(password)
//         await this.loginButton.click()
//     }
// }

import { Page, Locator } from "@playwright/test"
import { loginLocators } from "../locators/login.locators"
import { testData } from "../test-data/data"

export class Login {

    readonly page: Page
    readonly userInput: Locator 
    readonly passwordInput: Locator 
    readonly submitButton: Locator 

    constructor(page: Page) {
        this.page = page
        this.userInput = page.getByPlaceholder(loginLocators.usernmameField)
        this.passwordInput = page.getByPlaceholder(loginLocators.passwordField)
        this.submitButton = page.getByRole(loginLocators.loginButton.role, loginLocators.loginButton.options)

    }

    async goTo() {
        await this.page.goto(loginLocators.baseUrl)
    }

    async loginWithCorrectCredentials(username: string, password:string) {
        await this.userInput.fill(username);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }

    }

