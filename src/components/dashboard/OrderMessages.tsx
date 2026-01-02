'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, User } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type ClientMessage = Database['public']['Tables']['client_messages']['Row']

interface OrderMessagesProps {
  listingId: string | null
  messages: ClientMessage[]
  agentName: string
}

export function OrderMessages({ listingId, messages: initialMessages, agentName }: OrderMessagesProps) {
  const [messages, setMessages] = useState<ClientMessage[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !listingId) return

    setIsSending(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          content: newMessage.trim(),
        }),
      })

      const data = await response.json()
      if (response.ok && data.message) {
        setMessages((prev) => [...prev, data.message])
        setNewMessage('')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (!listingId) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          Client Messages
        </h2>
        <p className="text-neutral-400 text-sm">
          Messages will be available once the order is linked to a listing.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-neutral-800 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-400" />
        <h2 className="font-semibold text-white">Client Messages</h2>
        {messages.length > 0 && (
          <span className="ml-auto text-xs text-neutral-500">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Messages List */}
      <div className="max-h-80 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6 text-neutral-500" />
            </div>
            <p className="text-neutral-400 text-sm">No messages yet</p>
            <p className="text-neutral-500 text-xs mt-1">
              Messages from clients will appear here
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender_type === 'agent' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender_type === 'agent'
                    ? 'bg-blue-500/20'
                    : 'bg-neutral-700'
                }`}
              >
                <User
                  className={`w-4 h-4 ${
                    message.sender_type === 'agent'
                      ? 'text-blue-400'
                      : 'text-neutral-400'
                  }`}
                />
              </div>
              <div
                className={`flex-1 max-w-[80%] ${
                  message.sender_type === 'agent' ? 'text-right' : ''
                }`}
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-neutral-300">
                    {message.sender_type === 'agent'
                      ? agentName
                      : message.sender_name || 'Client'}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {message.created_at ? formatTime(message.created_at) : ''}
                  </span>
                </div>
                <div
                  className={`inline-block px-3 py-2 rounded-lg text-sm ${
                    message.sender_type === 'agent'
                      ? 'bg-blue-500/20 text-blue-100'
                      : 'bg-neutral-800 text-neutral-200'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Message */}
      <div className="p-4 border-t border-neutral-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
