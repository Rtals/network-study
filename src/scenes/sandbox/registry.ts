import type { ComponentType } from 'react'
import { AuthSandbox } from './auth/AuthSandbox'
import { CookieSandbox } from './cookie/CookieSandbox'
import { EnvelopeSandbox } from './envelope/EnvelopeSandbox'
import { HandshakeSandbox } from './handshake/HandshakeSandbox'
import { HashSandbox } from './hash/HashSandbox'
import { JwtSandbox } from './jwt/JwtSandbox'
import { JwtVerifySandbox } from './jwtverify/JwtVerifySandbox'
import { PasswordSandbox } from './password/PasswordSandbox'
import { TotpSandbox } from './totp/TotpSandbox'

/** Step 전용 직접 해보기 화면. 키: "w3/handshake" */
export const sandboxRegistry: Record<string, ComponentType> = {
  'w3/handshake': HandshakeSandbox,
  'w6/http-vs-https': EnvelopeSandbox,
  'w6/hash-signature': HashSandbox,
  'w6/authn-authz': AuthSandbox,
  'w6/mfa-otp': TotpSandbox,
  'w6/password-storage': PasswordSandbox,
  'w6/cookie-attributes': CookieSandbox,
  'w6/jwt-anatomy': JwtSandbox,
  'w6/jwt-verify': JwtVerifySandbox,
}
