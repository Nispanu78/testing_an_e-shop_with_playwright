import {expect} from "@playwright/test"
import { valid_login } from "../fixtures/login.fixture.ts"    

valid_login("Login with correct credentials", async({ authenticatedLogin }) => {
    await expect(authenticatedLogin).toHaveTitle("Swag Labs")
})