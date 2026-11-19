import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RichText } from './RichText'

describe('RichText', () => {
  it('**굵게**는 강조, · 줄은 글머리 목록, ① 줄은 번호 목록', () => {
    const { container } = render(<RichText text={'앞 **핵심** 뒤\n\n· 하나\n· 둘\n\n① 첫째\n② 둘째'} />)
    expect(screen.getByText('핵심').tagName).toBe('STRONG')
    const lists = container.querySelectorAll('ul')
    expect(lists).toHaveLength(2)
    expect(lists[0].querySelectorAll('li')).toHaveLength(2)
    expect(screen.getByText('첫째')).toBeInTheDocument()
  })
})
