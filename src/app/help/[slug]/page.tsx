'use client'

import { use } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Printer, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getArticleBySlug, helpArticles } from '@/lib/help/content'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function HelpArticlePage({ params }: PageProps) {
  const { slug } = use(params)
  const searchParams = useSearchParams()
  const lang = (searchParams.get('lang') as 'en' | 'es') || 'en'

  const article = getArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  const content = article.content[lang]

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: article.title,
        text: article.description,
        url: window.location.href,
      })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert(lang === 'en' ? 'Link copied to clipboard!' : '¡Enlace copiado!')
    }
  }

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'es' : 'en'
    window.location.href = `/help/${slug}?lang=${newLang}`
  }

  // Find related articles in the same category
  const relatedArticles = helpArticles
    .filter((a) => a.category === article.category && a.slug !== article.slug)
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white print:hidden">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/help" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900">
              <ArrowLeft className="h-4 w-4" />
              {lang === 'en' ? 'Back to Help Center' : 'Volver al Centro de Ayuda'}
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleLanguage}>
                <Globe className="mr-2 h-4 w-4" />
                {lang === 'en' ? 'ES' : 'EN'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <article className="rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
          <header className="mb-8 border-b border-neutral-100 pb-6">
            <h1 className="text-3xl font-bold text-neutral-900">{article.title}</h1>
            <p className="mt-2 text-lg text-neutral-600">{article.description}</p>
          </header>

          <div className="prose prose-neutral max-w-none">
            {content.sections.map((section, index) => (
              <section key={index} className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-neutral-900">
                  {section.title}
                </h2>
                <div className="space-y-4 text-neutral-700">
                  {section.content.split('\n\n').map((paragraph, pIndex) => (
                    <div key={pIndex}>
                      {paragraph.startsWith('- ') || paragraph.startsWith('1. ') ? (
                        <ul className="list-disc space-y-1 pl-6">
                          {paragraph.split('\n').map((item, iIndex) => (
                            <li key={iIndex}>
                              {item.replace(/^[-\d]+\.\s*/, '')}
                            </li>
                          ))}
                        </ul>
                      ) : paragraph.includes('**') ? (
                        <p
                          dangerouslySetInnerHTML={{
                            __html: paragraph
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br />'),
                          }}
                        />
                      ) : (
                        <p className="whitespace-pre-line">{paragraph}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-8 print:hidden">
            <h2 className="mb-4 font-semibold text-neutral-900">
              {lang === 'en' ? 'Related Articles' : 'Artículos Relacionados'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/help/${related.slug}?lang=${lang}`}
                  className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300"
                >
                  <h3 className="font-medium text-neutral-900">{related.title}</h3>
                  <p className="mt-1 text-sm text-neutral-500 line-clamp-2">
                    {related.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-6 text-center print:hidden">
          <h3 className="font-medium text-neutral-900">
            {lang === 'en' ? 'Was this article helpful?' : '¿Te fue útil este artículo?'}
          </h3>
          <div className="mt-4 flex justify-center gap-4">
            <Button variant="outline" size="sm">
              {lang === 'en' ? 'Yes, thanks!' : '¡Sí, gracias!'}
            </Button>
            <Button variant="outline" size="sm">
              {lang === 'en' ? 'Not really' : 'No realmente'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
