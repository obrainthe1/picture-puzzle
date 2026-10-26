# 🧩 Picture Puzzle

**Look closely. Move the pieces. Complete the picture.**

Picture Puzzle is a web-based puzzle game built with React, TypeScript, and Vite. Turn images into puzzles and challenge your problem-solving skills.

🌐 **Play the live game:** [picture-to-puzzle.netlify.app](https://picture-to-puzzle.netlify.app)

This repository contains the app source along with the supporting workspace files used during development.

## ✨ Project

A picture-puzzle experience focused on turning a visual challenge into a simple, enjoyable game. The interface and gameplay can continue to evolve as the project grows.

## 🛠️ Built With

- **React** — component-based UI
- **TypeScript** — typed JavaScript
- **Vite** — development server and build tooling
- **Tailwind CSS / UI components** — styling and interface utilities where configured in the app

## 📁 Repository Layout

- `artifacts/picture-puzzle/` — main web application
- `artifacts/api-server/` — supporting API server files
- `artifacts/mockup-sandbox/` — mockup / sandbox project files
- `lib/` and `scripts/` — shared workspace utilities and scripts

## 🚀 Getting Started

This repository uses **pnpm** for its workspace. Make sure Node.js and pnpm are installed.

1. Clone the repository:

   ```bash
   git clone https://github.com/obrainthe1/picture-puzzle.git
   cd picture-puzzle
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the main app from its directory:

   ```bash
   cd artifacts/picture-puzzle
   pnpm dev
   ```

If your workspace setup uses a different script or requires the API server, check the relevant `package.json` files in the app and API folders.

## 🧑‍💻 Development

Useful workspace commands from the repository root may include:

```bash
pnpm run typecheck
pnpm run build
```

## 🗺️ Roadmap Ideas

- Polish the responsive experience for mobile and desktop
- Add more picture packs and difficulty levels
- Improve accessibility and keyboard support
- Add progress tracking and a clear restart flow
- Add automated checks for builds and core gameplay

## 🤝 Contributing

Suggestions and improvements are welcome. Open an issue to discuss a bug or feature idea before making a larger change.

## 📄 License

This project currently declares the MIT license in its root package configuration. Confirm the intended licensing for all included assets and dependencies before redistributing the project.

---

Made with curiosity and a love of puzzles by [obrainthe1](https://github.com/obrainthe1).
