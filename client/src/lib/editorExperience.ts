export const CODE_EDITOR_DEFAULT_DARK = true;

const completionByLanguage: Record<string, string[]> = {
  javascript: ["const ", "function ", "async ", "await ", "console.log()", "fetch()", "return ", "if () {}"],
  typescript: ["interface ", "type ", "const ", "function ", "async ", "Promise<>", "return ", "if () {}"],
  python: ["def ", "import ", "from ", "async def ", "print()", "return ", "if __name__ == '__main__':"],
  java: ["public class ", "public static void main", "System.out.println()", "return ", "if () {}"],
  c: ["#include <stdio.h>", "int main()", "printf()", "return 0;", "if () {}"],
  cpp: ["#include <iostream>", "using namespace std;", "int main()", "cout <<", "return 0;"],
  go: ["package main", "import ", "func main()", "fmt.Println()", "return"],
  rust: ["fn main()", "let ", "mut ", "println!()", "match {}", "return"],
};

export function buildProgressChartData(attempts: Array<{ state: string; test: { title: string }; reviewerScore?: number | null; autoScore?: number | null }>) {
  return attempts.filter(item => item.state === "submitted").slice(-8).map(item => ({ name: item.test.title.slice(0, 14), score: item.reviewerScore ?? item.autoScore ?? 0 }));
}

export function getCodeSuggestions(language: string, input: string) {
  const word = input.split(/\s/).pop()?.toLowerCase() ?? "";
  return (word.length >= 1 ? (completionByLanguage[language] ?? []).filter(item => item.toLowerCase().startsWith(word)) : []).slice(0, 5);
}

export function getNewAttemptCount(previous: number | null, current: number) {
  return previous === null ? 0 : Math.max(0, current - previous);
}

export function getInlineExecutionState(input: { isPending: boolean; hasError: boolean; hasOutput: boolean }) {
  if (input.isPending) return "loading" as const;
  if (input.hasError) return "error" as const;
  if (input.hasOutput) return "output" as const;
  return "idle" as const;
}
