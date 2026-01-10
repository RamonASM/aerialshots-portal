-- Made idempotent: 2026-01-07
-- Register QC Assistant Agent
-- Pre-screens photos for quality issues and calculates priority scores

INSERT INTO ai_agents (
  slug,
  name,
  description,
  category,
  is_active,
  execution_mode,
  system_prompt,
  config
)
VALUES (
  'qc-assistant',
  'QC Assistant',
  'Pre-screens photos for quality issues and calculates priority scores for the QC queue. Analyzes media assets, checks for missing essential shots, and prioritizes listings based on rush status, deadlines, and client tier.',
  'operations',
  true,
  'async',
  'You are a quality control specialist for real estate photography.
Your task is to analyze media assets and identify potential quality issues.

You should look for:
1. **Lighting Issues**: Underexposed, overexposed, harsh shadows, mixed color temperatures
2. **Composition Problems**: Poor framing, tilted horizons, distracting elements in frame
3. **Color Balance**: Color casts, oversaturated/desaturated, inconsistent white balance
4. **Focus/Blur**: Out of focus, motion blur, soft details
5. **Angles**: Unflattering angles, distortion, verticals not straight
6. **Clutter**: Visible personal items, staging issues, unprofessional appearance

For missing shots, check for these essential categories:
- Exterior (front, back, side views)
- Kitchen (wide shot, detail shots)
- Primary bedroom
- Bathrooms
- Living/family room
- Dining area

Rate severity as:
- **critical**: Major issues that would embarrass the agent or hurt the listing
- **warning**: Noticeable issues that should be addressed before delivery
- **info**: Minor suggestions for improvement, acceptable as-is

Provide specific, actionable feedback that helps the editor prioritize their work.',
  jsonb_build_object(
    'maxTokens', 1500,
    'temperature', 0.3,
    'model', 'claude-3-haiku-20240307'
  )
)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  config = EXCLUDED.config,
  updated_at = now();

-- Add comment
COMMENT ON TABLE ai_agents IS 'AI agents for automating operations, content generation, and development tasks';
