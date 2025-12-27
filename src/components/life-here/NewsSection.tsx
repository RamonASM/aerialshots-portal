'use client'

import { useState } from 'react'
import { Newspaper, MessageSquare, Bell, ExternalLink, ArrowUp, Calendar } from 'lucide-react'
import Image from 'next/image'
import type { NewsData, NewsArticle, CommunityDiscussion, CuratedUpdate } from '@/lib/api/types'

interface NewsSectionProps {
  news: NewsData | null
}

type TabKey = 'news' | 'discussions' | 'updates'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getCategoryColor(category: CuratedUpdate['category']): string {
  switch (category) {
    case 'development':
      return 'bg-blue-500/20 text-blue-400'
    case 'business':
      return 'bg-green-500/20 text-green-400'
    case 'infrastructure':
      return 'bg-orange-500/20 text-orange-400'
    case 'event':
      return 'bg-purple-500/20 text-purple-400'
    case 'school':
      return 'bg-yellow-500/20 text-yellow-400'
    case 'park':
      return 'bg-emerald-500/20 text-emerald-400'
    default:
      return 'bg-white/10 text-[#a1a1a6]'
  }
}

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-colors"
    >
      {article.imageUrl && (
        <div className="relative h-32 overflow-hidden">
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-[#636366]">{article.source}</span>
          <span className="text-xs text-[#636366]">·</span>
          <span className="text-xs text-[#636366]">{formatDate(article.publishedAt)}</span>
        </div>
        <h4 className="font-medium text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
          {article.title}
        </h4>
        {article.description && (
          <p className="text-sm text-[#a1a1a6] mt-1 line-clamp-2">
            {article.description}
          </p>
        )}
      </div>
    </a>
  )
}

function DiscussionCard({ discussion }: { discussion: CommunityDiscussion }) {
  return (
    <a
      href={discussion.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center text-center min-w-[40px]">
          <ArrowUp className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-white">{discussion.score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-orange-500">r/{discussion.subreddit}</span>
          <h4 className="font-medium text-white line-clamp-2 mt-1">{discussion.title}</h4>
          <div className="flex items-center gap-3 mt-2 text-xs text-[#636366]">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {discussion.commentCount} comments
            </span>
            <span>{formatDate(discussion.createdAt)}</span>
          </div>
        </div>
      </div>
    </a>
  )
}

function UpdateCard({ update }: { update: CuratedUpdate }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${getCategoryColor(update.category)} mb-2`}>
            {update.category}
          </span>
          <h4 className="font-medium text-white">{update.title}</h4>
          {update.description && (
            <p className="text-sm text-[#a1a1a6] mt-1 line-clamp-2">
              {update.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-[#636366]">
            <Calendar className="w-3 h-3" />
            {formatDate(update.createdAt)}
          </div>
        </div>
        {update.sourceUrl && (
          <a
            href={update.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#636366] hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  )
}

export function NewsSection({ news }: NewsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('news')

  if (!news) {
    return null
  }

  const { articles, discussions, curatedUpdates } = news

  // Check if we have any data
  if ((!articles || articles.length === 0) &&
      (!discussions || discussions.length === 0) &&
      (!curatedUpdates || curatedUpdates.length === 0)) {
    return null
  }

  const allTabs: { key: TabKey; label: string; icon: typeof Newspaper; count: number }[] = [
    { key: 'news', label: 'Local News', icon: Newspaper, count: articles?.length || 0 },
    { key: 'discussions', label: 'Discussions', icon: MessageSquare, count: discussions?.length || 0 },
    { key: 'updates', label: 'Community Updates', icon: Bell, count: curatedUpdates?.length || 0 },
  ]
  const tabs = allTabs.filter(tab => tab.count > 0)

  // Set active tab to first available if current has no data
  const currentTabData = activeTab === 'news' ? articles :
                         activeTab === 'discussions' ? discussions : curatedUpdates
  if (!currentTabData || currentTabData.length === 0) {
    const firstAvailable = tabs[0]?.key
    if (firstAvailable && firstAvailable !== activeTab) {
      setActiveTab(firstAvailable)
    }
  }

  return (
    <section className="py-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-semibold text-white">Local News & Community</h2>
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-white text-black font-medium'
                  : 'bg-white/[0.05] text-[#a1a1a6] hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className="text-xs opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'news' && articles && articles.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.slice(0, 6).map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {activeTab === 'discussions' && discussions && discussions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {discussions.slice(0, 6).map((discussion) => (
            <DiscussionCard key={discussion.id} discussion={discussion} />
          ))}
        </div>
      )}

      {activeTab === 'updates' && curatedUpdates && curatedUpdates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {curatedUpdates.slice(0, 6).map((update) => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-[#636366]">
        News via News API · Discussions via Reddit · Updates curated by ASM
      </p>
    </section>
  )
}
