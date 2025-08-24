export function isResume(name: string) {
  return /^resume-[\w-]+-v\d+\.(pdf|docx)$/i.test(name);
}
export function isCover(name: string) {
  return /^cover-[\w-]+-v\d+\.(pdf|docx)$/i.test(name);
}
