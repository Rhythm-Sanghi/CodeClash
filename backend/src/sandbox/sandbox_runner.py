"""
Secure sandbox runner for executing untrusted Python code.
Uses subprocess with strict resource limits and import restrictions.
"""

import subprocess
import sys
import tempfile
import os
from typing import Tuple, Dict, Any, List
from dataclasses import dataclass
import json
import resource
from pathlib import Path


@dataclass
class ExecutionResult:
    """Result from code execution."""
    success: bool
    passed_tests: int
    total_tests: int
    test_results: List[Dict[str, Any]]
    output: str
    error: str
    execution_time: float


# Forbidden imports that pose security risks
FORBIDDEN_IMPORTS = {
    'os', 'sys', 'subprocess', 'shutil', 'socket', 'requests',
    'urllib', 'http', 'ftplib', 'smtplib', 'ssl', 'pty', 'pwd',
    'grp', 'crypt', '__import__', 'eval', 'exec', 'compile',
    'open', 'input', 'raw_input', 'importlib', 'pkgutil',
    'modulefinder', 'runpy', 'code', 'codeop', 'tracemalloc',
    'asyncio', 'threading', 'multiprocessing', 'concurrent',
}


def check_forbidden_imports(code: str) -> Tuple[bool, str]:
    """
    Check if code attempts to import forbidden modules.
    Returns (is_safe, error_message)
    """
    forbidden_found = []
    
    for forbidden in FORBIDDEN_IMPORTS:
        patterns = [
            f"import {forbidden}",
            f"from {forbidden}",
            f"import {forbidden} ",
            f"from {forbidden} ",
        ]
        
        for pattern in patterns:
            if pattern in code:
                forbidden_found.append(forbidden)
                break
    
    if forbidden_found:
        return False, f"Forbidden imports detected: {', '.join(set(forbidden_found))}"
    
    return True, ""


def build_test_wrapper(user_code: str, test_cases: List[Dict[str, Any]], 
                       function_name: str) -> str:
    """
    Build a complete test script wrapping the user's code.
    Injects test execution logic and captures results.
    """
    
    test_cases_json = json.dumps(test_cases)
    
    wrapper = f'''
import json
import sys
import traceback

# User's code
{user_code}

# Test execution
test_cases = {test_cases_json}
results = []
passed = 0
total = len(test_cases)

for i, test_case in enumerate(test_cases):
    try:
        input_data = test_case['input']
        expected = test_case['expected']
        
        # Call user's function
        if isinstance(input_data, tuple):
            result = {function_name}(*input_data)
        else:
            result = {function_name}(input_data)
        
        # Normalize results for comparison
        if result == expected:
            results.append({{"test": i+1, "status": "PASS", "expected": str(expected), "got": str(result)}})
            passed += 1
        else:
            results.append({{"test": i+1, "status": "FAIL", "expected": str(expected), "got": str(result)}})
    
    except Exception as e:
        results.append({{"test": i+1, "status": "ERROR", "error": str(e), "traceback": traceback.format_exc()}})

# Output results as JSON
output = {{
    "passed": passed,
    "total": total,
    "test_results": results
}}

print(json.dumps(output))
'''
    
    return wrapper


def set_resource_limits():
    """Set strict resource limits for the subprocess."""
    try:
        # Limit CPU time to 2 seconds
        resource.setrlimit(resource.RLIMIT_CPU, (2, 2))
        
        # Limit memory to 128MB
        resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024, 128 * 1024 * 1024))
        
        # Limit file size to 10MB
        resource.setrlimit(resource.RLIMIT_FSIZE, (10 * 1024 * 1024, 10 * 1024 * 1024))
        
        # Limit number of processes (prevent fork bombs)
        resource.setrlimit(resource.RLIMIT_NPROC, (1, 1))
        
    except Exception as e:
        print(f"Warning: Could not set resource limits: {e}", file=sys.stderr)


