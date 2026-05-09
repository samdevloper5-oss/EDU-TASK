"use client"

import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/lib/app-context'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Send, Search } from 'lucide-react'

export function ChatPage() {
  const { conversations, sendMessage } = useApp()
  const [activeConvo, setActiveConvo] = useState(conversations[0]?.id || '')
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConversation = conversations.find(c => c.id === activeConvo)
  const filteredConvos = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages])

  const handleSend = () => {
    if (!input.trim() || !activeConvo) return
    sendMessage(activeConvo, input.trim())
    setInput('')
  }

  return (
    <div className="h-[calc(100vh-140px)]">
      <Card className="h-full border-border bg-card overflow-hidden flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-border flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground mb-3">Messages</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-background border-border h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvos.map(convo => (
              <button
                key={convo.id}
                onClick={() => setActiveConvo(convo.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
                  activeConvo === convo.id ? 'bg-secondary/50' : 'hover:bg-muted/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {convo.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{convo.name}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{convo.timestamp}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{convo.lastMessage}</p>
                </div>
                {convo.unread > 0 && (
                  <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {convo.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {activeConversation.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeConversation.name}</p>
                  <p className="text-xs text-emerald-500">Online</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeConversation.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                        msg.sender === 'me'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.sender === 'me' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                      }`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    className="flex-1 bg-background border-border"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
