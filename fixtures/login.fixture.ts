import { test as base, Page } from "@playwright/test"
import { Login } from "../pages/login.page"
import { testData } from "../test-data/data"

type loginFixture = {
    authenticatedLogin: Page
}

const valid_login = base.extend<loginFixture>({
    authenticatedLogin: async({page}, use) => {
        const login = new Login(page)
        await login.goTo()
        await login.loginWithCorrectCredentials(testData.username, testData.password)

        await use(page)
    }
})

export { valid_login }