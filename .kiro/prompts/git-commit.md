Perform a safe git commit.

Before committing:

* Scan all staged files for secrets (API keys, tokens, passwords).
  Abort immediately if anything sensitive is found and report the file and line.
* Ensure code is formatted and type-safe.
* Confirm new logic includes appropriate tests.

Then:

* Analyze the staged changes.
* Generate a concise **Conventional Commit** message in the format:
  `<type>(<scope>): <summary>`
  Types: feat, fix, docs, style, refactor, test, chore.

If all checks pass:

* Create the commit.
* Output the commit message and hash.

If any check fails:

* Abort and clearly explain why.

