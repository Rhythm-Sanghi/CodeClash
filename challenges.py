from dataclasses import dataclass
from typing import List, Any


@dataclass
class TestCase:
    input_data: Any
    expected_output: Any
    description: str = ""


@dataclass
class Challenge:
    id: str
    name: str
    description: str
    difficulty: str
    time_limit: int
    test_cases: List[TestCase]
    function_signature: str
    example_code: str = ""


CHALLENGES = {
    "palindrome": Challenge(
        id="palindrome",
        name="The Palindrome",
        description="Check if a string is a palindrome (reads same forwards and backwards).",
        difficulty="easy",
        time_limit=120,
        function_signature="def is_palindrome(s: str) -> bool:",
        test_cases=[
            TestCase(input_data="radar", expected_output=True, description="Classic palindrome"),
            TestCase(input_data="hello", expected_output=False, description="Non-palindrome"),
            TestCase(input_data="A man a plan a canal Panama", expected_output=True, description="Palindrome with spaces and mixed case"),
            TestCase(input_data="", expected_output=True, description="Empty string edge case"),
            TestCase(input_data="a", expected_output=True, description="Single character"),
        ],
        example_code="# Remove spaces and convert to lowercase\n# Compare with its reverse"
    ),
    
    "fizzbuzz": Challenge(
        id="fizzbuzz",
        name="FizzBuzz Lite",
        description="For numbers 1 to n, print 'Fizz' for multiples of 3, 'Buzz' for multiples of 5, 'FizzBuzz' for both.",
        difficulty="easy",
        time_limit=120,
        function_signature="def fizzbuzz(n: int) -> str:",
        test_cases=[
            TestCase(input_data=15, expected_output="123Fizz4BuzzFizz78FizzBuzz11Fizz1314FizzBuzz", description="FizzBuzz sequence 1-15"),
            TestCase(input_data=5, expected_output="12Fizz4Buzz", description="FizzBuzz sequence 1-5"),
            TestCase(input_data=1, expected_output="1", description="Single number"),
        ],
        example_code="# Loop from 1 to n\n# Check divisibility conditions"
    ),
    
    "sum_evens": Challenge(
        id="sum_evens",
        name="Sum of Evens",
        description="Return the sum of all even numbers in a list.",
        difficulty="easy",
        time_limit=120,
        function_signature="def sum_evens(numbers: list) -> int:",
        test_cases=[
            TestCase(input_data=[1, 2, 3, 4], expected_output=6, description="Mixed list"),
            TestCase(input_data=[2, 4, 6, 8], expected_output=20, description="All even numbers"),
            TestCase(input_data=[1, 3, 5], expected_output=0, description="No even numbers"),
            TestCase(input_data=[], expected_output=0, description="Empty list"),
            TestCase(input_data=[-2, -1, 0, 1, 2], expected_output=0, description="Negative and zero"),
        ],
        example_code="# Use list comprehension or filter\n# Sum the resulting list"
    ),
    
    "anagram_check": Challenge(
        id="anagram_check",
        name="Anagram Check",
        description="Check if two strings are anagrams (contain same characters in different order).",
        difficulty="easy",
        time_limit=120,
        function_signature="def is_anagram(s1: str, s2: str) -> bool:",
        test_cases=[
            TestCase(input_data=("listen", "silent"), expected_output=True, description="Classic anagram"),
            TestCase(input_data=("hello", "world"), expected_output=False, description="Non-anagram"),
            TestCase(input_data=("a", "a"), expected_output=True, description="Single character match"),
            TestCase(input_data=("", ""), expected_output=True, description="Empty strings"),
            TestCase(input_data=("ABC", "abc"), expected_output=True, description="Case-insensitive anagram"),
        ],
        example_code="# Sort characters in both strings\n# Compare sorted versions"
    ),
    
    "is_prime": Challenge(
        id="is_prime",
        name="Prime Number Checker",
        description="Determine if a number is prime (only divisible by 1 and itself).",
        difficulty="medium",
        time_limit=120,
        function_signature="def is_prime(n: int) -> bool:",
        test_cases=[
            TestCase(input_data=2, expected_output=True, description="Smallest prime"),
            TestCase(input_data=17, expected_output=True, description="Odd prime"),
            TestCase(input_data=4, expected_output=False, description="Even non-prime"),
            TestCase(input_data=1, expected_output=False, description="One is not prime"),
            TestCase(input_data=97, expected_output=True, description="Larger prime"),
        ],
        example_code="# Check if n < 2\n# Check divisibility up to sqrt(n)"
    ),
}


def get_challenge(challenge_id: str) -> Challenge:
    return CHALLENGES.get(challenge_id)
