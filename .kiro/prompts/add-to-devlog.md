# Kiro Prompt: @add-to-devlog

**Purpose:** Create a comprehensive daily development log entry with automatic technical progress tracking and Kiro CLI ecosystem usage documentation. This maximizes hackathon scoring by demonstrating mastery of both custom prompts and native Kiro CLI commands.

---

## Daily Development Log Entry

### Step 1: Calculate Hackathon Day

Determine the current date and calculate which day of the hackathon this is (January 5, 2026 = Day 1).

```bash
# Current date
date +"%B %d, %Y (%A)"

# Calculate hackathon day (Jan 5 = Day 1)
# Days elapsed = (current_date - Jan 5, 2026)
```

### Step 2: Gather User Information

Ask the user these questions conversationally:

**Core Questions:**
1. **What was your main focus today?** (e.g., "Backend pipeline setup", "Frontend UI components", "Testing")
2. **How many hours did you spend?** (Total time or breakdown by task)
3. **What were your main accomplishments?** (Features completed, components built, bugs fixed)
4. **Any challenges or blockers?** (Technical issues, decisions, learning curves)
5. **Key decisions made?** (Architecture choices, technology selections, approach changes)
6. **What's planned for next session?** (Next priorities)

**Optional:**
7. **New learnings or insights?** (Skills gained, patterns discovered)
8. **Kiro CLI usage?** (Commands and prompts used - see Step 3)

### Step 3: Gather Kiro CLI Usage

Ask the user to list the Kiro CLI commands and custom prompts they used today:

**Custom Prompts Used** (created by developer):
- `@prime` - Load project context
- `@plan-feature` - Plan implementation
- `@execute` - Execute plan
- `@code-review` - Review code
- `@git-commit` - Commit changes
- `@add-to-devlog` - Log progress

**Kiro CLI Built-in Commands** (native Kiro ecosystem):
- `kiro-cli init` - Initialize Kiro
- `kiro-cli agent generate` - Create new sub-agent
- `kiro-cli agent list` - List available agents
- `kiro-cli agent swap [name]` - Switch to different agent
- `kiro-cli agent current` - Show current agent
- `kiro-cli devlog view` - View development log
- `kiro-cli steering list` - List steering documents
- `kiro-cli trust all` - Trust all agents
- `kiro-cli settings` - Configure settings
- `kiro-cli sync` - Sync with repository
- Any other Kiro commands used

Ask: "Which custom prompts and Kiro CLI commands did you use today? List them."

### Step 4: Execute Technical Analysis

Run these commands to gather git metrics:

```bash
# Check if in git repository
if git rev-parse --git-dir > /dev/null 2>&1; then
    
    # Get today's commits
    echo "=== Today's Commits ==="
    git log --since="$(date +%Y-%m-%d)" --oneline 2>/dev/null || echo "No commits today"
    
    # Get today's line changes
    echo "=== Today's Line Statistics ==="
    git log --since="$(date +%Y-%m-%d)" --pretty=tformat: --numstat 2>/dev/null | awk '{add+=$1; del+=$2} END {if(NR>0) printf "Lines added: %d, Lines removed: %d, Net change: %d\n", add, del, add-del; else print "No changes today"}'
    
    # Get files modified today
    echo "=== Files Modified Today ==="
    git log --since="$(date +%Y-%m-%d)" --name-only --pretty=format: 2>/dev/null | sort -u | grep -v '^$' | wc -l
    
    # Get commit count
    echo "=== Total Project Commits ==="
    git rev-list --count HEAD 2>/dev/null
    
    # Get total lines of code
    echo "=== Total Project Lines of Code ==="
    git log --pretty=tformat: --numstat 2>/dev/null | awk '{add+=$1; del+=$2} END {if(NR>0) printf "Total added: %d, Total removed: %d\n", add, del}'
    
else
    echo "Not in git repository"
fi
```

### Step 5: Generate Devlog Entry

Create a structured daily entry using this template and append to `.kiro/devlog/devlog.md`:

