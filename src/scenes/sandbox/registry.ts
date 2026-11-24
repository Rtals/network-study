import type { ComponentType } from 'react'
import { AuthSandbox } from './auth/AuthSandbox'
import { EnvelopeSandbox } from './envelope/EnvelopeSandbox'
import { HandshakeSandbox } from './handshake/HandshakeSandbox'
import { HashSandbox } from './hash/HashSandbox'

/** Step 전용 직접 해보기 화면. 키: "w3/handshake" */
export const sandboxRegistry: Record<string, ComponentType> = {
  'w3/handshake': HandshakeSandbox,
  'w6/http-vs-https': EnvelopeSandbox,
  'w6/hash-signature': HashSandbox,
  'w6/authn-authz': AuthSandbox,
}
