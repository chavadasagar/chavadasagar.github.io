# 🔄 Git Commit Conventions

This document specifies the git commit message standards for contributors and AI agents working on this repository.

---

## 1. Conventional Commit Format

All commit messages should follow the Conventional Commits specification:

```text
<type>(<scope>): <short description>
```

### Supported Types:
- `feat`: A new web tool, feature, or component added
- `fix`: A bug fix in an existing tool or script
- `docs`: Documentation changes (READMEs, docs/ folder updates, index updates)
- `style`: Changes that do not affect code logic (white-space, formatting, CSS polish)
- `refactor`: Code rewrite or performance optimization without changing features
- `chore`: Maintenance tasks (scaffolding scripts, workflow updates)

---

## 2. Examples

- `feat(image-compressor): add batch ZIP download support`
- `fix(qr-generator): resolve camera permission error on mobile safari`
- `docs(root): add AGENTS.md and docs standards folder`
- `chore(scripts): update manage_md.py to auto-categorize systems`

---

## 3. Strict Git Push Authorization Policy

- 🚫 **NEVER Auto-Push**: NEVER execute `git push` automatically or without explicit user directive under ANY condition.
- 💬 **User Confirmation Required**: Staging (`git add`) and committing (`git commit`) locally is allowed during development, but `git push` MUST ONLY be executed when the user explicitly asks to push to remote (e.g. *"push kar do"*, *"commit aur push karo"*).
