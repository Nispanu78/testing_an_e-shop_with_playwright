// ### Theoretical Questions

// ---

// **Q1. What is the Page Object Model (POM) and why is it important in a scalable test automation framework?**
// **A:** POM is a design pattern that creates an abstraction layer between test logic and UI interactions. 
// Each page or component is represented by a class that encapsulates locators and actions. Its importance:

// - Reduces duplication — locator changes are made in one place
// - Improves readability — tests describe *what* is being tested, not *how* to find elements
// - Enables reusability — page classes are shared across multiple test files
// - Easier maintenance at scale — a UI change only requires updating one class, not every test


// A senior engineer should also know when *not* to use POM strictly (e.g., for pure API tests or highly dynamic UIs 
//where component-based models work better).

// ---

// **Q2. What strategies would you use to identify and eliminate flaky tests?**
// **A:** Flaky tests are non-deterministic — they pass and fail without code changes. Strategies:

// - **Root cause analysis**: Run the failing test in isolation vs. in a suite to detect order-dependency
// - **Retry logic**: Use `retries` in config as a short-term measure, never as a fix
// - **Deterministic waits**: Replace `waitForTimeout` with `waitForSelector`, `waitForResponse`, or `waitForLoadState`
// - **Test isolation**: Each test must have its own state — avoid shared global state between tests
// - **Network stability**: Mock external APIs to remove third-party flakiness
// - **Race conditions**: Use `expect.poll` or explicit assertions instead of assumptions about timing
// - **Tracing**: Enable Playwright trace on retry to capture what happened just before the failure

// A senior engineer treats flakiness as a defect, not a quirk.

// ---

 
// **Q3. How does Docker contribute to consistent test execution in CI/CD?**
// **A:** Docker removes the "works on my machine" problem by:

// - **Encapsulating dependencies**: Browser binaries, Node version, and OS are pinned in a `Dockerfile`
// - **Reproducibility**: Every pipeline run uses the same image — no environment drift
// - **Parallelism in CI**: Multiple Docker containers can run test shards simultaneously
// - **Browser isolation**: `mcr.microsoft.com/playwright` images ship with Chromium, Firefox, 
// and WebKit pre-installed at the correct versions
// - **Artifact collection**: Volumes mount reports and traces out of the container for inspection

// A senior engineer knows how to write a multi-stage `Dockerfile` and configure `docker-compose` for local parity with CI.

// ---

// **Q4. What is the difference between mocking at the network layer vs. mocking at the service layer, and when would you choose each?**
// **A:**

// - **Network layer mocking** (Playwright `page.route()`, MSW): Intercepts HTTP requests in the browser/Node process and returns 
// fabricated responses. Best for UI tests where you want to control backend data without spinning up services.
// - **Service layer mocking** (WireMock, Pact, test doubles): Replaces the actual service with a configurable 
// stub at the infrastructure level. Best for integration or contract tests where multiple consumers depend on the same contract.

// Choose network mocking when: you need fast, isolated UI tests with predictable data. 
// Choose service mocking when: you need to verify contract compliance or simulate downstream failures at an integration level.

// ---

// **Q5. How would you design a test architecture for a project that has both UI and API tests sharing authentication state?**
// **A:** A well-designed architecture would:

// 1. **Centralise auth in a fixture** — a custom Playwright fixture handles login once, stores the `storageState` (cookies/tokens), 
// and reuses it across tests via `use({ storageState })`. No test logs in individually.
// 2. **Separate concerns** — `api/` folder for API helpers, `pages/` for POM classes, `fixtures/` for setup/teardown, `data/` for 
// test data
// 3. **Typed API clients** — TypeScript interfaces mirror the API contracts so both UI and API tests share the same data models
// 4. **Layered config** — `playwright.config.ts` defines projects (chromium, API-only) that inherit from a base config
// 5. **CI sharding** — UI tests and API tests run in parallel shards to reduce total pipeline time

 

// ---

// ### Practical Questions

// ---

// **P1. Write a Playwright fixture in TypeScript that provides an authenticated API context and a logged-in browser page, 
// reusable across all tests.**
// **A:**

// fixtures/authFixture.ts

import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  apiContext: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.API_BASE_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });
    await use(api);
    await api.dispose();
  },

  authenticatedPage: async ({ browser }, use) => {
    const page = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    }).then(ctx => ctx.newPage());

    await use(page);
    await page.context().close();
  },
});

export { expect };

// ```

// The `storageState` file is generated once by a global setup script that performs the actual login.

// ---

//  **P2. You have a test that intermittently fails because a network response arrives after an assertion runs. 
//  How do you fix it in Playwright?**
// **A:** The fix is to wait for the network response *before* asserting, using `waitForResponse`:

// Flaky version — assertion may run before response arrives

await page.click('#submit-button');
await expect(page.locator('.success-message')).toBeVisible();


// Stable version — explicitly wait for the API call to complete

const [response] = await Promise.all([
  page.waitForResponse(res =>
    res.url().includes('/api/submit') && res.status() === 200
  ),
  page.click('#submit-button'),
]);

 

expect(response.ok()).toBeTruthy();
await expect(page.locator('.success-message')).toBeVisible();

// ```

// `Promise.all` is critical here — starting the wait *before* clicking ensures the response is captured even 
// if it resolves before the next line executes.

// ---

//  **P3. Write a Playwright test that mocks a GET `/api/vehicles` endpoint to return controlled data and 
//  verifies the UI renders it correctly.**
// **A:**

