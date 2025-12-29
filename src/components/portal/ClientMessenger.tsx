'use client'

import { useState, useRef, useEffect } from 'react'
import { useClientMessages } from '@/hooks/useClientMessages'

interface ClientMessengerProps {
  listingId: string
  shareLinkId: string
  clientName?: string | null
  clientEmail?: string | null
  brandColor?: string
  agentName?: string
  agentHeadshot?: string | null
}

export function ClientMessenger({
  listingId,
  shareLinkId,
  clientName,
  clientEmail,
  brandColor = '#0066FF',
  agentName = 'Your Agent',
  agentHeadshot,
}: ClientMessengerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [name, setName] = useState(clientName || '')
  const [email, setEmail] = useState(clientEmail || '')
  const [isSending, setIsSending] = useState(false)
  const [showNameForm, setShowNameForm] = useState(!clientName)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    isLoading,
    sendMessage,
    unreadCount,
  } = useClientMessages({
    listingId,
    shareLinkId,
    enabled: isOpen,
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    // Check if we need name first
    if (!name && showNameForm) {
      return
    }

    setIsSending(true)
    const success = await sendMessage(message.trim(), name, email)
    setIsSending(false)

    if (success) {
      setMessage('')
      if (showNameForm) {
        setShowNameForm(false)
      }
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    }
  }

  // Group messages by date
  const messagesByDate = messages.reduce((acc, msg) => {
    const dateKey = new Date(msg.created_at).toDateString()
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(msg)
    return acc
  }, {} as Record<string, typeof messages>)

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: brandColor }}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '500px', maxHeight: 'calc(100vh - 160px)' }}>
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: brandColor }}
          >
            {agentHeadshot ? (
              <img
                src={agentHeadshot}
                alt={agentName}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white font-semibold">
                  {agentName.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-white font-semibold">{agentName}</h3>
              <p className="text-white/70 text-sm">Typically replies within an hour</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-neutral-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-neutral-600 font-medium">Start a conversation</p>
                <p className="text-neutral-400 text-sm mt-1">
                  Have a question about your photos? Send a message!
                </p>
              </div>
            ) : (
              <>
                {Object.entries(messagesByDate).map(([dateKey, dateMessages]) => (
                  <div key={dateKey}>
                    <div className="flex items-center justify-center my-4">
                      <span className="text-xs text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full">
                        {formatDate(dateMessages[0].created_at)}
                      </span>
                    </div>
                    {dateMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex mb-3 ${
                          msg.sender_type === 'seller' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            msg.sender_type === 'seller'
                              ? 'bg-neutral-800 text-white rounded-br-md'
                              : 'bg-white text-neutral-800 rounded-bl-md shadow-sm'
                          }`}
                          style={
                            msg.sender_type === 'seller'
                              ? { backgroundColor: brandColor }
                              : undefined
                          }
                        >
                          {msg.sender_type !== 'seller' && (
                            <p className="text-xs font-medium mb-1" style={{ color: brandColor }}>
                              {msg.sender_name || agentName}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.sender_type === 'seller'
                                ? 'text-white/60'
                                : 'text-neutral-400'
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-neutral-200">
            {showNameForm && !name && (
              <div className="mb-3 space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ ['--tw-ring-color' as string]: brandColor }}
                  required
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email (optional)"
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ ['--tw-ring-color' as string]: brandColor }}
                />
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 resize-none min-h-[44px] max-h-32"
                style={{ ['--tw-ring-color' as string]: brandColor }}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <button
                type="submit"
                disabled={isSending || !message.trim() || (showNameForm && !name)}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
