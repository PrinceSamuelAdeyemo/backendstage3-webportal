# Backend Stage 3 Web Portal

Plain HTML, CSS, and JavaScript frontend for the Stage 3 backend API.

## Run Locally

From this folder:

```bash
python -m http.server 5500
```

Open:

```text
http://localhost:5500
```

Set the backend API URL in the page:

```text
http://localhost:8000/api/v1
```

For a hosted backend, replace it with your hosted API base URL, for example:

```text
https://your-backend.example.com/api/v1
```

## Login Methods

Password login uses:

```text
POST /api/v1/auth/login
```

GitHub login uses:

```text
GET /api/v1/auth/github/start
GET /api/v1/auth/github/callback
```

For GitHub OAuth, your GitHub OAuth app must allow the frontend URL as a callback URL, for example:

```text
http://localhost:5500/
```
