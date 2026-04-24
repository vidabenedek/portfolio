# Portfolio

Static site for GitHub Pages deployment.

## Deploy

This repository now deploys automatically to GitHub Pages from the `main` branch using GitHub Actions.

Expected site URL:

`https://vidabenedek.github.io/portfolio/`

## One-time GitHub setup

1. Push this repo to GitHub.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. After the workflow finishes, the site will be published at the URL above.

## Local entry point

GitHub Pages serves `index.html`, so the live site entry file is now `index.html`.
The original `elso-oldal.html` file is still kept in the repo unchanged.
