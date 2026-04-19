# Goal.md — RAG GitHub + Ollama Repo Chat Tool

Build a lightweight local web application that lets a user:

1. Enter a GitHub repository URL or owner/repo
2. Navigate to /repo/:owner/:repo
3. Load GitHub metadata
4. Clone the repository locally with one click
5. Build a local RAG index with Ollama embeddings
6. Ask questions about the repository in a chatbot
7. Browse files in a GitHub-inspired 3-panel layout

## Required structure
- server.js
- /helpers
- /public
- index.html served from /public

## Principles
- dry code
- lightweight dependencies
- thin route handlers
- responsive frontend
- local-first storage
- fast startup

## Notes
Use Ollama locally for both embeddings and generation. Skip heavy folders and large files. Prefer simple readable code over unnecessary abstraction.
