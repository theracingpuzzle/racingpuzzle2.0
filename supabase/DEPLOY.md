# Supabase Edge Functions — Deploy Guide

## Prerequisites

Install the Supabase CLI (if not already):
```bash
brew install supabase/tap/supabase
```

Login and link to your project:
```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Your project ref is the string in your Supabase URL:
`https://XXXXXXXXXXXXXXXX.supabase.co` → project ref = `XXXXXXXXXXXXXXXX`

---

## delete-user

Deletes a user's auth record from Supabase Auth using the service role key.
Data rows are deleted by the function too (belt-and-braces alongside the client-side deletion).

### Deploy

```bash
supabase functions deploy delete-user --no-verify-jwt
```

The `--no-verify-jwt` flag is needed because the function verifies the JWT manually
(so it can extract the user ID from the token).

### Environment variables

The function automatically has access to:
- `SUPABASE_URL` — your project URL
- `SUPABASE_ANON_KEY` — anon key
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (needed for auth.admin.deleteUser)

These are injected automatically by Supabase for all Edge Functions — no manual setup needed.

### Test

After deploying, test it with:
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/delete-user \
  -H "Authorization: Bearer <a valid user JWT>" \
  -H "Content-Type: application/json"
```

A successful response:
```json
{ "success": true }
```

### How the client uses it

In `js/legal.js`, `authDeleteAccount()` calls:
```
POST /functions/v1/delete-user
Authorization: Bearer <user JWT>
```

If the function returns 404 (not yet deployed), it falls back to client-side
data deletion + sign out automatically — so the app works either way.

---

## Adding more functions

Create a new folder under `supabase/functions/<function-name>/` with an `index.ts`,
then deploy with `supabase functions deploy <function-name>`.
