# How to Add a New Deployment Environment

This guide provides a step-by-step process for setting up a new deployment environment (e.g., `dev`, `testing`) with its own custom URL.

**Example:** We will add a new environment named `dev` that will be accessible at `dev.yourdomain.com` (for the frontend) and `https://dev.strzel-sobie-worker.<YOUR_SUBDOMAIN>.workers.dev` (for the backend worker).

### Prerequisites

- You have a custom domain registered and managed within your Cloudflare account.
- You have administrator access to the Cloudflare account and the GitHub repository.

---

### Step 1: Create New Cloudflare Resources

For each new environment, you must create a separate set of resources to ensure isolation.

1.  **Create a D1 Database:**
    - Go to `Workers & Pages` > `D1` in your Cloudflare dashboard.
    - Create a new database (e.g., `strzel-sobie-db-dev`).
    - Note the **Database ID**.

2.  **Create a KV Namespace:**
    - Go to `Workers & Pages` > `KV`.
    - Create a new namespace (e.g., `sessions-kv-dev`).
    - Note the **Namespace ID**.

---

### Step 2: Update `wrangler.jsonc`

Add a configuration block for your new environment in `src/worker/wrangler.jsonc`.

```jsonc
// src/worker/wrangler.jsonc
{
  // ... other configurations
  "env": {
    "dev": { // New environment block
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "strzel-sobie-db-dev",
          "database_id": "${D1_DATABASE_ID_DEV}"
        }
      ],
      "kv_namespaces": [
        {
          "binding": "SESSIONS_KV",
          "id": "${SESSIONS_KV_ID_DEV}"
        }
      ]
    },
    "staging": {
      // ... staging config
    },
    "production": {
      // ... production config
    }
  }
}
```

---

### Step 3: Configure the Cloudflare Worker

1.  **Add Environment Variables:**
    - Go to your `strzel-sobie-worker` > `Settings` > `Variables`.
    - For the `dev` environment, add the following secrets, using the IDs you noted in Step 1:
        - `D1_DATABASE_ID_DEV`: The ID of your new D1 database.
        - `SESSIONS_KV_ID_DEV`: The ID of your new KV namespace.

---

### Step 4: Configure Cloudflare Pages

1.  **Add a Custom Domain for the Frontend:**
    - Go to your `strzel-sobie-client` Pages project > `Custom domains`.
    - Add the new custom domain you want to use for the frontend (e.g., `dev.yourdomain.com`). Cloudflare will guide you through the DNS validation process if needed.

---

### Step 5: Update the `deploy.yml` Workflow

Finally, update the GitHub Actions workflow to recognize the new environment and its URL.

1.  **Add Environment to Input List:**
    - In `.github/workflows/deploy.yml`, add `dev` to the list of options for the `environment` input.

    ```yaml
    on:
      workflow_dispatch:
        inputs:
          environment:
            description: 'Environment to deploy to'
            required: true
            type: choice
            options:
              - dev # Add new environment here
              - staging
              - production
    ```

2.  **Update URL Logic:**
    - Modify the `Set up environment-specific variables` step to handle the new `dev` environment and its custom URL.

    ```yaml
    - name: Set up environment-specific variables
      id: vars
      run: |
        if [ "${{ github.event.inputs.environment }}" == "production" ]; then
          echo "WORKER_URL=https://strzel-sobie-worker.${{ vars.CLOUDFLARE_WORKERS_SUBDOMAIN }}" >> $GITHUB_ENV
        elif [ "${{ github.event.inputs.environment }}" == "dev" ]; then
          echo "WORKER_URL=https://dev.strzel-sobie-worker.${{ vars.CLOUDFLARE_WORKERS_SUBDOMAIN }}" >> $GITHUB_ENV # Use default workers.dev URL
        else
          echo "WORKER_URL=https://${{ github.event.inputs.environment }}.strzel-sobie-worker.${{ vars.CLOUDFLARE_WORKERS_SUBDOMAIN }}" >> $GITHUB_ENV
        fi
    ```

After completing these steps, you will be able to select `dev` from the "Run workflow" dropdown, and the action will deploy your application to the new custom URLs with its own isolated database and session storage.
