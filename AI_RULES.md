# AI_RULES: Coding & Interaction Guidelines

You MUST strictly follow these rules on every action:

1. **The Scratchpad Pattern (Think before you code)**: Before modifying any code or files, you MUST output a `<scratchpad>` or `<plan>` block explaining your step-by-step logic. Only execute code AFTER the plan is logically sound.
2. **Rolling Memory Compression**: Keep `PROJECT_MEMORY.md` strictly concise. When a Phase or task is completed, compress its historical details into a single summary bullet point. Only maintain granular checklists for the CURRENT active task.
3. **Language Protocol**: 
   - Code & Comments MUST be in English. 
   - All physical dimensions MUST be commented in millimeters (mm).
   - Chat interaction with the human MUST be in **Chinese (简体中文)**.
4. **TypeScript First**: Always use strong typing. The `any` type is strictly forbidden. 
5. **Token Economy**: Do not repeat large chunks of unmodified code in your chat responses. Only output the exact lines that need to be changed or added.