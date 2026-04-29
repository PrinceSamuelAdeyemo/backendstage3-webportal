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

On localhost, the page defaults to the local backend API:

```text
http://localhost:8000/api/v1
```

On the hosted web portal, it defaults to the live backend API:

```text
https://hng14stage3-backend.vercel.app/api/v1
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

For GitHub OAuth, your GitHub OAuth app must allow the frontend URL as a callback URL for the static web client:

```text
http://localhost:5500/
https://backendstage3-webportal.vercel.app/
```
