// ---

// ## QA Engineer Interview Kit — Mid → Senior Assessment

// ---

// ## THEORETICAL QUESTIONS

// ---

// **T1 · Architecture · Test Architecture & POM**

// **Q:** Explain the Page Object Model pattern and describe how you would structure a large-scale 
// Playwright project that covers dozens of pages, shared components, and multiple user roles.
// **A:** The Page Object Model encapsulates each page's selectors and interactions inside a 
// dedicated class, keeping test files clean and DRY. For a large project the folder structure 
// should reflect the domain:

// ```
// src/
//   pages/       ← one class per page/feature area
//   components/  ← reusable fragment classes (Header, Modal, DataTable…)
//   fixtures/    ← Playwright fixture extensions that wire up POM instances
//   helpers/     ← pure utilities (date formatters, random data generators)
//   data/        ← test-data factories and constants
//   api/         ← API client wrappers used by tests
//   config/      ← environment-aware config (baseURL, credentials)
// ```

// Key design decisions:
// - Page classes expose meaningful action methods (`login()`, `addToCart()`) instead of raw locators, so tests read like user stories.
// - A base `BasePage` class holds the shared page reference and common helpers (`waitForNetworkIdle`, `scrollTo`…).
// - Role-specific fixtures (`adminPage`, `buyerPage`) compose the right pages and pre-authenticate, so each test starts in a known state without repeating auth boilerplate.
// - Component classes are injected into pages that contain them, enabling re-use across pages (e.g., a `SearchBar` class used by both `HomePage` and `CategoryPage`).

// ---

// **T2 · TypeScript · TypeScript for Test Frameworks**

// **Q:** How does TypeScript's type system improve test framework maintainability, 
// and what patterns — such as generics, utility types, or discriminated unions — would 
// you apply when building a shared API client for both production code and tests?
// **A:** TypeScript gives the framework compile-time safety that catches refactoring 
// mistakes before CI runs a single test. Concrete patterns:

// 1. **Generic API client** — `class ApiClient<T> { async get(path: string): Promise<T> }` gives 
// callers auto-completion and type errors if they misuse the response.
// 2. **Utility types for test data** — `type CreateUserPayload = Omit<User, 'id' | 'createdAt'>` 
// mirrors what the API actually accepts and keeps fixtures honest.
// 3. **Discriminated unions for response modelling** — `type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string }` 
// forces every caller to handle both branches, eliminating silent failures.
// 4. **Const enums for roles/environments** — `const enum Role { Admin = 'admin', Buyer = 'buyer' }` 
// prevents magic strings drifting across files.
// 5. **Strict tsconfig** — `strict: true` and `noUncheckedIndexedAccess` catch array access bugs that 
// cause flaky tests at runtime.

// Result: refactoring a page's response shape surfaces every broken test at compile time, not at 2 AM in CI.

// ---

// **T3 · Reliability · Flaky Tests**

// **Q:** What are the most common root causes of flaky tests in Playwright E2E suites, and what systematic 
// strategies would you implement at the framework level — not just per-test fixes — to detect, quarantine, 
// and eliminate them?
// **A:** Root causes fall into three buckets:

// 1. **Timing** — asserting before the UI/network has settled (wrong wait strategy, missing network idle).
// 2. **State leakage** — tests sharing browser state, database records, or auth tokens.
// 3. **Environmental instability** — CPU throttling in CI, shared test databases, third-party APIs.

// Framework-level strategies:
// - **Strict locator policy** — ban `.nth()`, XPath, and CSS attribute selectors in code review; 
// enforce `data-testid` or ARIA role locators via a custom ESLint rule.
// - **Auto-waiting assertions** — prefer `expect(locator).toBeVisible()` over `page.waitForTimeout()`; 
// configure a project-wide `actionTimeout`.
// - **Isolated test state** — each test gets its own browser context (Playwright default); 
// use API calls in `beforeEach` to seed data and `afterEach` to clean it;  
// never rely on test execution order.
// - **Retry-on-failure + analytics** — set `retries: 2` in CI config and emit a structured log on every 
// retry. Parse those logs to build a flakiness dashboard (test name → retry rate over time).
// - **Quarantine lane** — tests exceeding a flakiness threshold move to a `@flaky` tag that runs in a 
// separate non-blocking pipeline job, buying time to fix without blocking deploys.
// - **Trace on first retry** — `trace: 'on-first-retry'` captures the exact DOM and network state that 
// caused the failure without the overhead of always-on tracing.

