# 🚀 Project Two
### Multi-Project Branch Architecture

This branch (`project-two`) is an isolated, dedicated branch within the `mi-project-one` repository for managing **Project Two** independently from Operation Dead Drop (which lives on the `main` branch).

---

## 🌿 Branch Navigation Guide

| Project | Branch | Description |
| :--- | :--- | :--- |
| **Operation Dead Drop** | `main` | Zero-knowledge ephemeral incident war room (Rust Axum + React TS) |
| **Project Two** | `project-two` | Dedicated branch & workspace for Project Two |

To switch between projects:
```bash
# Switch to Operation Dead Drop
git checkout main

# Switch to Project Two
git checkout project-two
```

---

## 📁 Project Structure

```
.
├── .gitignore
├── README.md
├── context.md
└── projects/
    └── project-two/
```
