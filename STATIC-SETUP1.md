# Static Portfolio Setup Guide

## What We've Done

✅ **Converted EJS to Static HTML**: Created a build script that renders all EJS templates to static HTML files
✅ **Updated Form for Formspree**: Removed CSRF tokens and configured form to work with Formspree
✅ **Fixed Asset Paths**: Updated all CSS, JS, and image paths to work with static hosting
✅ **Created Static File Structure**: Organized files in the `/static` directory for GitHub Pages

## File Structure

```
static/
├── index.html          # Home page
├── about.html          # About page
├── work.html           # Work/Portfolio page
├── contact.html        # Contact page
├── thank-you.html      # Thank you page (after form submission)
├── css/               # Stylesheets
├── js/                # JavaScript files
└── assets/            # Images, icons, resume, etc.
```

## Next Steps

### 1. Set Up Formspree

1. Go to [https://formspree.io](https://formspree.io)
2. Sign up for a free account
3. Create a new form
4. Copy your form endpoint (it will look like `https://formspree.io/f/YOUR_FORM_ID`)
5. Replace `YOUR_FORM_ID` in `static/contact.html` (line ~123) with your actual form ID:

```html
<form
  class="contact-form"
  id="contactForm"
  action="https://formspree.io/f/YOUR_ACTUAL_FORM_ID"
  method="POST"
></form>
```

### 2. Deploy to GitHub Pages

#### Option A: Deploy the static folder directly

1. **Create a new repository** on GitHub for your portfolio (e.g., `portfolio-static`)

2. **Push only the static folder contents**:

   ```bash
   cd static
   git init
   git add .
   git commit -m "Initial portfolio commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/portfolio-static.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository settings
   - Scroll to "Pages" section
   - Set source to "Deploy from a branch"
   - Select "main" branch and "/ (root)"
   - Save

#### Option B: Use the current repository with docs folder

1. **Create docs folder and copy static files**:

   ```bash
   mkdir docs
   cp -r static/* docs/
   git add docs/
   git commit -m "Add static site for GitHub Pages"
   git push
   ```

2. **Enable GitHub Pages**:
   - Go to repository settings
   - Set Pages source to "main" branch and "/docs" folder

### 3. Update Build Script (Optional)

If you want to make changes to the site in the future, you can:

1. Edit the EJS templates in `src/views/`
2. Run `npm run build-static` to regenerate the static files
3. Copy the updated files to your GitHub Pages directory

### 4. Custom Domain (Optional)

If you have a custom domain:

1. Add a `CNAME` file to your static folder with your domain
2. Configure DNS settings with your domain provider
3. Enable HTTPS in GitHub Pages settings

## Important Notes

- **Formspree Free Tier**: Limited to 50 submissions per month
- **GitHub Pages**: Free for public repositories
- **Static Site**: No server-side processing, all functionality is client-side
- **Form Validation**: Now handled by HTML5 and browser validation (no server-side validation)

## Testing Locally

You can test the static site locally using:

```bash
cd static
python3 -m http.server 8080
# Then visit http://localhost:8080
```

## Maintenance

To update the site:

1. Make changes to EJS templates in `src/`
2. Run `npm run build-static`
3. Copy/commit the updated static files
4. Push to GitHub

Your portfolio is now ready for static hosting! 🎉
