# Maan Games / Zero to God website

This folder is ready for a plain static deployment on Cloudflare Pages.

## Repository layout

Upload the entire `public` folder to the root of your GitHub repository:

maan-games-site/
└── public/
    ├── index.html
    ├── assets/style.css
    └── zero-to-god/
        ├── index.html
        ├── privacy/index.html
        ├── support/index.html
        ├── terms/index.html
        └── data-deletion/index.html

## Cloudflare Pages settings

- Project name: `maan-games`
- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `public`
- Root directory: leave blank

## Expected URLs

- Main site: `https://maan-games.pages.dev/`
- Game page: `https://maan-games.pages.dev/zero-to-god/`
- Privacy: `https://maan-games.pages.dev/zero-to-god/privacy/`
- Support: `https://maan-games.pages.dev/zero-to-god/support/`
- Terms: `https://maan-games.pages.dev/zero-to-god/terms/`
- Local data: `https://maan-games.pages.dev/zero-to-god/data-deletion/`

Cloudflare may assign a slightly different pages.dev subdomain if the project name is unavailable.

## Important assumption

These pages state that the current app build has:
- no AdMob or other ad SDK;
- no analytics or Crashlytics;
- no login/accounts;
- no cloud saves;
- no in-app purchases;
- no direct collection of names, emails, or device information.

Do not publish the privacy policy unchanged if any advertising, analytics, crash reporting,
account, cloud-save, purchase, or other data-processing SDK is included in the release build.