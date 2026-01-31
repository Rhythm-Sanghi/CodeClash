# 🤝 CONTRIBUTING.md - Python-Duel Open-Source Contribution Guide

Welcome to Python-Duel! This guide will help you contribute new puzzles, language support, or features to our competitive coding platform.

---

## 🎯 Table of Contents

1. [Getting Started](#getting-started)
2. [Types of Contributions](#types-of-contributions)
3. [Adding New Python Puzzles](#adding-new-python-puzzles)
4. [Adding New Languages (Java/C++)](#adding-new-languages)
5. [Code of Conduct](#code-of-conduct)
6. [Pull Request Process](#pull-request-process)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- Docker (optional, for testing)

### Setup Development Environment
```bash
# Clone the repository
git clone https://github.com/yourname/python-duel.git
cd python-duel

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup (in new terminal)
cd frontend
npm install

# Run tests
cd ../backend
python -m pytest tests/ -v
```

---

## 📝 Types of Contributions

### 🟢 Beginner-Friendly Issues

These don't require system architecture knowledge:

- **UI/UX Improvements**
  - Add dark/light mode toggle
  - Improve mobile responsiveness
  - Add keyboard shortcuts (Ctrl+Enter to submit)
  - Create sound effects for victory/defeat

- **New Challenges**
  - Add more Python puzzles (easy/medium/hard)
  - Difficulty: 1-2 hours per puzzle

- **Documentation**
  - Add setup guides for different OS
  - Improve README sections
  - Add FAQ

### 🟡 Intermediate Issues

- **Feature Additions**
  - Add practice mode with AI bot
  - Implement user profiles + stats
  - Add leaderboards
  - Create challenge difficulty filters

- **Performance**
  - Optimize frontend bundle size
  - Add caching strategies
  - Implement code debouncing improvements

### 🔴 Advanced Issues

- **Backend Architecture**
  - Implement Redis-based distributed matchmaking
  - Add database persistence
  - Multi-language support (Java, C++, Go)
  - Kubernetes deployment

---

## 🐍 Adding New Python Puzzles

### Step 1: Create Puzzle Definition

Edit [`backend/src/challenges/puzzle_library.py`](backend/src/challenges/puzzle_library.py):

```python
# Add to CHALLENGES dictionary:

"fibonacci_sum": Challenge(
    id="fibonacci_sum",
    name="Fibonacci Sum",
    description="Return the sum of first N Fibonacci numbers.",
    difficulty="medium",  # "easy" | "medium" | "hard"
    time_limit=180,  # seconds
    function_signature="def fibonacci_sum(n: int) -> int:",
    test_cases=[
        TestCase(
            input_data=5,
            expected_output=12,  # 1+1+2+3+5
            description="First 5 Fibonacci numbers"
        ),
        TestCase(
            input_data=1,
            expected_output=1,
            description="Single Fibonacci"
        ),
        TestCase(
            input_data=10,
            expected_output=143,
            description="Larger Fibonacci sequence"
        ),
        TestCase(
            input_data=0,
            expected_output=0,
            description="Edge case: zero"
        ),
    ],
    example_code="# Generate Fibonacci sequence\n# Use sum() function"
),
```

### Step 2: Test Locally

```bash
cd backend
python -c "
from src.sandbox.sandbox_runner import execute_code
from src.challenges.puzzle_library import get_challenge

challenge = get_challenge('fibonacci_sum')
user_code = '''
def fibonacci_sum(n):
    if n <= 0:
        return 0
    a, b, total = 0, 1, 0
    for _ in range(n):
        total += a
        a, b = b, a + b
    return total
'''

test_cases = [
    {'input': tc.input_data, 'expected': tc.expected_output}
    for tc in challenge.test_cases
]

result = execute_code(user_code, test_cases, 'fibonacci_sum')
print(f'✓ Passed {result.passed_tests}/{result.total_tests} tests')
"
```

### Step 3: Create Pull Request

1. Fork the repository
2. Create feature branch: `git checkout -b add/fibonacci-puzzle`
3. Commit: `git add backend/src/challenges/puzzle_library.py && git commit -m "Add Fibonacci Sum challenge"`
4. Push: `git push origin add/fibonacci-puzzle`
5. Open PR with description

**PR Template:**
```markdown
## Description
Added "Fibonacci Sum" challenge - a medium difficulty puzzle requiring sequence generation.

## Test Results
- ✓ 5 test cases passing
- ✓ Sandbox security validated (no forbidden imports)
- ✓ Execution time: 45ms average

## Screenshots
[Optional: Show challenge in UI]
```

---

## 💻 Adding New Languages (Java/C++)

### Architecture Overview

Current: Language-specific sandbox in `sandbox_runner.py` for Python.

For multi-language support, we need:

```
sandbox_runner.py (Current - Python only)
    ↓
sandbox_runner_factory.py (NEW - Router)
    ├── python_executor.py
    ├── java_executor.py
    ├── cpp_executor.py
    └── go_executor.py
```

### Step 1: Create Language-Specific Executor

**File:** `backend/src/sandbox/java_executor.py`

```python
"""Java code execution sandbox."""

import subprocess
import tempfile
import os
import json
from typing import List, Dict, Any, Tuple
import resource


def check_forbidden_imports_java(code: str) -> Tuple[bool, str]:
    """Check for dangerous Java imports."""
    FORBIDDEN = {
        'java.lang.Runtime',
        'java.lang.ProcessBuilder',
        'java.io.File',
        'java.nio.file',
        'java.net.Socket',
        'java.sql',
    }
    
    for forbidden in FORBIDDEN:
        if forbidden in code:
            return False, f"Forbidden import: {forbidden}"
    
    return True, ""


def build_java_test_wrapper(user_code: str, test_cases: List[Dict[str, Any]], 
                           class_name: str) -> str:
    """Wrap user's Java code with test harness."""
    
    test_cases_json = json.dumps(test_cases)
    
    wrapper = f'''
import java.util.*;
import com.google.gson.*;

public class TestRunner {{
    public static void main(String[] args) {{
        List<Map<String, Object>> testCases = new Gson().fromJson(
            "{test_cases_json}",
            new com.google.gson.reflect.TypeToken<List<Map<String, Object>>>(){{}}.getType()
        );
        
        int passed = 0;
        List<Map<String, Object>> results = new ArrayList<>();
        
        for (int i = 0; i < testCases.size(); i++) {{
            try {{
                Object input = testCases.get(i).get("input");
                Object expected = testCases.get(i).get("expected");
                
                // Call user's method
                Object result = {class_name}.solve(input);
                
                if (result.equals(expected)) {{
                    passed++;
                    results.add(Map.of("test", i+1, "status", "PASS"));
                }} else {{
                    results.add(Map.of("test", i+1, "status", "FAIL", 
                        "expected", expected.toString(), 
                        "got", result.toString()));
                }}
            }} catch (Exception e) {{
                results.add(Map.of("test", i+1, "status", "ERROR", 
                    "error", e.getMessage()));
            }}
        }}
        
        Map<String, Object> output = Map.of(
            "passed", passed,
            "total", testCases.size(),
            "test_results", results
        );
        
        System.out.println(new Gson().toJson(output));
    }}
    
    // User's code here:
    {user_code}
}}
'''
    
    return wrapper


def execute_java_code(user_code: str, test_cases: List[Dict[str, Any]], 
                     class_name: str, timeout: int = 5) -> Dict:
    """Execute Java code in sandbox."""
    
    # Check forbidden imports
    is_safe, error = check_forbidden_imports_java(user_code)
    if not is_safe:
        return {
            "success": False,
            "passed_tests": 0,
            "total_tests": len(test_cases),
            "error": error
        }
    
    # Build wrapper
    wrapper_code = build_java_test_wrapper(user_code, test_cases, class_name)
    
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write Java file
            java_file = os.path.join(tmpdir, "TestRunner.java")
            with open(java_file, 'w') as f:
                f.write(wrapper_code)
            
            # Compile
            compile_result = subprocess.run(
                ["javac", java_file],
                capture_output=True,
                timeout=10,
                cwd=tmpdir
            )
            
            if compile_result.returncode != 0:
                return {
                    "success": False,
                    "passed_tests": 0,
                    "total_tests": len(test_cases),
                    "error": f"Compilation error: {compile_result.stderr.decode()}"
                }
            
            # Run
            run_result = subprocess.run(
                ["java", "-cp", tmpdir, "TestRunner"],
                capture_output=True,
                timeout=timeout,
                cwd=tmpdir
            )
            
            output = run_result.stdout.decode()
            result = json.loads(output)
            
            return {
                "success": True,
                "passed_tests": result["passed"],
                "total_tests": result["total"],
                "test_results": result["test_results"]
            }
    
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "passed_tests": 0,
            "total_tests": len(test_cases),
            "error": f"Timeout: execution exceeded {timeout}s"
        }
    
    except Exception as e:
        return {
            "success": False,
            "passed_tests": 0,
            "total_tests": len(test_cases),
            "error": f"Execution error: {str(e)}"
        }
```

### Step 2: Create Executor Factory

**File:** `backend/src/sandbox/sandbox_factory.py`

```python
"""Factory for language-specific sandboxes."""

from typing import Callable, Dict, Any, List

# Import executors
from .python_executor import execute_code as execute_python
from .java_executor import execute_java_code as execute_java


class SandboxFactory:
    """Route code execution to language-specific sandboxes."""
    
    EXECUTORS: Dict[str, Callable] = {
        'python': execute_python,
        'java': execute_java,
        # 'cpp': execute_cpp,  # Future
        # 'go': execute_go,    # Future
    }
    
    @staticmethod
    def execute(
        user_code: str,
        test_cases: List[Dict[str, Any]],
        function_name: str,
        language: str = 'python',
        timeout: int = 5
    ) -> Dict:
        """Execute code in appropriate sandbox."""
        
        executor = SandboxFactory.EXECUTORS.get(language)
        
        if not executor:
            return {
                "success": False,
                "error": f"Language not supported: {language}. "
                         f"Supported: {list(SandboxFactory.EXECUTORS.keys())}"
            }
        
        return executor(user_code, test_cases, function_name, timeout)
```

### Step 3: Update main.py

In [`backend/src/api/main.py`](backend/src/api/main.py), modify `submit_code`:

```python
from sandbox.sandbox_factory import SandboxFactory

@sio.event
async def submit_code(sid, data):
    """Submit code for evaluation - supports multiple languages."""
    try:
        user_id = data.get('user_id')
        room_id = data.get('room_id')
        code = data.get('code', '')
        language = data.get('language', 'python')  # NEW
        
        # ... existing validation ...
        
        # Get challenge
        challenge = get_challenge(battle_room.challenge_id)
        
        # Prepare test cases
        test_cases = [...]
        
        # EXECUTE with language support
        execution_result = SandboxFactory.execute(
            code,
            test_cases,
            func_name,
            language=language,  # NEW
            timeout=5
        )
        
        # ... rest of handler unchanged ...
```

### Step 4: Add Java Challenges

**File:** `backend/src/challenges/java_puzzles.py`

```python
"""Java challenge definitions."""

JAVA_CHALLENGES = {
    "hello_world": {
        "id": "hello_world",
        "name": "Hello World",
        "language": "java",
        "description": "Write a method that returns 'Hello, World!'",
        "function_signature": "public static String greet()",
        "test_cases": [
            {
                "input": None,
                "expected": "Hello, World!",
                "description": "Basic greeting"
            }
        ]
    },
    # ... more Java challenges
}
```

### Step 5: Documentation

Create [`LANGUAGE_SUPPORT.md`](LANGUAGE_SUPPORT.md):

```markdown
# Multi-Language Support

## Currently Supported
- ✅ Python 3.11+
- ✅ Java 11+

## Planned
- 🔜 C++ 17
- 🔜 Go 1.20
- 🔜 JavaScript/TypeScript

## Adding a New Language

See [Java executor](backend/src/sandbox/java_executor.py) as example template.

Required:
1. Language-specific executor module
2. Forbidden imports list
3. Test wrapper generator
4. Resource limit handlers
5. Test cases in challenge library
```

---

## 📋 Code of Conduct

- Be respectful and inclusive
- No hate speech or discrimination
- Constructive feedback only
- Report issues to: [email]

---

## 🔄 Pull Request Process

### Before You Start
- Check [open issues](https://github.com/yourname/python-duel/issues)
- Comment on issue claiming it
- Get assigned before starting work

### During Development
- Write tests for new features
- Follow existing code style
- Update documentation
- Keep commits atomic

### Before Submitting PR
```bash
# Run tests
pytest backend/tests/ -v

# Run linter
flake8 backend/src/ --max-line-length=100

# Check security
python -m safety check

# Build frontend
cd frontend && npm run build
```

### PR Checklist
- [ ] Tests pass (`pytest backend/tests/ -v`)
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Linked to issue

### Review Process
1. Maintainer reviews code
2. Changes requested (if any)
3. Author updates PR
4. Approval & merge

---

## 🎯 Roadmap Issues for Contributors

### 🟢 Beginner (Good First Issue)
- [ ] Add dark/light mode toggle to UI
- [ ] Create "How to Play" tutorial overlay
- [ ] Add keyboard shortcut (Ctrl+Enter) for code submission
- [ ] Implement sound effects for win/loss
- [ ] Add 3 more easy Python challenges

### 🟡 Intermediate
- [ ] Practice mode with AI bot (random submissions)
- [ ] User profile page with stats
- [ ] Add difficulty filter to challenge selection
- [ ] Implement code bookmarks/saved solutions
- [ ] Add replay feature for completed battles

### 🔴 Advanced
- [ ] Redis-based distributed matchmaking
- [ ] PostgreSQL persistence layer
- [ ] Java language support (full)
- [ ] C++ language support
- [ ] Kubernetes deployment guide

---

## 📚 Resources

- [Architecture Guide](PROJECT_ARCHITECTURE.md)
- [Security Model](README.md#-security)
- [API Documentation](README.md#-rest-endpoints)

---

**Thank you for contributing to Python-Duel! 🚀**
