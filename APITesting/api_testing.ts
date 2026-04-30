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
    })
})