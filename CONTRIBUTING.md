# Contributing to Local Chat

Thank you for your interest in contributing to **Local Chat** — an open-source project by [Triode Devs](https://github.com/triode-devs)! 🎉

## Getting Started

### Prerequisites

- [VS Code](https://code.visualstudio.com/) 1.85+
- [Node.js](https://nodejs.org/) 18+
- Git

### Setup

```bash
git clone https://github.com/triode-devs/local-chat.git
cd local-chat
npm install
```

Press **F5** in VS Code to launch the Extension Development Host and test your changes live.

## How to Contribute

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/your-feature-name`
3. **Make changes** and test with F5
4. **Commit**: `git commit -m "feat: describe your change"`
5. **Push**: `git push origin feature/your-feature-name`
6. **Open a Pull Request** against `main`

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix      | When to use           |
| ----------- | --------------------- |
| `feat:`     | New feature           |
| `fix:`      | Bug fix               |
| `docs:`     | Documentation changes |
| `style:`    | CSS/UI changes        |
| `refactor:` | Code refactoring      |
| `chore:`    | Build/tooling changes |

## Code Style

- **Pure JavaScript** — no TypeScript, no bundlers
- Keep files focused and small
- Comment non-obvious networking logic
- No external runtime dependencies

## Reporting Bugs

Open an [issue](https://github.com/triode-devs/local-chat/issues) with:

- VS Code version
- OS and Node.js version
- Steps to reproduce
- Expected vs actual behavior

## Feature Requests

Open an issue with the `enhancement` label and describe your idea.

---

**Triode Devs** — building open tools for developers. ❤️
