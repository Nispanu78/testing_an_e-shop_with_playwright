import {test, expect} from "@playwright/test"
import { Login } from "../pages/login.page"

test("Login with correct credentials", async({page}) => {
  const login = new Login(page)
  await login.goTo()
  await login.loginWithCorrectCredentials("standard_user", "secret_sauce")
  await expect(page.locator('[data-test="title"]')).toContainText('Products');
})