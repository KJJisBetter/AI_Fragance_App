import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseVoiceSearchOptions {
  continuous?: boolean
  lang?: string
  interimResults?: boolean
}

interface UseVoiceSearchResult {
  supported: boolean
  transcript: string
  isListening: boolean
  start: () => void
  stop: () => void
  reset: () => void
}

// Web-speech typings guard (window.SpeechRecognition | webkitSpeechRecognition)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – libDOM does not include the experimental Web Speech API
const SpeechRecognition: typeof window.SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined

export const useVoiceSearch = (options: UseVoiceSearchOptions = {}): UseVoiceSearchResult => {
  const { continuous = false, lang = 'en-US', interimResults = false } = options

  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const supported = typeof SpeechRecognition !== 'undefined'

  // Lazily create recognition instance
  const getRecognition = () => {
    if (!supported) return null
    if (recognitionRef.current) return recognitionRef.current

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – constructor typing
    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.lang = lang
    recognition.interimResults = interimResults

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.addEventListener('result', (event: any) => {
      const result = Array.from(event.results)
        .map(res => res[0]?.transcript)
        .join(' ')
      setTranscript(result.trim())
    })

    recognition.addEventListener('end', () => {
      setIsListening(false)
    })

    recognition.addEventListener('error', () => {
      setIsListening(false)
    })

    recognitionRef.current = recognition
    return recognition
  }

  const start = useCallback(() => {
    const recognition = getRecognition()
    if (recognition && !isListening) {
      try {
        recognition.start()
        setIsListening(true)
      } catch {
        /* ignored */
      }
    }
  }, [isListening])

  const stop = useCallback(() => {
    const recognition = getRecognition()
    if (recognition && isListening) {
      recognition.stop()
      setIsListening(false)
    }
  }, [isListening])

  const reset = useCallback(() => {
    setTranscript('')
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  return { supported, transcript, isListening, start, stop, reset }
}
