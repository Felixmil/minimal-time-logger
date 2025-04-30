# Minimal Time Logger

A simple, browser-based time tracking application that works without a backend server.

## Features

- Track time for multiple projects
- Start/stop timers or add manual time entries
- Generate monthly reports with charts
- Export data as JSON, CSV, or PDF
- Archive completed projects

## GitHub Pages Deployment

This app can be deployed to GitHub Pages by following these steps:

1. Fork or push this repository to your GitHub account
2. Go to your repository's Settings > Pages
3. Under "Source", select "GitHub Actions"
4. The app will automatically be deployed when you push to the main branch

The app automatically detects when it's running on GitHub Pages and will:
- Disable development mode
- Store all data in your browser's localStorage
- Allow export/import of data for backup purposes

## Development Mode

When running locally:
- If localStorage is empty, the app will attempt to load sample data from `data.json`
- For local development, you can run with the included Express server:
  ```
  npm install
  npm start
  ```

## Data Storage

- All data is stored in your browser's localStorage
- Export your data regularly as JSON for backup
- No data is sent to any server (when running on GitHub Pages)

## License

MIT License 