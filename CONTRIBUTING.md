# Contributing to docs-healthcheck

Thank you for your interest in improving `docs-healthcheck`! We welcome issues, suggestions, documentation improvements, and pull requests.

---

## 🛠️ Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/muhamadzolfaghari/docs-healthcheck.git
   cd docs-healthcheck
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Run tests:**
   ```bash
   npm run test
   npm run test:coverage
   ```

---

## 🧪 Testing Guidelines

- All new rules, parsers, and utilities must include unit tests in `tests/unit/`.
- Ensure test coverage remains at or above **80%**.
- Check TypeScript type compliance with `npm run lint`.

---

## 🚀 Pull Request Process

1. Create a descriptive feature branch: `git checkout -b feature/my-new-rule`.
2. Ensure all tests and builds pass cleanly: `npm run prepublishOnly`.
3. Follow conventional commits (`feat: ...`, `fix: ...`, `docs: ...`).
4. Submit your pull request against the `main` branch.
