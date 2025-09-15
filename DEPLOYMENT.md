# 🚀 Portfolio Deployment Guide

## Quick Start with Vercel (Recommended)

### Option 1: One-Click Deploy

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Sign up with GitHub
4. Click "New Project"
5. Import your portfolio repository
6. Click Deploy - Done! 🎉

### Option 2: CLI Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel

# Follow the prompts
```

## Alternative Free Hosting Options

### 🌐 Netlify

1. Connect GitHub repo at [netlify.com](https://netlify.com)
2. Build command: `npm run build` (if needed)
3. Publish directory: `src/public`

### 🚂 Railway

1. Go to [railway.app](https://railway.app)
2. "Deploy from GitHub repo"
3. Select your portfolio repo
4. Auto-deploys on push

### 🎨 Render

1. Go to [render.com](https://render.com)
2. "New Web Service"
3. Connect GitHub repo
4. Build/Start commands auto-detected

## GitHub Actions Setup

The included `.github/workflows/deploy.yml` will:

- ✅ Auto-deploy on every push to main
- ✅ Run tests (if you add them)
- ✅ Build and deploy to Vercel

### Setup GitHub Secrets (for Vercel):

1. Go to your repo → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `VERCEL_TOKEN`: Get from Vercel dashboard → Account → Tokens
   - `ORG_ID`: Get from Vercel project settings
   - `PROJECT_ID`: Get from Vercel project settings

## 🌟 Pro Tips

### Custom Domain (Free)

- Most platforms support custom domains
- Add CNAME record: `your-domain.com → yourapp.vercel.app`

### Environment Variables

- Add any secrets in your hosting platform's dashboard
- Never commit sensitive data to GitHub

### Performance

- Your site already includes:
  - ✅ Compression
  - ✅ Security headers
  - ✅ Static file optimization
  - ✅ Responsive design

## 📊 Monitoring

- Vercel: Built-in analytics
- Netlify: Built-in analytics
- Google Analytics: Add to your templates

## 🔧 Troubleshooting

### Common Issues:

- **Build fails**: Check Node.js version (use 18+)
- **Static files 404**: Verify `vercel.json` paths
- **Environment vars**: Set in platform dashboard

### Support:

- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Netlify: [docs.netlify.com](https://docs.netlify.com)
- Railway: [docs.railway.app](https://docs.railway.app)

## 🎯 Next Steps

1. Choose a platform
2. Deploy your portfolio
3. Test all functionality
4. Share your awesome portfolio! 🌟
