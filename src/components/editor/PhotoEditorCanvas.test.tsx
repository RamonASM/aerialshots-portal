/**
 * PhotoEditorCanvas Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoEditorCanvas } from './PhotoEditorCanvas'
import { DEFAULT_EDIT_STATE, type EditState } from '@/lib/editing/photo-editor'

// Mock ResizeObserver for Radix UI components
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = ResizeObserverMock

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

describe('PhotoEditorCanvas', () => {
  const defaultProps = {
    imageUrl: 'https://example.com/test-image.jpg',
    imageId: 'test-123',
    imageName: 'Test Image',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the canvas with image', () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const image = screen.getByAltText('Editing')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', expect.stringContaining('test-image.jpg'))
    })

    it('should display image name', () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      expect(screen.getByText('Test Image')).toBeInTheDocument()
    })

    it('should show imageId if no name provided', () => {
      render(<PhotoEditorCanvas imageUrl={defaultProps.imageUrl} imageId="abc-123" />)

      expect(screen.getByText('abc-123')).toBeInTheDocument()
    })

    it('should not show unsaved badge initially', () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      expect(screen.queryByText('Unsaved')).not.toBeInTheDocument()
    })
  })

  describe('Toolbar Actions', () => {
    it('should have undo/redo buttons disabled initially', () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const undoButton = screen.getByRole('button', { name: /undo/i })
      const redoButton = screen.getByRole('button', { name: /redo/i })

      expect(undoButton).toBeDisabled()
      expect(redoButton).toBeDisabled()
    })

    it('should have save button disabled when no changes', () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save/i })
      expect(saveButton).toBeDisabled()
    })

    it('should call onCancel when cancel button clicked', async () => {
      const onCancel = vi.fn()
      render(<PhotoEditorCanvas {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Rotation', () => {
    it('should rotate clockwise when +90° button clicked', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const rotateCWButton = screen.getByRole('button', { name: /\+90°/i })
      await userEvent.click(rotateCWButton)

      expect(screen.getByText('Current: 90°')).toBeInTheDocument()
    })

    it('should rotate counter-clockwise when -90° button clicked', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const rotateCCWButton = screen.getByRole('button', { name: /-90°/i })
      await userEvent.click(rotateCCWButton)

      expect(screen.getByText('Current: 270°')).toBeInTheDocument()
    })

    it('should enable undo after rotation', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const rotateCWButton = screen.getByRole('button', { name: /\+90°/i })
      await userEvent.click(rotateCWButton)

      const undoButton = screen.getByRole('button', { name: /undo/i })
      expect(undoButton).not.toBeDisabled()
    })

    it('should show unsaved badge after rotation', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const rotateCWButton = screen.getByRole('button', { name: /\+90°/i })
      await userEvent.click(rotateCWButton)

      expect(screen.getByText('Unsaved')).toBeInTheDocument()
    })
  })

  describe('Flip', () => {
    it('should toggle horizontal flip', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const flipHButton = screen.getByRole('button', { name: /horizontal/i })
      await userEvent.click(flipHButton)

      // Button should now be in "active" state (default variant)
      expect(flipHButton).toHaveClass('bg-primary')
    })

    it('should toggle vertical flip', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const flipVButton = screen.getByRole('button', { name: /vertical/i })
      await userEvent.click(flipVButton)

      expect(flipVButton).toHaveClass('bg-primary')
    })
  })

  describe('Tool Selection', () => {
    it('should switch to brush tool', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const brushButton = screen.getByRole('button', { name: /draw/i })
      await userEvent.click(brushButton)

      expect(screen.getByText(/Tool: brush/i)).toBeInTheDocument()
    })

    it('should switch to eraser tool', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const eraserButton = screen.getByRole('button', { name: /eraser/i })
      await userEvent.click(eraserButton)

      expect(screen.getByText(/Tool: eraser/i)).toBeInTheDocument()
    })
  })

  describe('Zoom', () => {
    it('should display 100% zoom initially', () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('should zoom in when zoom in button clicked', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      await userEvent.click(zoomInButton)

      expect(screen.getByText('125%')).toBeInTheDocument()
    })

    it('should zoom out when zoom out button clicked', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i })
      await userEvent.click(zoomOutButton)

      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should reset to 100% when fit button clicked', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      // Zoom in first
      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      await userEvent.click(zoomInButton)
      await userEvent.click(zoomInButton)

      // Then fit to screen
      const fitButton = screen.getByRole('button', { name: /fit to screen/i })
      await userEvent.click(fitButton)

      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Undo/Redo', () => {
    it('should undo rotation', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      // Rotate
      const rotateCWButton = screen.getByRole('button', { name: /\+90°/i })
      await userEvent.click(rotateCWButton)
      expect(screen.getByText('Current: 90°')).toBeInTheDocument()

      // Undo
      const undoButton = screen.getByRole('button', { name: /undo/i })
      await userEvent.click(undoButton)
      expect(screen.getByText('Current: 0°')).toBeInTheDocument()
    })

    it('should redo after undo', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      // Rotate
      const rotateCWButton = screen.getByRole('button', { name: /\+90°/i })
      await userEvent.click(rotateCWButton)

      // Undo
      const undoButton = screen.getByRole('button', { name: /undo/i })
      await userEvent.click(undoButton)

      // Redo
      const redoButton = screen.getByRole('button', { name: /redo/i })
      await userEvent.click(redoButton)

      expect(screen.getByText('Current: 90°')).toBeInTheDocument()
    })
  })

  describe('Reset', () => {
    it('should reset all edits', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      // Make some edits
      const rotateCWButton = screen.getByRole('button', { name: /\+90°/i })
      await userEvent.click(rotateCWButton)
      await userEvent.click(rotateCWButton)

      // Reset
      const resetButton = screen.getByRole('button', { name: /reset all edits/i })
      await userEvent.click(resetButton)

      expect(screen.getByText('Current: 0°')).toBeInTheDocument()
      expect(screen.queryByText('Unsaved')).not.toBeInTheDocument()
    })
  })

  describe('Save', () => {
    it('should call onSave with edit state', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      render(<PhotoEditorCanvas {...defaultProps} onSave={onSave} />)

      // Make an edit
      const rotateCWButton = screen.getByRole('button', { name: /\+90°/i })
      await userEvent.click(rotateCWButton)

      // Save
      const saveButton = screen.getByRole('button', { name: /save/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            rotation: 90,
          })
        )
      })
    })
  })

  describe('Initial State', () => {
    it('should apply initial state if provided', () => {
      const initialState: EditState = {
        ...DEFAULT_EDIT_STATE,
        rotation: 180,
      }

      render(<PhotoEditorCanvas {...defaultProps} initialState={initialState} />)

      expect(screen.getByText('Current: 180°')).toBeInTheDocument()
      expect(screen.getByText('Unsaved')).toBeInTheDocument()
    })
  })

  describe('Annotations Toggle', () => {
    it('should toggle annotations visibility', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      // Find toggle button (it shows Eye icon initially)
      const toggleButton = screen.getByRole('button', { name: /hide annotations/i })
      await userEvent.click(toggleButton)

      // Should now show "Show annotations" tooltip
      expect(screen.getByRole('button', { name: /show annotations/i })).toBeInTheDocument()
    })
  })

  describe('Status Bar', () => {
    it('should display annotation count', () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      expect(screen.getByText(/Annotations: 0/)).toBeInTheDocument()
    })

    it('should display history status', () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      expect(screen.getByText(/History: 0\/0/)).toBeInTheDocument()
    })

    it('should update history status after edit', async () => {
      render(<PhotoEditorCanvas {...defaultProps} />)

      const rotateCWButton = screen.getByRole('button', { name: /\+90°/i })
      await userEvent.click(rotateCWButton)

      expect(screen.getByText(/History: 1\/1/)).toBeInTheDocument()
    })
  })
})
