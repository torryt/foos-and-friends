import { render, screen } from '@testing-library/react'
import { getPositionColor, getPositionLabel, PositionIcon } from '../PositionIcon'

describe('PositionIcon', () => {
  describe('Component rendering', () => {
    test('renders arrow-left icon for left position', () => {
      const { container } = render(<PositionIcon position="attacker" />)

      expect(container.firstChild).toHaveClass('flex', 'items-center', 'gap-1')

      // Check that the icon has orange color class
      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('text-emerald-500')
    })

    test('renders arrow-right icon for right position', () => {
      const { container } = render(<PositionIcon position="defender" />)

      expect(container.firstChild).toHaveClass('flex', 'items-center', 'gap-1')

      // Check that the icon has blue color class
      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('text-blue-500')
    })

    test('renders with custom size', () => {
      const { container } = render(<PositionIcon position="attacker" size={20} />)

      const icon = container.querySelector('svg')
      expect(icon).toHaveAttribute('width', '20')
      expect(icon).toHaveAttribute('height', '20')
    })

    test('renders with default size when not specified', () => {
      const { container } = render(<PositionIcon position="attacker" />)

      const icon = container.querySelector('svg')
      expect(icon).toHaveAttribute('width', '14')
      expect(icon).toHaveAttribute('height', '14')
    })

    test('renders with custom className', () => {
      const { container } = render(<PositionIcon position="attacker" className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Label display', () => {
    test('renders label when showLabel is true for left position', () => {
      render(<PositionIcon position="attacker" showLabel={true} />)

      expect(screen.getByText('Left')).toBeInTheDocument()
      expect(screen.getByText('Left')).toHaveClass('text-emerald-500')
    })

    test('renders label when showLabel is true for right position', () => {
      render(<PositionIcon position="defender" showLabel={true} />)

      expect(screen.getByText('Right')).toBeInTheDocument()
      expect(screen.getByText('Right')).toHaveClass('text-blue-500')
    })

    test('does not render label when showLabel is false', () => {
      render(<PositionIcon position="attacker" showLabel={false} />)

      expect(screen.queryByText('Left')).not.toBeInTheDocument()
    })

    test('does not render label by default', () => {
      render(<PositionIcon position="defender" />)

      expect(screen.queryByText('Right')).not.toBeInTheDocument()
    })
  })
})

describe('Position utility functions', () => {
  describe('getPositionColor', () => {
    test('returns emerald for attacker (left position)', () => {
      expect(getPositionColor('attacker')).toBe('emerald')
    })

    test('returns blue for defender (right position)', () => {
      expect(getPositionColor('defender')).toBe('blue')
    })
  })

  describe('getPositionLabel', () => {
    test('returns Left for attacker position', () => {
      expect(getPositionLabel('attacker')).toBe('Left')
    })

    test('returns Right for defender position', () => {
      expect(getPositionLabel('defender')).toBe('Right')
    })
  })
})
