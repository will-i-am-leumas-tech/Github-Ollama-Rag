# Leumas Repo RAG

Local-first GitHub repository RAG tool powered by Ollama.

## Features
- enter a GitHub repo
- clone it locally
- build a local RAG index
- browse files
- ask Ollama questions about the repository

## Install
```bash
npm install
copy .env.example .env
npm start
```

On macOS/Linux, use:
```bash
cp .env.example .env
```

## Requirements
- Node.js 18+
- Git installed and available in PATH
- Ollama running locally
- recommended models:
  - chat: llama3.1
  - embeddings: nomic-embed-text

## Run Ollama
```bash
ollama pull llama3.1
ollama pull nomic-embed-text
ollama serve
```

## Start App
```bash
npm install
npm start
```

Open:
`http://localhost:3000`

## Run Tests
```bash
npm test
```

## Notes
- Setup clones the repo into `./data/repos`
- Indexes are stored in `./data/indexes`
- Large files and common heavy folders are skipped
- This MVP is intentionally lightweight and dependency-minimal
