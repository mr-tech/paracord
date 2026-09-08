export default function isServerErrorResponse(status: number): boolean {
  return status >= 500 && status <= 599;
}
