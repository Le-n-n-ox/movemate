# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Test on your phone

The Vite dev server already listens on all interfaces (`server.host: true`), so a phone on the same Wi-Fi can load the app at your computer's LAN IP.

1. Put phone and computer on the same Wi-Fi (not a guest network).
2. Find the computer's LAN IP (Windows): `ipconfig` → IPv4 Address, e.g. `192.168.100.13`.
3. Start the dev server: `npm run dev` (or the full stack with `docker compose up --build` from the repo root).
4. Open `http://<YOUR_IP>:3000` on the phone (e.g. `http://192.168.100.13:3000`).
5. Allow inbound TCP 3000 (frontend) and 8000 (backend/API) in your firewall.

If the phone shows an offline banner or blank data, the API is still pointing at `localhost`. Set the LAN IP in the repo-root `.env` and restart:

```
PUBLIC_BASE_URL=http://<YOUR_IP>:8000
FRONTEND_ORIGIN=http://<YOUR_IP>:3000
VITE_API_URL=http://<YOUR_IP>:8000
```

Then rebuild/restart the containers (`docker compose up -d --build`) and hard-refresh the phone. Verify from the PC with `curl http://<YOUR_IP>:8000/api/health`.

Camera: photos via the file picker work over plain HTTP. Live `getUserMedia` needs HTTPS on most phones; use a tunnel (e.g. `ngrok http 3000`) only if you need it.


You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