// ---

// **T4 · DevOps · CI/CD & Docker**

// **Q:** Describe the ideal Docker + Jenkins setup for running Playwright tests in CI. 
// What base image would you use, how would you structure the Jenkinsfile stages, 
// and how would you manage browser binaries and artifacts?
// **A:**

// **Docker image:** Start from `mcr.microsoft.com/playwright:v1.x.x-focal` — 
// it ships with Chromium, Firefox, and WebKit pre-installed alongside all OS-level dependencies, 
// eliminating browser mismatch issues. Add only app dependencies on top (`npm ci`). 
// Pin the image tag to a specific Playwright version for reproducibility.

// **Jenkinsfile structure:**
```groovy
pipeline {
  agent { docker { image 'mcr.microsoft.com/playwright:v1.44-focal' } }
  stages {
    stage('Install')         { steps { sh 'npm ci' } }
    stage('Lint & Typecheck'){ steps { sh 'npm run lint && npm run typecheck' } }
    stage('E2E Tests') {
      parallel {
        stage('Chromium') { steps { sh 'npx playwright test --project=chromium' } }
        stage('Firefox')  { steps { sh 'npx playwright test --project=firefox'  } }
      }
    }
  }
  post {
    always {
      publishHTML target: [reportDir: 'playwright-report', reportFiles: 'index.html']
      archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
    }
  }
}
```

// Key decisions:
// - Parallel browser stages cut wall-clock time roughly in half.
// - `archiveArtifacts` persists traces, screenshots, and videos on failure so devs can debug 
// without re-running.
// - Credentials and `BASE_URL` are injected via Jenkins credentials binding, never hardcoded.
// - A separate Docker network is created if the app under test runs as a sibling container.

// ---

// **T5 · Mocking · API & Network Mocking**
// **Q:** When and why would you mock backend services or intercept network traffic in E2E tests? 
// Explain the trade-offs and describe how Playwright's network interception API supports different 
// mocking strategies.
// **A:**

// **When to mock:** third-party services (payment gateways, email providers), slow or 
// unreliable microservices, edge-case scenarios (HTTP 500, 429, empty lists), and contract 
// testing before the backend is built.

// **When not to mock:** critical happy-path flows where real integration is the point, 
// and performance tests where mocks hide real latency.

// **Trade-offs:** mocks give speed, determinism, and isolation from external failures, 
// but tests can pass while the real API has drifted — mitigated by contract tests and 
// a separate smoke suite against the live environment.

// **Playwright interception strategies:**

// 1. `page.route()` — full request interception: `route.fulfill({ status: 200, json: mockOrders })`.
// 2. `route.continue()` with modification — pass through but mutate headers: `route.continue({ headers: { ...route.request().headers(), 'x-role': 'admin' } })`.
// 3. `page.routeFromHAR()` — replay a recorded HAR file; ideal for complex multi-step flows.
// 4. `route.abort('failed')` — simulate offline or network error scenarios.

// Organise mocks as factory functions in a `/mocks` folder (e.g., `ordersMock(overrides?: Partial<Order>)`) 
// so tests compose realistic payloads with minimal boilerplate.

// ---

// ## PRACTICAL QUESTIONS

---

// **P1 · Coding · POM Implementation**

