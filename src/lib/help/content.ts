import gettingStarted from '@/content/help/getting-started.json'
import prepChecklist from '@/content/help/prep-checklist.json'
import usingYourMedia from '@/content/help/using-your-media.json'
import socialMediaGuide from '@/content/help/social-media-guide.json'

export interface HelpArticle {
  slug: string
  title: string
  description: string
  category: string
  order: number
  content: {
    en: {
      sections: Array<{
        title: string
        content: string
      }>
    }
    es: {
      sections: Array<{
        title: string
        content: string
      }>
    }
  }
}

export const helpArticles: HelpArticle[] = [
  gettingStarted as HelpArticle,
  prepChecklist as HelpArticle,
  usingYourMedia as HelpArticle,
  socialMediaGuide as HelpArticle,
]

export const categories = [
  { id: 'onboarding', name: 'Getting Started', nameEs: 'Comenzando' },
  { id: 'education', name: 'Marketing & Tips', nameEs: 'Marketing y Consejos' },
]

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return helpArticles.find((article) => article.slug === slug)
}

export function getArticlesByCategory(categoryId: string): HelpArticle[] {
  return helpArticles
    .filter((article) => article.category === categoryId)
    .sort((a, b) => a.order - b.order)
}

export function searchArticles(query: string, lang: 'en' | 'es' = 'en'): HelpArticle[] {
  const normalizedQuery = query.toLowerCase()
  return helpArticles.filter((article) => {
    const content = article.content[lang]
    const titleMatch = article.title.toLowerCase().includes(normalizedQuery)
    const descMatch = article.description.toLowerCase().includes(normalizedQuery)
    const contentMatch = content.sections.some(
      (section) =>
        section.title.toLowerCase().includes(normalizedQuery) ||
        section.content.toLowerCase().includes(normalizedQuery)
    )
    return titleMatch || descMatch || contentMatch
  })
}
