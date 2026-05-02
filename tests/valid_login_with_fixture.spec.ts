import { expect } from "@playwright/test"
import { valid_login } from "../fixtures/login.fixture.ts"    
import { Login } from "../pages/login.page.ts";

valid_login("Login with correct credentials", async({ authenticatedLogin }) => {
    await expect(authenticatedLogin).toHaveURL('https://www.saucedemo.com/inventory.html');
    await expect(authenticatedLogin).toHaveTitle("Swag Labs");
});