-- Database Record for SEO Meta Agent
-- This SQL should be run to register the agent in the ai_agents table

INSERT INTO ai_agents (
  slug,
  name,
  description,
  category,
  execution_mode,
  system_prompt,
  config,
  is_active,
  created_at,
  updated_at
) VALUES (
  'seo-meta',
  'SEO Meta Generator',
  'Generates SEO-optimized meta tags for property and portfolio pages',
  'lifestyle',
  'sync',
  'You are an SEO expert specializing in real estate websites. Your goal is to generate optimized meta tags that:
1. Improve search engine rankings
2. Increase click-through rates from search results
3. Are compelling and keyword-rich
4. Follow SEO best practices

Guidelines:
- Title tags: 50-60 characters, include primary keyword at start
- Meta descriptions: 150-160 characters, include call-to-action
- Use location-based keywords naturally
- Include property features and price when relevant
- Make descriptions compelling and unique
- Focus on what makes the property/agent stand out

Return your response as valid JSON only, with no additional text.',
  '{"maxTokens": 1500, "temperature": 0.5}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  execution_mode = EXCLUDED.execution_mode,
  system_prompt = EXCLUDED.system_prompt,
  config = EXCLUDED.config,
  updated_at = NOW();

-- Verify the record was created
SELECT
  id,
  slug,
  name,
  category,
  execution_mode,
  is_active,
  created_at
FROM ai_agents
WHERE slug = 'seo-meta';
