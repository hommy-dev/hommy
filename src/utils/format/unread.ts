/** Badge label: exact count up to 99, then "99+". */
export function formatUnreadBadge(count: number): string {
  if (count <= 0) return ''
  if (count > 99) return '99+'
  return String(count)
}