// **Q:** Write a TypeScript Playwright Page Object class for a login page with email, password, 
// and submit fields. The class must expose a typed `login()` method and a `getErrorMessage()` method. 
// Then show how a fixture would inject it into a test.
// **A:**
// ```typescript
// pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  private readonly emailInput:    Locator;
  private readonly passwordInput: Locator;
  private readonly submitBtn:     Locator;
  private readonly errorMsg:      Locator;

  constructor(private page: Page) {
    this.emailInput    = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitBtn     = page.getByRole('button', { name: 'Sign in' });
    this.errorMsg      = page.getByTestId('auth-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  }

  async getErrorMessage(): Promise<string | null> {
    await expect(this.errorMsg).toBeVisible();
    return this.errorMsg.textContent();
  }
}

// fixtures/index.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type Fixtures = { loginPage: LoginPage };

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },
});

// tests/login.spec.ts
import { test } from '../fixtures';
import { expect } from '@playwright/test';

test('shows error on bad credentials', async ({ loginPage }) => {
  await loginPage.login('bad@test.com', 'wrong');
  expect(await loginPage.getErrorMessage()).toContain('Invalid credentials');
});
// ```

// ---

// **P2 · API · API Testing**
// **Q:** Using Playwright's `APIRequestContext`, write a test that creates a user via 
// `POST /api/users`, then asserts the `GET /api/users/:id` response matches the created payload. 
// Include proper TypeScript typing and status-code assertions.
// **A:**
// ```typescript
// types/user.ts
export interface CreateUserDto {
  name:  string;
  email: string;
  role:  'admin' | 'viewer';
}

export interface User extends CreateUserDto {
  id:        string;
  createdAt: string;
}

// tests/users.api.spec.ts
import { test, expect } from '@playwright/test';
import type { CreateUserDto, User } from '../types/user';

test('POST → GET user round-trip', async ({ request }) => {
  const payload: CreateUserDto = {
    name:  'Nick Tester',
    email: `nick+${Date.now()}@example.com`,
    role:  'viewer',
  };

  // Create
  const createRes = await request.post('/api/users', { data: payload });
  expect(createRes.status()).toBe(201);

  const created: User = await createRes.json();
  expect(created.id).toBeTruthy();
  expect(created.email).toBe(payload.email);

  // Fetch by id
  const getRes = await request.get(`/api/users/${created.id}`);
  expect(getRes.status()).toBe(200);

  const fetched: User = await getRes.json();
  expect(fetched).toMatchObject({
    id:    created.id,
    name:  payload.name,
    email: payload.email,
    role:  payload.role,
  });
});
// ```

// ---

// **P3 · Mocking · Network Mocking**
// **Q:** Write a Playwright test that intercepts a `GET /api/products` call, 
// returns a mocked payload of two items, and asserts that both product names are rendered 
// in the UI. Also show how to assert the request was actually intercepted.
// **A:**
// ```typescript
// mocks/productsMock.ts
// import { test, expect } from '@playwright/test';
// import { twoProductsMock } from '../mocks/productsMock';

// test('renders mocked products from API', async ({ page }) => {
//   let intercepted = false;

//   await page.route('**/api/products', route => {
//     intercepted = true;

//     route.fulfill({
//       status: 200,
//       contentType: 'application/json',
//       body: JSON.stringify(twoProductsMock),
//     });
//   });

//   await page.goto('/products');

//   expect(intercepted).toBeTruthy();

//   await expect(page.locator('.product')).toHaveCount(2);
//   await expect(page.getByText('Mechanical Keyboard')).toBeVisible();
//   await expect(page.getByText('USB-C Hub')).toBeVisible();
// });
// ```

// ---

// **P4 · Debugging · Debugging & Tracing**

// **Q:** A test that clicks a "Confirm Order" button is flaky — it passes locally 
// but fails in CI with "Element not found". Walk through the exact debugging steps 
// you would take using Playwright's built-in tooling, and write the corrected, 
// stable version of the failing assertion.
// **A:**

// **Debugging workflow:**

