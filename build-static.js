#!/usr/bin/env node

const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const portfolioData = require("./src/models/data");

// Configuration
const srcDir = "./src";
const outputDir = "./static";
const viewsDir = path.join(srcDir, "views");
const publicDir = path.join(srcDir, "public");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Copy public assets to static directory
function copyAssets() {
  console.log("📁 Copying assets...");

  // Copy CSS files
  const cssSource = path.join(publicDir, "css");
  const cssTarget = path.join(outputDir, "css");
  if (fs.existsSync(cssSource)) {
    fs.cpSync(cssSource, cssTarget, { recursive: true });
    console.log("✅ CSS files copied");
  }

  // Copy JS files
  const jsSource = path.join(publicDir, "js");
  const jsTarget = path.join(outputDir, "js");
  if (fs.existsSync(jsSource)) {
    fs.cpSync(jsSource, jsTarget, { recursive: true });
    console.log("✅ JS files copied");
  }

  // Copy assets directory
  const assetsSource = path.join(publicDir, "assets");
  const assetsTarget = path.join(outputDir, "assets");
  if (fs.existsSync(assetsSource)) {
    fs.cpSync(assetsSource, assetsTarget, { recursive: true });
    console.log("✅ Asset files copied");
  }
}

// Render EJS template to HTML with layout
async function renderTemplate(templatePath, data, outputPath) {
  try {
    // First render the page content
    const pageContent = await ejs.renderFile(templatePath, data, {
      views: [viewsDir],
      filename: templatePath,
    });

    // Then render the layout with the page content as body
    const layoutPath = path.join(viewsDir, "layouts/main.ejs");
    const html = await ejs.renderFile(
      layoutPath,
      {
        ...data,
        body: pageContent,
      },
      {
        views: [viewsDir],
        filename: layoutPath,
      }
    );

    fs.writeFileSync(outputPath, html);
    console.log(`✅ Generated: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error rendering ${templatePath}:`, error.message);
    return false;
  }
}

// Main build function
async function buildStatic() {
  console.log("🚀 Building static site from EJS templates...\n");

  // Copy assets first
  copyAssets();
  console.log("");

  // Define pages to render
  const pages = [
    {
      template: path.join(viewsDir, "pages/home.ejs"),
      output: path.join(outputDir, "index.html"),
      data: {
        title: "Home",
        data: portfolioData,
        // Remove CSRF token for static site
        csrfToken: "",
      },
    },
    {
      template: path.join(viewsDir, "pages/about.ejs"),
      output: path.join(outputDir, "about.html"),
      data: {
        title: "About",
        data: portfolioData,
        csrfToken: "",
      },
    },
    {
      template: path.join(viewsDir, "pages/work.ejs"),
      output: path.join(outputDir, "work.html"),
      data: {
        title: "Work",
        data: portfolioData,
        csrfToken: "",
      },
    },
    {
      template: path.join(viewsDir, "pages/contact.ejs"),
      output: path.join(outputDir, "contact.html"),
      data: {
        title: "Contact",
        data: portfolioData,
        csrfToken: "",
      },
    },
    {
      template: path.join(viewsDir, "pages/thank-you.ejs"),
      output: path.join(outputDir, "thank-you.html"),
      data: {
        title: "Thank You",
        data: portfolioData,
        csrfToken: "",
      },
    },
  ];

  console.log("📝 Rendering pages...");

  let successCount = 0;
  for (const page of pages) {
    const success = await renderTemplate(page.template, page.data, page.output);
    if (success) successCount++;
  }

  console.log("");
  console.log(
    `🎉 Build complete! Generated ${successCount}/${pages.length} pages.`
  );
  console.log(`📂 Output directory: ${outputDir}`);

  if (successCount === pages.length) {
    console.log("");
    console.log("Next steps:");
    console.log("2. Test the static site locally");
    console.log("3. Deploy to GitHub Pages");
  }
}

// Run the build
if (require.main === module) {
  buildStatic().catch(console.error);
}

module.exports = { buildStatic };
