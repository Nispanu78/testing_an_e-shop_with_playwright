import { test, expect } from "@playwright/test"
import { Login } from "../pages/login.page"
import { testData } from "../test-data/data.ts"

test("Login with correct credentials", async({page}) => {
  const login = new Login(page)
  await login.goTo()
  await login.loginWithCorrectCredentials(testData.username, testData.password)
  await expect(page.locator('[data-test="title"]')).toContainText('Products');
})