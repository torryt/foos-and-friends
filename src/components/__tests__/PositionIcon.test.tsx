import { render, screen } from '@testing-library/react'
import { getPositionColor, getPositionLabel, PositionIcon } from '../PositionIcon'

describe('PositionIcon', () => {
  describe('Component rendering', () => {
    test('renders sword icon for attacker position', () => {
      const { container } = render(<PositionIcon position="attacker" />)

      expect(container.firstChild).toHaveClass('flex', 'items-center', 'gap-1')

      // Check that the icon has orange color class
      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('text-orange-500')
    })

    test('renders shield icon for defender position', () => {
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
    test('renders label when showLabel is true for attacker', () => {
      render(<PositionIcon position="attacker" showLabel={true} />)

      expect(screen.getByText('Attacker')).toBeInTheDocument()
      expect(screen.getByText('Attacker')).toHaveClass('text-orange-500')
    })

    test('renders label when showLabel is true for defender', () => {
      render(<PositionIcon position="defender" showLabel={true} />)

      expect(screen.getByText('Defender')).toBeInTheDocument()
      expect(screen.getByText('Defender')).toHaveClass('text-blue-500')
    })

    test('does not render label when showLabel is false', () => {
      render(<PositionIcon position="attacker" showLabel={false} />)

      expect(screen.queryByText('Attacker')).not.toBeInTheDocument()
    })

    test('does not render label by default', () => {
      render(<PositionIcon position="defender" />)

      expect(screen.queryByText('Defender')).not.toBeInTheDocument()
    })
  })
})

describe('Position utility functions', () => {
  describe('getPositionColor', () => {
    test('returns orange for attacker', () => {
      expect(getPositionColor('attacker')).toBe('orange')
    })

    test('returns blue for defender', () => {
      expect(getPositionColor('defender')).toBe('blue')
    })
  })

  describe('getPositionLabel', () => {
    test('returns Attacker for attacker position', () => {
      expect(getPositionLabel('attacker')).toBe('Attacker')
    })

    test('returns Defender for defender position', () => {
      expect(getPositionLabel('defender')).toBe('Defender')
    })
  })
})
