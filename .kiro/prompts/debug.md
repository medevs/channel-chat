---
description: Add targeted JSON debug logging to validate assumptions and expose unexpected behavior
---

Add clear, intentional, and targeted debug statements immediately after key operations, decision points, and conditional branches to validate assumptions and expose any unexpected behavior.

## Core Principles

Debug Philosophy:
- High-signal debugging information that helps quickly identify issues
- Meaningful context about operations, inputs, outputs, and state
- JSON.stringify format for easy reading, copying, and analysis
- Focus on decision points and unexpected behavior detection

## What to Debug

Target these critical areas:
- **Key Operations**: Database queries, API calls, data transformations
- **Decision Points**: Conditional branches, validation checks, error handling
- **State Changes**: Variable assignments, object mutations, flow control
- **Edge Cases**: Boundary conditions, null/undefined handling, error paths

## Debug Statement Format

Each debug statement should include:
- **Operation Context**: What just happened or is about to happen
- **Relevant Data**: Inputs, outputs, intermediate values using JSON.stringify
- **State Information**: Current application state relevant to the operation
- **Timing**: When appropriate, include timestamps or performance markers

## Implementation Guidelines

- Place debug statements **immediately after** key operations
- Use descriptive labels that explain the operation context
- Include both expected and actual values when validating assumptions
- Group related debug information logically
- Remove or comment out debug statements before production deployment

## Examples

```javascript
// After database query
const users = await getUsersByRole(role);
console.log('Database Query Result:', JSON.stringify({
  operation: 'getUsersByRole',
  input: { role },
  resultCount: users.length,
  firstUser: users[0] || null,
  timestamp: new Date().toISOString()
}));

// After conditional logic
if (user.isActive && user.hasPermission) {
  console.log('Permission Check:', JSON.stringify({
    operation: 'accessControl',
    userId: user.id,
    isActive: user.isActive,
    hasPermission: user.hasPermission,
    decision: 'GRANTED'
  }));
}
```

## Avoid These Patterns

- Noisy or redundant logs that don't add value
- Debug statements without meaningful context
- Plain text logs that are hard to parse
- Debugging every single line of code
- Leaving debug statements in production code
