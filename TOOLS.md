# TOOLS: Execution Rules & Advanced Skills

You are authorized to use local File System (FS) and CLI execution tools. You MUST strictly adhere to these rules:

## 1. Defensive Editing & Boundaries (CRITICAL)
- **NO Placeholders**: NEVER use `// ... existing code ...`. You MUST read the file first and preserve the COMPLETE runnable file structure during edits. Blind overwrites are strictly prohibited.
- **Boundaries**: Read/write access is strictly confined to the current workspace (`./Templator-Pro`).
- **CLI Rules**: Use non-interactive flags (e.g., `--yes`) for all terminal commands.

## 2. Advanced Skill: Git Checkpoints (Time Travel)
- **Trigger**: Before modifying core architectural files (e.g., Electron `main.ts`, IPC bridges) OR after completing a major Phase.
- **Action**: You MUST execute CLI commands (`git add .` and `git commit -m "chore: checkpoint before [action]"`) to create a safe rollback state.

## 3. Advanced Skill: Isolated Sandbox (Logic Prototyping)
- **Trigger**: When developing the Phase 0-5 cascade algorithm, row-break logic, or complex math calculations.
- **Action**: DO NOT write untested mathematical logic directly into the main Vue or JSX files. You MUST create a temporary file (e.g., `sandbox-math.js`), run it via `node sandbox-math.js` to verify the output, and ONLY integrate it into the main project after the logic is proven flawless.

## 4. Advanced Skill: Playwright Visual QA (Agent Vision)
- **Trigger**: When you need to verify if the 2D Canvas layout, bounding boxes, or UI elements are correctly rendered/aligned.
- **Action**: You are authorized to install Playwright locally (`npm install -D playwright`), write a short Node.js script to launch the app, extract DOM bounding boxes or take a screenshot, and analyze the results to ensure your frontend code is pixel-perfect.