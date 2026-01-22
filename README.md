# OCSF Mapper

> **Note:** This project is in **active development**.

OCSF Mapper is a tool designed to help security engineers and developers map arbitrary JSON data (such as logs or events) to the [Open Cybersecurity Framework (OCSF)](https://ocsf.io/) schema. It provides an interactive interface to define mappings and generate code snippets for data transformation.

## 🚀 Live Demo

Check out the live version here: [https://ocsf-mapper.northernlight.workers.dev/](https://ocsf-mapper.northernlight.workers.dev/)

## ✨ Features

- **JSON Schema Parsing**: Import your sample JSON to automatically extract fields.
- **OCSF Integration**: Browse and select OCSF categories and classes.
- **Interactive Mapping**: Map JSON fields to OCSF attributes with ease.
- **Conditional Mapping**: Define different OCSF classes based on field values.
- **Code Generation**: Automatically generate mapping logic for your applications.
- **Enum Mapping**: Map source values to OCSF enumeration values.

## 🛠️ Development

This project is built with [SvelteKit](https://kit.svelte.dev/) and [Tailwind CSS](https://tailwindcss.com/), and it is designed to be deployed on [Cloudflare Workers](https://workers.cloudflare.com/).

### Prerequisites

- Node.js
- npm

### Setup

1. Install dependencies:
   ```sh
   npm install
   ```

2. Start the development server:
   ```sh
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`.

### Building and Deployment

To build the project for production:
```sh
npm run build
```

To deploy to Cloudflare Workers using Wrangler:
```sh
npm run deploy
```

## 📜 License

See the [LICENSE](LICENSE) file for details.
