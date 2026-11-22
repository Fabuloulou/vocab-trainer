export function normalizeForCompare(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr')
}

export function checkAnswer(input: string, expected: string): boolean {
  return normalizeForCompare(input) === normalizeForCompare(expected)
}
