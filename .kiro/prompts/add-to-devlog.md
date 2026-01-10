# Kiro Prompt: @add-to-devlog

**Purpose:** Create professional daily development log entries matching hackathon standards with accurate git metrics and detailed progress tracking.

---

## Daily Development Log Entry

### Step 1: Calculate Hackathon Day
Determine current date and calculate hackathon day (January 5, 2026 = Day 1).

### Step 2: Gather Git Metrics
```bash
cd /path/to/project

# Today's commits
git log --since="$(date +%Y-%m-%d)" --oneline

# Today's line statistics  
git log --since="$(date +%Y-%m-%d)" --pretty=tformat: --numstat | awk '{add+=$1; del+=$2} END {printf "Lines added: %d, Lines removed: %d, Net change: %d\n", add, del, add-del}'

# Commit count today
git log --since="$(date +%Y-%m-%d)" --oneline | wc -l

# Total project stats
git rev-list --count HEAD
git log --pretty=tformat: --numstat | awk '{add+=$1; del+=$2} END {printf "Total added: %d, Total removed: %d\n", add, del}'
```

### Step 3: Ask User for Details
**Required Information:**
1. **Total hours worked today**
2. **Time breakdown** (e.g., "Authentication: 3h, UI: 2h, Debugging: 1h")
3. **Main accomplishments** (features completed)
4. **Key challenges and solutions**
5. **Technical decisions made**
6. **Kiro CLI commands used**

### Step 4: Generate Professional Entry

Use this format based on the example:

```markdown
### Day X (Date) - Main Focus [Xh]
- **Morning (Xh)**: Specific work done
- **Midday (Xh)**: Specific work done  
- **Afternoon (Xh)**: Specific work done
- **Challenge**: Specific issue encountered
- **Solution**: How it was resolved
- **Kiro Usage**: Commands and prompts used

**Commits Made:**
```
[actual git commit messages]
```

**Technical Progress:**
- Files modified: [count]
- Lines added: [actual number]
- Lines removed: [actual number]
- Net change: [actual calculation]
```

### Step 5: Update Overall Statistics

Update the header statistics:
- Total Development Days
- Total Time Logged  
- Total Commits
- Total Lines Added/Removed
- Kiro CLI Sessions

### Step 6: Professional Summary

Provide summary in this format:

```markdown
✅ **Devlog Entry Added Successfully!**

**Entry Details:**
- Day: X (Date)
- Time Logged: Xh
- Commits: [actual count]
- Lines Added: [actual number]
- Net Change: [actual calculation]

**Professional Format:**
✅ Hour-by-hour breakdown included
✅ Actual git metrics captured
✅ Technical decisions documented
✅ Challenges and solutions detailed
✅ Ready for hackathon submission
```

---

## Implementation Notes

**Critical Requirements:**
- ALWAYS get actual git metrics, never assume zero commits
- Use professional hour-by-hour format like the example
- Include real commit messages and line counts
- Document technical decisions and challenges
- Match the professional tone of the example devlog

**Quality Standards:**
- Detailed time breakdown with specific accomplishments
- Technical challenges with concrete solutions
- Professional language suitable for hackathon judges
- Accurate metrics that reflect real development work
- Clear next steps and priorities

**Error Prevention:**
- Always run git commands to get actual metrics
- Never use placeholder values like [PENDING]
- Verify commit count before writing entry
- Ask user for missing information rather than assume
- Match the professional format exactly
