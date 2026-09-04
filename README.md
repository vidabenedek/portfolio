# Portfolio

Static site for GitHub Pages deployment.

## Deploy

This repository now deploys automatically to GitHub Pages from the `main` branch using GitHub Actions.

Expected site URL:

`https://vidabenedek.com/`

## One-time GitHub setup

1. Push this repo to GitHub.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. After the workflow finishes, the site will be published at the URL above.

## Local entry point

GitHub Pages serves `index.html`, so the live site entry file is now `index.html`.
The original `elso-oldal.html` file is still kept in the repo unchanged.

## Post-deployment SEO checklist

1. Add `vidabenedek.com` as a Domain Property in Google Search Console.
2. Verify ownership via DNS.
3. Submit `https://vidabenedek.com/sitemap.xml`.
4. Inspect `https://vidabenedek.com/` and request indexing.
5. Inspect `https://vidabenedek.com/showreel/` and request indexing.
6. Test the structured data with Google Rich Results Test and Schema Markup Validator.
7. Check PageSpeed Insights and the Core Web Vitals report.
8. Recheck indexing, structured data and Core Web Vitals after deployment.
