# WOWOS FAST TRACK

## Password recovery

The backend sends password reset links through SMTP. Configure these environment
variables in `backend/.env`:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` for the SMTP server
- `SMTP_SECURE=true` to force TLS (port 465 enables it automatically)
- `MAIL_FROM` for the sender address
- `FRONTEND_URL` for the deployed frontend origin, such as `https://example.com`

Reset tokens are single-use, stored hashed, and expire after five minutes.

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
