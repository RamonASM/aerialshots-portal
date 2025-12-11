'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, BookOpen, Lightbulb, ChevronRight, Globe } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { helpArticles, categories, searchArticles, getArticlesByCategory } from '@/lib/help/content'

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [language, setLanguage] = useState<'en' | 'es'>('en')

  const searchResults = searchQuery ? searchArticles(searchQuery, language) : null

  const categoryIcons: Record<string, React.ElementType> = {
    onboarding: BookOpen,
    education: Lightbulb,
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-xl font-bold text-neutral-900">
                ASM <span className="text-[#ff4533]">Help Center</span>
              </Link>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              {language === 'en' ? 'ES' : 'EN'}
            </Button>
          </div>

          <h1 className="mt-6 text-3xl font-bold text-neutral-900">
            {language === 'en' ? 'How can we help?' : '¿Cómo podemos ayudarte?'}
          </h1>

          {/* Search */}
          <div className="relative mt-6">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
            <Input
              type="text"
              placeholder={
                language === 'en'
                  ? 'Search for articles...'
                  : 'Buscar artículos...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search Results */}
        {searchResults ? (
          <div className="space-y-4">
            <h2 className="font-semibold text-neutral-900">
              {language === 'en'
                ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
                : `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} para "${searchQuery}"`}
            </h2>

            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/help/${article.slug}?lang=${language}`}
                    className="block rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300"
                  >
                    <h3 className="font-medium text-neutral-900">{article.title}</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {article.description}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500">
                {language === 'en'
                  ? 'No articles found. Try a different search term.'
                  : 'No se encontraron artículos. Intenta con otro término.'}
              </p>
            )}

            <Button variant="ghost" onClick={() => setSearchQuery('')}>
              {language === 'en' ? '← Back to all articles' : '← Volver a todos los artículos'}
            </Button>
          </div>
        ) : (
          /* Categories */
          <div className="space-y-8">
            {categories.map((category) => {
              const Icon = categoryIcons[category.id] || BookOpen
              const articles = getArticlesByCategory(category.id)

              return (
                <div key={category.id}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff4533]/10">
                      <Icon className="h-5 w-5 text-[#ff4533]" />
                    </div>
                    <h2 className="text-xl font-semibold text-neutral-900">
                      {language === 'en' ? category.name : category.nameEs}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {articles.map((article) => (
                      <Link
                        key={article.slug}
                        href={`/help/${article.slug}?lang=${language}`}
                        className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300"
                      >
                        <div>
                          <h3 className="font-medium text-neutral-900">
                            {article.title}
                          </h3>
                          <p className="mt-1 text-sm text-neutral-500">
                            {article.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-neutral-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Contact */}
        <div className="mt-12 rounded-lg border border-neutral-200 bg-white p-6 text-center">
          <h2 className="font-semibold text-neutral-900">
            {language === 'en'
              ? "Can't find what you're looking for?"
              : '¿No encuentras lo que buscas?'}
          </h2>
          <p className="mt-2 text-neutral-600">
            {language === 'en'
              ? 'Contact our team for personalized help.'
              : 'Contacta a nuestro equipo para ayuda personalizada.'}
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Button asChild>
              <a href="tel:+14075550100">
                {language === 'en' ? 'Call Us' : 'Llámanos'}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:hello@aerialshots.media">
                {language === 'en' ? 'Email Us' : 'Escríbenos'}
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