```markdown
## Day [X] ([Full Date]) - [Main Focus/Theme] [[Total Time]h]

### 📊 **Daily Metrics**
- **Time Spent**: [Total hours]
- **Commits Made**: [Number]
- **Lines Added**: [Number]
- **Lines Removed**: [Number]
- **Net Lines**: [Added - Removed]
- **Files Modified**: [Count]

### 🎯 **Accomplishments**
- [Accomplishment 1]
- [Accomplishment 2]
- [Accomplishment 3]

### 💻 **Technical Progress**

**Commits Made Today:**
```
[List of commit messages]
```

**Code Changes:**
- Files modified: [X]
- Lines added: [X]
- Lines removed: [X]
- Net change: [X] lines

### 🔧 **Work Breakdown**
- **[Task Category]**: [Time] - [Description]
- **[Task Category]**: [Time] - [Description]

### 🚧 **Challenges & Solutions**
- **Challenge**: [Issue encountered]
  **Solution**: [How it was resolved]

### 🧠 **Key Decisions**
- [Decision 1 and rationale]
- [Decision 2 and rationale]

### ⚡ **Kiro CLI Ecosystem Usage**

**Custom Prompts Used (PIV Loop):**
- `@prime` - [What was loaded/confirmed]
- `@plan-feature` - [What feature was planned]
- `@execute` - [What was implemented]
- `@code-review` - [What issues were found]
- `@git-commit` - [Commits made]

**Kiro CLI Built-in Commands Used:**
- `kiro-cli agent swap [agent-name]` - [Why/what for]
- `kiro-cli [command]` - [Description]
- [Other commands used]

**Kiro Workflow Demonstrated:**
- ✅ Used PIV Loop (Plan → Implement → Validate)
- ✅ Used sub-agents for focused development
- ✅ Leveraged steering documents as source of truth
- ✅ Followed conventional commits
- ✅ Integrated Kiro CLI native commands properly

### 📚 **Learnings & Insights**
- [New skill or pattern discovered]
- [Best practice learned]
- [Kiro CLI workflow improvement]

### 📋 **Next Session Plan**
- [Priority 1 for next session]
- [Priority 2 for next session]
- [Priority 3 for next session]

---
```

### Step 6: Update Development Statistics

After creating the daily entry, update the statistics section at the top of `.kiro/devlog/devlog.md`:

```markdown
### 📈 **Overall Progress**
- **Total Development Days**: [Count of "## Day" entries]
- **Total Hours Logged**: [Sum of all hours]
- **Total Commits**: [From git count]
- **Total Lines Added**: [From git stats]
- **Total Lines Removed**: [From git stats]
- **Total Files Modified**: [Count]
- **Kiro CLI Sessions**: [Count of days using Kiro]
- **Custom Prompts Used**: [Count of @prime, @plan-feature, etc.]
- **Sub-Agents Created**: [Count]
```

### Step 7: Provide Summary Report

After appending the entry, provide this summary:

```markdown
✅ **Devlog Entry Added Successfully!**

**Entry Details:**
- Day: [X] ([Date])
- Time Logged: [X] hours
- Commits: [X]
- Lines Added: [X]
- Lines Removed: [X]
- Files Modified: [X]

**Kiro CLI Usage:**
- Custom Prompts: [List]
- Built-in Commands: [List]
- Sub-Agents Used: [List]

**Updated Statistics:**
- Total Days: [X]
- Total Hours: [X]h
- Total Commits: [X]
- Total Lines of Code: [X]

**Hackathon Scoring Impact:**
✅ Development Log (20% of score): Entry added with full metrics
✅ Git History (10% of score): [X] commits logged
✅ Kiro CLI Usage (20% of score): Demonstrated proper ecosystem usage
✅ Code Quality (20% of score): Tracked via commits and changes
✅ Innovation (30% of score): Tracked via accomplishments and decisions

**Next Steps:**
1. Continue development with @plan-feature
2. Run @add-to-devlog tomorrow to maintain daily logging
3. Review devlog at end of hackathon for submission
```

---

## Implementation Notes

**Quality Guidelines:**
- Keep entries scannable with clear headers and emojis
- Focus on factual progress and concrete accomplishments
- Include both high-level summary and technical details
- Maintain consistent formatting across all entries
- Balance brevity with useful detail
- Emphasize Kiro CLI usage

**Hackathon Scoring Strategy:**
- **Development Log (20%)**: Detailed daily entries with metrics
- **Git History (10%)**: 5-10 commits per day with conventional messages
- **Kiro CLI Usage (20%)**: Show both custom prompts AND native commands
- **Code Quality (20%)**: Demonstrated through commits and code reviews
- **Innovation (30%)**: Shown through accomplishments and decisions

**Success Criteria:**
- ✅ User can quickly log daily progress without friction
- ✅ Technical progress is automatically captured and summarized
- ✅ Entries are structured and professional for hackathon judges
- ✅ Kiro CLI ecosystem usage is clearly documented
- ✅ Generated content demonstrates usage of Kiro CLI
- ✅ Process encourages regular documentation habits
- ✅ Entries are immediately useful for project tracking and scoring

**Error Handling:**
- If git not available: Skip git analysis, note in entry
- If no commits today: Note "No commits made today" but still log work
- If devlog doesn't exist: Create it with initial structure
- If permissions issue: Provide manual instructions