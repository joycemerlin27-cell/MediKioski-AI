# Render build fix

The Render build was failing because Render selected Node.js 26.x while this project uses better-sqlite3 11.x. This version pins Node.js 22.22.0.

## GitHub
Upload/replace the project files, including `.node-version`.

## Render
If your service has a manually configured `NODE_VERSION`, set it to `22.22.0`, then redeploy.

Build command: `npm install`
Start command: `npm start`

No folders are required in the repository.
