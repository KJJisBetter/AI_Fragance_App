import React, { useEffect, useRef } from 'react'

// Screen Reader Announcer Component
interface ScreenReaderAnnouncerProps {
  message: string
  priority?: 'polite' | 'assertive'
  clearOnUnmount?: boolean
}

export const ScreenReaderAnnouncer: React.FC<ScreenReaderAnnouncerProps> = ({
  message,
  priority = 'polite',
  clearOnUnmount = true,
}) => {
  const announcerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (announcerRef.current) {
      announcerRef.current.textContent = message
    }
  }, [message])

  useEffect(() => {
    return () => {
      if (clearOnUnmount && announcerRef.current) {
        announcerRef.current.textContent = ''
      }
    }
  }, [clearOnUnmount])

  return (
    <div
      ref={announcerRef}
      className="sr-only"
      aria-live={priority}
      aria-atomic="true"
      role="status"
    />
  )
}

// Focus Management Hook
export const useFocusManagement = () => {
  const focusRef = useRef<HTMLElement | null>(null)

  const setFocus = (element: HTMLElement | null) => {
    if (element) {
      element.focus()
      focusRef.current = element
    }
  }

  const restoreFocus = () => {
    if (focusRef.current) {
      focusRef.current.focus()
    }
  }

  const saveFocus = () => {
    focusRef.current = document.activeElement as HTMLElement
  }

  return { setFocus, restoreFocus, saveFocus }
}

// Keyboard Navigation Hook
export const useKeyboardNavigation = (
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowKeys?: (direction: 'up' | 'down' | 'left' | 'right') => void
) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        onEnter?.()
        break
      case 'Escape':
        event.preventDefault()
        onEscape?.()
        break
      case 'ArrowUp':
        event.preventDefault()
        onArrowKeys?.('up')
        break
      case 'ArrowDown':
        event.preventDefault()
        onArrowKeys?.('down')
        break
      case 'ArrowLeft':
        event.preventDefault()
        onArrowKeys?.('left')
        break
      case 'ArrowRight':
        event.preventDefault()
        onArrowKeys?.('right')
        break
    }
  }

  return { handleKeyDown }
}

// Focus Trap Component
interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  onEscape?: () => void
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ children, active = true, onEscape }) => {
  const trapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.()
        return
      }

      if (event.key === 'Tab') {
        const focusableElements = trapRef.current?.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        )

        if (!focusableElements?.length) return

        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, onEscape])

  return (
    <div ref={trapRef} className="focus-trap">
      {children}
    </div>
  )
}

// Accessible Button Component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  isLoading?: boolean
  loadingText?: string
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  loadingText = 'Loading...',
  disabled,
  className = '',
  ...props
}) => {
  const buttonClasses = [
    'accessible-button',
    `accessible-button--${variant}`,
    `accessible-button--${size}`,
    isLoading && 'accessible-button--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...props}
      className={buttonClasses}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      aria-describedby={isLoading ? `${props.id}-loading` : undefined}
    >
      {isLoading ? (
        <>
          <span className="accessible-button__spinner" aria-hidden="true" />
          <span className="sr-only" id={`${props.id}-loading`}>
            {loadingText}
          </span>
          <span aria-hidden="true">{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Accessible Form Field Component
interface AccessibleFormFieldProps {
  label: string
  id: string
  error?: string
  helpText?: string
  required?: boolean
  children: React.ReactNode
}

export const AccessibleFormField: React.FC<AccessibleFormFieldProps> = ({
  label,
  id,
  error,
  helpText,
  required = false,
  children,
}) => {
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  return (
    <div className="accessible-form-field">
      <label htmlFor={id} className="accessible-form-field__label">
        {label}
        {required && (
          <span className="accessible-form-field__required" aria-label="required">
            *
          </span>
        )}
      </label>

      <div className="accessible-form-field__input-wrapper">
        {React.cloneElement(children as React.ReactElement, {
          id,
          'aria-describedby':
            [helpText ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') ||
            undefined,
          'aria-invalid': error ? 'true' : 'false',
          'aria-required': required,
        })}
      </div>

      {helpText && (
        <div id={helpId} className="accessible-form-field__help" role="note">
          {helpText}
        </div>
      )}

      {error && (
        <div id={errorId} className="accessible-form-field__error" role="alert" aria-live="polite">
          {error}
        </div>
      )}
    </div>
  )
}

// Accessible Modal Component
interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const { saveFocus, restoreFocus } = useFocusManagement()

  useEffect(() => {
    if (isOpen) {
      saveFocus()
      // Focus the modal after a brief delay to ensure it's rendered
      setTimeout(() => {
        modalRef.current?.focus()
      }, 100)
    } else {
      restoreFocus()
    }
  }, [isOpen, saveFocus, restoreFocus])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="accessible-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <FocusTrap active={isOpen} onEscape={onClose}>
        <div
          ref={modalRef}
          className={`accessible-modal ${className}`}
          onClick={e => e.stopPropagation()}
          tabIndex={-1}
        >
          <div className="accessible-modal__header">
            <h2 id="modal-title" className="accessible-modal__title">
              {title}
            </h2>
            <button onClick={onClose} className="accessible-modal__close" aria-label="Close modal">
              ×
            </button>
          </div>
          <div className="accessible-modal__content">{children}</div>
        </div>
      </FocusTrap>
    </div>
  )
}

// Utility Functions
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) => {
  const announcer = document.createElement('div')
  announcer.setAttribute('aria-live', priority)
  announcer.setAttribute('aria-atomic', 'true')
  announcer.className = 'sr-only'
  announcer.textContent = message

  document.body.appendChild(announcer)

  setTimeout(() => {
    document.body.removeChild(announcer)
  }, 1000)
}

export const focusElement = (selector: string) => {
  const element = document.querySelector(selector) as HTMLElement
  if (element) {
    element.focus()
  }
}

export const addFocusStyles = (element: HTMLElement) => {
  element.style.outline = '2px solid #3b82f6'
  element.style.outlineOffset = '2px'
}

export const removeFocusStyles = (element: HTMLElement) => {
  element.style.outline = ''
  element.style.outlineOffset = ''
}
