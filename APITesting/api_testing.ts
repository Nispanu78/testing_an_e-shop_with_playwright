import { test, expect } from "@playwright/test"

type CreateUser = {
    name: string
    surname: string
    email: string
    profession: string
}

type User = CreateUser&{
    id: number
}

test("Create and retrieve user", async({ request }) => {
    const payload: CreateUser = {
        name: "John",
        surname: "Doe",
        email: "doe@mail.com",
        profession: "tester"
    }

    const createdUser = await request.post('/api/users', {
        data: payload
    });

    expect(createdUser.status()).toBe(201);
    const createdUserPost: User = await createdUser.json();
    expect(createdUserPost.id).toBeGreaterThan(0);
    expect(createdUserPost).toMatchObject(payload);

    const getUser = await request.get(`/api/users/${createdUserPost.id}`);
    expect(getUser.status()).toBe(200);
    const getUserGet: User = await getUser.json();
    expect(getUserGet).toMatchObject({
        id: getUserGet.id,
        ...payload
    });
});

// Another example:

// fixtures/auth.fixture.ts
// import { test as base, request } from '@playwright/test';

// type AuthFixtures = {
//   loggedInPage: Page;
// };

// export const test = base.extend<AuthFixtures>({
//   loggedInPage: async ({ browser }, use) => {
//     // Call login API directly — no UI interaction
//     const apiContext = await request.newContext();
//     const res = await apiContext.post('/api/auth/login', {
//       data: { email: 'test@example.com', password: process.env.TEST_PASS }
//     });
//     const { token } = await res.json();

//     // Inject auth cookie into a new browser context
//     const context = await browser.newContext({
//       extraHTTPHeaders: { Authorization: `Bearer ${token}` }
//     });
//     const page = await context.newPage();

//     await use(page);          // test runs here
//     await context.close();
//     await apiContext.dispose();
//   }
// });