// 1. Reproduce in headed mode with CI env vars: `BASE_URL=https://staging.app npx playwright test --headed order.spec.ts`
// 2. Enable trace on first retry in `playwright.config.ts`: `trace: 'on-first-retry', screenshot: 'only-on-failure', video: 'on-first-retry'`. Run in CI, download the `trace.zip` artifact.
// 3. Open the trace viewer: `npx playwright show-trace trace.zip`. 
// Inspect the timeline — was the button covered by a loading spinner? 
// Was a network request still in flight when the click fired?
// 4. Use Playwright Inspector locally: `PWDEBUG=1 npx playwright test order.spec.ts`. 
// Step through actions, hover locators, confirm selectors resolve.

// Common CI-specific causes found via trace: a skeleton loader covering the button for 300–800 ms (not present locally on a fast machine), or a viewport size difference making the button off-screen.

// **Corrected, stable test:**
// ```typescript
// ❌ Flaky original
// await page.click('#confirm-btn');
// expect(page.url()).toContain('/order-success');

// // ✅ Stable version
// const confirmBtn = page.getByRole('button', { name: 'Confirm Order' });

// await expect(page.getByTestId('loading-overlay')).toBeHidden();
// await expect(confirmBtn).toBeEnabled();
// await confirmBtn.click();

// await page.waitForURL('**/order-success**');
// await expect(
//   page.getByRole('heading', { name: /order confirmed/i })
// ).toBeVisible();
// ```

// ---

// **P5 · Performance · Optimization & Parallelism**

// **Q:** Your suite of 200 tests takes 18 minutes in CI on a single worker. 
// Show the `playwright.config.ts` changes and the Jenkinsfile modifications 
// you would make to bring this under 5 minutes, without sacrificing reliability.
// **A:**
// ```typescript
// playwright.config.ts — optimized
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  workers:       process.env.CI ? 4 : undefined, // 50% of available CPUs
  fullyParallel: true,                            // every file runs concurrently
  maxFailures:   process.env.CI ? 10 : undefined, // fail fast in CI
  retries:       process.env.CI ? 2 : 0,
  timeout:       30_000,
  expect:        { timeout: 8_000 },

  use: {
    baseURL:    process.env.BASE_URL ?? 'http://localhost:3000',
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'on-first-retry',
  },

  projects: [
    // Chromium only in PR builds; add Firefox/WebKit in a nightly job
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

```groovy
// Jenkinsfile — 3 shards across 3 parallel agents
pipeline {
  agent none
  stages {
    stage('Test Shards') {
      parallel {
        stage('Shard 1/3') {
          agent { docker { image 'mcr.microsoft.com/playwright:v1.44-focal' } }
          steps { sh 'npx playwright test --shard=1/3' }
          post { always { archiveArtifacts 'blob-report/**' } }
        }
        stage('Shard 2/3') {
          agent { docker { image 'mcr.microsoft.com/playwright:v1.44-focal' } }
          steps { sh 'npx playwright test --shard=2/3' }
          post { always { archiveArtifacts 'blob-report/**' } }
        }
        stage('Shard 3/3') {
          agent { docker { image 'mcr.microsoft.com/playwright:v1.44-focal' } }
          steps { sh 'npx playwright test --shard=3/3' }
          post { always { archiveArtifacts 'blob-report/**' } }
        }
      }
    }
    stage('Merge Reports') {
      agent { docker { image 'mcr.microsoft.com/playwright:v1.44-focal' } }
      steps {
        unarchive mapping: ['blob-report/**': '.']
        sh 'npx playwright merge-reports --reporter html ./blob-report'
        publishHTML target: [reportDir: 'playwright-report', reportFiles: 'index.html']
      }
    }
  }
}
```

// Expected gains: `fullyParallel` + 4 workers brings 18 min down to ~5 min on one agent. 
// Three shards across three agents brings wall-clock time down to ~2 min. 
// Chromium-only in PR builds saves an additional ~30% vs tri-browser runs.

// ---

// **Scoring guide:** each answer is worth up to 10 points. 
// Senior-level candidates should score ≥ 8/10 on at least 8 of the 10 questions, 
// demonstrating both conceptual depth and hands-on precision.