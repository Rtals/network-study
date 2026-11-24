/// <reference types="node" />
import { createHash, pbkdf2Sync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { bitDifference, crackYears, HASH_EXAMPLES, hexDiffMask, pbkdf2Hex, randomSalt, SALT_EXAMPLES, SALTED_EXAMPLES, saltedSha256Hex, sha256Hex, SHA256_HEX_LENGTH, shortHex } from './hash'

const nodeSha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

describe('해시 (6-4)', () => {
  it('예시 값은 실제 SHA-256과 같다 (강의자료의 9b1f3c… 는 설명용)', () => {
    expect(HASH_EXAMPLES.inu1234).toBe(nodeSha('inu1234'))
    expect(HASH_EXAMPLES.inu1235).toBe(nodeSha('inu1235'))
    expect(HASH_EXAMPLES.inu1234.startsWith('9b1f3c')).toBe(false)
  })

  it('sha256Hex는 Node crypto와 같은 값을 낸다. 한글·빈 문자열도', async () => {
    for (const s of ['inu1234', '', '네트워크 구조 및 설계', 'a'.repeat(10_000)]) expect(await sha256Hex(s)).toBe(nodeSha(s))
  })

  it('고정 길이: 1글자든 만 글자든 16진수 64자리', async () => {
    expect((await sha256Hex('a')).length).toBe(SHA256_HEX_LENGTH)
    expect((await sha256Hex('a'.repeat(10_000))).length).toBe(64)
  })

  it('한 글자만 달라도 비트의 절반 가까이가 바뀐다 (눈사태 효과)', () => {
    const d = bitDifference(HASH_EXAMPLES.inu1234, HASH_EXAMPLES.inu1235)
    expect(d).toBeGreaterThan(90)
    expect(d).toBeLessThan(166)
    expect(bitDifference(HASH_EXAMPLES.inu1234, HASH_EXAMPLES.inu1234)).toBe(0)
  })

  it('비트 차이: 0과 f는 4비트, 1과 3은 1비트', () => {
    expect(bitDifference('0', 'f')).toBe(4)
    expect(bitDifference('1', '3')).toBe(1)
    expect(() => bitDifference('ab', 'a')).toThrow()
  })

  it('자리별 차이와 줄인 표기', () => {
    expect(hexDiffMask('abcd', 'abed')).toEqual([false, false, true, false])
    expect(shortHex(HASH_EXAMPLES.inu1234)).toBe('5c6d613d…a907d380')
  })
})

describe('비밀번호 저장 (6-10)', () => {
  it('Salt 예시 해시는 실제 SHA-256(salt + 비밀번호)', async () => {
    expect(SALTED_EXAMPLES.kim).toBe(nodeSha(SALT_EXAMPLES.kim + 'inu1234'))
    expect(SALTED_EXAMPLES.lee).toBe(nodeSha(SALT_EXAMPLES.lee + 'inu1234'))
    expect(await saltedSha256Hex('Qx9', 'inu1234')).toBe(SALTED_EXAMPLES.kim)
  })

  it('같은 비밀번호라도 Salt가 다르면 해시가 다르다', () => {
    expect(SALTED_EXAMPLES.kim).not.toBe(SALTED_EXAMPLES.lee)
  })

  it('PBKDF2는 Node crypto와 같은 값, 같은 입력이면 같은 출력', async () => {
    const node = pbkdf2Sync('inu1234', 'Qx9', 1000, 32, 'sha256').toString('hex')
    expect(await pbkdf2Hex('inu1234', 'Qx9', 1000)).toBe(node)
  })

  it('p.19: 0.1초 × 10억 번 ≈ 3년', () => {
    expect(crackYears(0.1, 1e9)).toBeCloseTo(3.17, 1)
  })

  it('무작위 Salt는 매번 다르다', () => {
    expect(randomSalt()).not.toBe(randomSalt())
    expect(randomSalt(4)).toHaveLength(8)
  })
})