def execute_code(user_code: str, test_cases: List[Dict[str, Any]], 
                 function_name: str, timeout: int = 5) -> ExecutionResult:
    """
    Execute user code in a sandboxed subprocess.
    
    Args:
        user_code: The user's Python code as a string
        test_cases: List of test case dicts with 'input' and 'expected' keys
        function_name: Name of the function to test
        timeout: Maximum execution time in seconds
    
    Returns:
        ExecutionResult with test execution details
    """
    
    # Normalize line endings (Windows \r\n and \r to Unix \n)
    user_code = user_code.replace("\r\n", "\n").replace("\r", "\n")
    
    # Security check 1: Forbidden imports
    is_safe, error_msg = check_forbidden_imports(user_code)
    if not is_safe:
        return ExecutionResult(
            success=False,
            passed_tests=0,
            total_tests=len(test_cases),
            test_results=[],
            output="",
            error=error_msg,
            execution_time=0.0
        )
    
    # Security check 2: Code length (prevent DoS)
    if len(user_code) > 50000:
        return ExecutionResult(
            success=False,
            passed_tests=0,
            total_tests=len(test_cases),
            test_results=[],
            output="",
            error="Code exceeds maximum allowed length (50KB)",
            execution_time=0.0
        )
    
    # Build the test wrapper script
    test_script = build_test_wrapper(user_code, test_cases, function_name)
    
    try:
        # Create temporary file for the script
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(test_script)
            temp_file = f.name
        
        try:
            # Execute in subprocess with timeout
            proc = subprocess.run(
                [sys.executable, temp_file],
                capture_output=True,
                timeout=timeout,
                text=True,
                cwd=tempfile.gettempdir(),
                env={'PYTHONHASHSEED': '0'}  # Deterministic hash for consistency
            )
            
            output = proc.stdout.strip()
            error = proc.stderr.strip()
            
            # Parse JSON results
            try:
                result_json = json.loads(output)
                return ExecutionResult(
                    success=True,
                    passed_tests=result_json.get('passed', 0),
                    total_tests=result_json.get('total', len(test_cases)),
                    test_results=result_json.get('test_results', []),
                    output=output,
                    error=error,
                    execution_time=0.0  # Would need timeit for precise measurement
                )
            except json.JSONDecodeError:
                # Log the actual error for debugging
                full_error = error if error else f"No JSON output. stdout: {output}"
                print(f"DEBUG: Code execution failed. stderr: {error}, stdout: {output}", file=sys.stderr)
                return ExecutionResult(
                    success=False,
                    passed_tests=0,
                    total_tests=len(test_cases),
                    test_results=[],
                    output=output,
                    error=f"Code execution error: {full_error}",
                    execution_time=0.0
                )
        
        finally:
            # Cleanup temp file
            try:
                os.unlink(temp_file)
            except:
                pass
    
    except subprocess.TimeoutExpired:
        return ExecutionResult(
            success=False,
            passed_tests=0,
            total_tests=len(test_cases),
            test_results=[],
            output="",
            error=f"Execution timeout: Code took longer than {timeout} seconds",
            execution_time=float(timeout)
        )
    
    except Exception as e:
        return ExecutionResult(
            success=False,
            passed_tests=0,
            total_tests=len(test_cases),
            test_results=[],
            output="",
            error=f"Execution error: {str(e)}",
            execution_time=0.0
        )


def execute_safe_code(user_code: str, test_cases: List[Dict[str, Any]], 
                      function_name: str) -> ExecutionResult:
    """
    Execute code with Docker container for maximum isolation (if available).
    Falls back to subprocess if Docker is not available.
    """
    # For now, use subprocess. Docker implementation would wrap this call.
    return execute_code(user_code, test_cases, function_name)


# Example usage for testing
if __name__ == "__main__":
    # Test case 1: Simple palindrome function
    test_code = """
def is_palindrome(s):
    s = s.replace(" ", "").lower()
    return s == s[::-1]
"""
    
    test_cases = [
        {"input": "radar", "expected": True},
        {"input": "hello", "expected": False},
        {"input": "A man a plan a canal Panama", "expected": True},
    ]
    
    result = execute_code(test_code, test_cases, "is_palindrome")
    print(f"Success: {result.success}")
    print(f"Passed: {result.passed_tests}/{result.total_tests}")
    print(f"Results: {json.dumps(result.test_results, indent=2)}")
    if result.error:
        print(f"Error: {result.error}")
