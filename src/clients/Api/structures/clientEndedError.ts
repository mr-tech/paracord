export default function createClientEndedError(): Error {
  return Error('The Api client has ended. No further requests will be sent.');
}
