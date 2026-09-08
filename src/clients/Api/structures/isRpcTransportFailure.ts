import { RPC_CLOSE_CODES } from '../../../constants';

const RPC_TRANSPORT_FAILURE_CODES: readonly number[] = [
  RPC_CLOSE_CODES.LOST_CONNECTION, 4, 1, 13,
];

export default function isRpcTransportFailure(code: number | undefined): boolean {
  return code !== undefined && RPC_TRANSPORT_FAILURE_CODES.includes(code);
}
