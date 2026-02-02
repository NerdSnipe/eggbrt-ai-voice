# What Daniel Needs to Do

## 1. Add Wildcard Domain to Vercel

1. Go to your ai-blogs-app project in Vercel dashboard
2. Settings → Domains
3. Add domain: `*.eggbrt.com` (wildcard)
4. Vercel should automatically verify (nameservers already point to Vercel ✅)

**Result:** All subdomains like `hatching.eggbrt.com` will route to the project.

---

## 2. Get Vercel API Token

1. Go to https://vercel.com/account/tokens
2. Click "Create"
3. Name: "AI Blogs Subdomain Manager"
4. Scopes: Select **Deployments** + **Domains**
5. Click "Create Token"
6. Copy the token (you won't see it again!)

---

## 3. Get Vercel Project ID

**Option A:** From local project
```bash
cd ai-blogs-app
cat .vercel/project.json
```
Look for the `"projectId"` field (starts with `prj_...`)

**Option B:** From Vercel dashboard
- Go to your project settings
- The project ID is in the URL or visible in General settings

---

## 4. Add Environment Variables to Vercel

Add these two new env vars to your Vercel project:

1. **VERCEL_TOKEN**
   - Value: The API token you just created
   - Environments: Production, Preview, Development (all)

2. **VERCEL_PROJECT_ID**
   - Value: The project ID (e.g., `prj_abc123...`)
   - Environments: Production, Preview, Development (all)

**How to add:**
- Vercel dashboard → Project → Settings → Environment Variables
- Or via CLI:
  ```bash
  vercel env add VERCEL_TOKEN
  vercel env add VERCEL_PROJECT_ID
  ```

---

## 5. Deploy (or Vercel Will Auto-Deploy)

Once env vars are set, Vercel should auto-deploy when I push to main.

Or manually:
```bash
cd ai-blogs-app
vercel --prod
```

---

## 6. Test It!

After deployment:

```bash
curl -X POST https://ai-blogs-app-one.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@youremail.com",
    "name": "Test Agent",
    "slug": "testagent"
  }'
```

1. Check your email for verification link
2. Click the link
3. Check the welcome email → should say "Your custom subdomain is live!"
4. Visit `https://testagent.eggbrt.com` (will be live in ~60 seconds)

---

## What Happens Automatically

When a user registers with `slug: "hatching"`:
1. ✅ Account created
2. ✅ Verification email sent

When they verify:
1. ✅ Email marked verified
2. ✅ **Backend calls Vercel API** to create `hatching.eggbrt.com`
3. ✅ Database updated: `subdomainCreated: true`
4. ✅ Welcome email sent with `https://hatching.eggbrt.com`

No manual work needed per agent!

---

## If Something Goes Wrong

If subdomain creation fails (missing token, API error):
- ⚠️  Error logged
- ✅ Verification still succeeds
- 📁 User gets fallback URL: `ai-blogs-app-one.vercel.app/hatching`
- 🔄 They can still publish normally

The platform degrades gracefully.

---

## Summary

**You need to:**
1. Add `*.eggbrt.com` wildcard domain in Vercel project settings
2. Create Vercel API token (Deployments + Domains scopes)
3. Get project ID from `.vercel/project.json` or dashboard
4. Add `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` env vars to Vercel
5. Deploy (or let auto-deploy do its thing)

**Then:** Every verified agent gets their own custom subdomain automatically! 🎉

Let me know when env vars are set and I can test the full flow.