// tests/vehicleList.spec.ts

import { test, expect } from '@playwright/test';

const mockVehicles = [
  { id: '1', make: 'Toyota', model: 'Corolla', year: 2022 },
  { id: '2', make: 'Honda',  model: 'Civic',   year: 2021 },
];

 
test('renders vehicle list from mocked API', async ({ page }) => {
  await page.route('**/api/vehicles', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockVehicles),
    });
  });

  await page.goto('/vehicles');
  const rows = page.locator('[data-testid="vehicle-row"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('Toyota Corolla');
});

// ```
// This test is fully isolated from the backend — it runs identically in any environment.
// ---

//  **P4. How do you configure Playwright to execute tests in parallel shards in a Jenkins pipeline 
// and produce a unified HTML report?**
// A:
// To implement parallel test execution with Playwright in Jenkins, you need to address two layers:
// Playwright configuration → enables sharding and blob reporting
// Jenkins pipeline orchestration → runs shards in parallel and merges results
// 1. Playwright Configuration

// Configure Playwright to:
// Use multiple workers (intra-shard parallelism)
// Generate blob reports for later aggregation

import { defineConfig } from '@playwright/test';

export default defineConfig({
  workers: 4,
  retries: 1,
  reporter: [['blob', { outputDir: 'blob-report' }]],
});


// 2. Jenkins Pipeline (Parallel Sharding + Report Merge)

pipeline {
    agent none

    stages {

        stage('Execute Playwright Shards') {
            parallel {

                stage('Shard 1') {
                    agent {
                        docker {
                            image 'mcr.microsoft.com/playwright:v1.44.0-jammy'
                            args '-u root'
                        }
                    }
                    steps {
                        checkout scm
                        sh 'npm ci'
                        sh 'npx playwright test --shard=1/4'
                        stash name: 'blob-report-1', includes: 'blob-report/**'
                    }
                }

                stage('Shard 2') {
                    agent {
                        docker {
                            image 'mcr.microsoft.com/playwright:v1.44.0-jammy'
                            args '-u root'
                        }
                    }
                    steps {
                        checkout scm
                        sh 'npm ci'
                        sh 'npx playwright test --shard=2/4'
                        stash name: 'blob-report-2', includes: 'blob-report/**'
                    }
                }

                stage('Shard 3') {
                    agent {
                        docker {
                            image 'mcr.microsoft.com/playwright:v1.44.0-jammy'
                            args '-u root'
                        }
                    }
                    steps {
                        checkout scm
                        sh 'npm ci'
                        sh 'npx playwright test --shard=3/4'
                        stash name: 'blob-report-3', includes: 'blob-report/**'
                    }
                }

                stage('Shard 4') {
                    agent {
                        docker {
                            image 'mcr.microsoft.com/playwright:v1.44.0-jammy'
                            args '-u root'
                        }
                    }
                    steps {
                        checkout scm
                        sh 'npm ci'
                        sh 'npx playwright test --shard=4/4'
                        stash name: 'blob-report-4', includes: 'blob-report/**'
                    }
                }
            }
        }

        stage('Merge Playwright Reports') {
            agent {
                docker {
                    image 'mcr.microsoft.com/playwright:v1.44.0-jammy'
                    args '-u root'
                }
            }
            steps {
                checkout scm

                unstash 'blob-report-1'
                unstash 'blob-report-2'
                unstash 'blob-report-3'
                unstash 'blob-report-4'

                sh '''
                    mkdir -p all-blobs
                    cp -r blob-report-*/* all-blobs/ || true
       

                sh 'npx playwright merge-reports --reporter html ./all-blobs'

                archiveArtifacts artifacts: 'playwright-report/**', fingerprint: true
            }
        }
    }
}

**P5. A test fails only in CI but passes locally. Walk through how you would debug it using Playwright's built-in tooling.**
**A:** Step-by-step approach:
1. **Enable tracing on CI** — in `playwright.config.ts` set `trace: 'on-first-retry'` (or `'on'` temporarily). 
This captures DOM snapshots, network traffic, and console logs for every action.
2. **Upload the trace as a CI artifact**:

pipeline {
    agent any

    stages {
        stage('Run Tests') {
            steps {
                // your test execution here
                sh 'npm test'
            }
        }
    }

    post {
        failure {
            archiveArtifacts artifacts: 'test-results/**', fingerprint: true
        }
    }
}

 
3. **Open the trace locally**:
   ```bash
   npx playwright show-trace trace.zip
   ```
   This gives a timeline of every action with before/after DOM snapshots.


4. **Check for environment differences**:
   - Is `BASE_URL` pointing to the right environment?
   - Are environment variables injected correctly in CI secrets?
   - Is the Docker image browser version mismatched with the installed Playwright version?

5. **Enable video recording** — `video: 'on-first-retry'` to visually confirm whether the page rendered at all.
 
6. **Check CI logs for network errors** — trace's network tab shows failed requests that may not fail loudly in assertions.

7. **Reproduce with Docker locally**:

   ```bash

   docker run --rm -v $(pwd):/app -w /app \
     mcr.microsoft.com/playwright:v1.44.0-jammy \
     npx playwright test --project=chromium

   ```
   This eliminates OS and browser version differences as variables.

---

These questions progressively assess architecture thinking, debugging depth, CI/CD maturity, and TypeScript proficiency — 
the key differentiators between a mid-level and senior QA engineer.