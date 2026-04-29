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

test("Create and retrieve a user", async({ request }) => {
    const payload: CreateUser = {
        name: "John",
        surname: "Dandy",
        email: "dandy@mail.com",
        profession: "tester"
    }

    const response = await request.post("/api/users", {
        data: payload
    })

    expect(response.status()).toBe(201)

    const created: User = await response.json()
    expect(created.id).toBeGreaterThan(0)
    expect(created).toMatchObject(payload)

    const getUser = await request.get(`/api/users/${created.id}`)
    expect(getUser.status()).toBe(200)

    const fetched: User = await getUser.json()
    expect(fetched).toMatchObject({
        id: created.id,
        ...payload
    })
    }
)
