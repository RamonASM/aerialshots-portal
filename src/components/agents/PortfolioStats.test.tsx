/**
 * Portfolio Stats Component Tests
 *
 * Tests for agent portfolio statistics display
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PortfolioStats, CompactStats } from './PortfolioStats'

describe('PortfolioStats', () => {
  const defaultProps = {
    totalListings: 150,
    activeListings: 12,
    soldListings: 138,
    totalVolume: 45000000,
    avgDaysOnMarket: 28,
    avgPrice: 325000,
  }

  it('should render all stat cards', () => {
    render(<PortfolioStats {...defaultProps} />)

    expect(screen.getByText('Total Listings')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Sold')).toBeInTheDocument()
    expect(screen.getByText('Total Volume')).toBeInTheDocument()
    expect(screen.getByText('Avg Days on Market')).toBeInTheDocument()
    expect(screen.getByText('Avg Sale Price')).toBeInTheDocument()
  })

  it('should display correct values', () => {
    render(<PortfolioStats {...defaultProps} />)

    expect(screen.getByText('150')).toBeInTheDocument() // Total listings
    expect(screen.getByText('12')).toBeInTheDocument() // Active
    expect(screen.getByText('138')).toBeInTheDocument() // Sold
    expect(screen.getByText('28')).toBeInTheDocument() // Avg DOM
  })

  it('should format volume in millions', () => {
    render(<PortfolioStats {...defaultProps} />)

    expect(screen.getByText('$45.0M')).toBeInTheDocument()
  })

  it('should format average price in thousands', () => {
    render(<PortfolioStats {...defaultProps} />)

    expect(screen.getByText('$325K')).toBeInTheDocument()
  })

  it('should handle zero values gracefully', () => {
    render(
      <PortfolioStats
        {...defaultProps}
        avgDaysOnMarket={0}
        avgPrice={0}
      />
    )

    // Should show dashes for zero values
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('should format billions correctly', () => {
    render(
      <PortfolioStats
        {...defaultProps}
        totalVolume={1500000000}
      />
    )

    expect(screen.getByText('$1.5B')).toBeInTheDocument()
  })

  it('should apply custom brand color', () => {
    const { container } = render(
      <PortfolioStats {...defaultProps} brandColor="#ff0000" />
    )

    // Check that brand color is applied in styles
    const styledElements = container.querySelectorAll('[style*="background"]')
    expect(styledElements.length).toBeGreaterThan(0)
  })

  it('should apply custom className', () => {
    const { container } = render(
      <PortfolioStats {...defaultProps} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('CompactStats', () => {
  it('should display sold count', () => {
    render(
      <CompactStats
        soldCount={50}
        totalVolume={10000000}
        avgDOM={25}
      />
    )

    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('Sold')).toBeInTheDocument()
  })

  it('should format total volume', () => {
    render(
      <CompactStats
        soldCount={50}
        totalVolume={10000000}
        avgDOM={25}
      />
    )

    expect(screen.getByText('$10.0M')).toBeInTheDocument()
    expect(screen.getByText('Volume')).toBeInTheDocument()
  })

  it('should show average days on market when > 0', () => {
    render(
      <CompactStats
        soldCount={50}
        totalVolume={10000000}
        avgDOM={25}
      />
    )

    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('Avg DOM')).toBeInTheDocument()
  })

  it('should hide average DOM when 0', () => {
    render(
      <CompactStats
        soldCount={50}
        totalVolume={10000000}
        avgDOM={0}
      />
    )

    expect(screen.queryByText('Avg DOM')).not.toBeInTheDocument()
  })

  it('should apply custom brand color', () => {
    const { container } = render(
      <CompactStats
        soldCount={50}
        totalVolume={10000000}
        avgDOM={25}
        brandColor="#00ff00"
      />
    )

    const styledElements = container.querySelectorAll('[style*="color"]')
    expect(styledElements.length).toBeGreaterThan(0)
  })
})
