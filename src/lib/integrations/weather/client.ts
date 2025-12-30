import { createAdminClient } from '@/lib/supabase/admin'

export interface WeatherForecast {
  date: string // ISO date string
  conditions: string
  icon: string
  high_temp_f: number
  low_temp_f: number
  precipitation_chance: number // 0-100
  wind_speed_mph: number
  humidity: number
  uv_index: number
  sunrise: string
  sunset: string
  description: string
}

export interface WeatherAlert {
  type: 'rain' | 'wind' | 'storm' | 'heat' | 'cold'
  severity: 'warning' | 'caution' | 'info'
  message: string
}

export interface DailyForecastResult {
  date: string
  forecast: WeatherForecast
  alerts: WeatherAlert[]
  is_good_for_shoot: boolean
}

interface WeatherConfig {
  rain_threshold_percent: number
  wind_threshold_mph: number
  show_forecast_days: number
}

const DEFAULT_CONFIG: WeatherConfig = {
  rain_threshold_percent: 30,
  wind_threshold_mph: 15,
  show_forecast_days: 7,
}

/**
 * Get weather alert configuration
 */
async function getWeatherConfig(): Promise<WeatherConfig> {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('business_settings')
      .select('setting_value')
      .eq('setting_key', 'weather_alerts')
      .single() as { data: { setting_value: Partial<WeatherConfig> } | null }

    if (data?.setting_value) {
      return {
        ...DEFAULT_CONFIG,
        ...data.setting_value,
      }
    }
  } catch (error) {
    console.warn('[Weather] Using default config:', error)
  }
  return DEFAULT_CONFIG
}

/**
 * Check cache for existing forecast
 */
async function getCachedForecast(
  lat: number,
  lng: number,
  date: string
): Promise<WeatherForecast | null> {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('weather_forecasts')
      .select('*')
      .eq('latitude', lat.toFixed(4))
      .eq('longitude', lng.toFixed(4))
      .eq('forecast_date', date)
      .gt('expires_at', new Date().toISOString())
      .single() as { data: { forecast_data: WeatherForecast } | null }

    if (data?.forecast_data) {
      return data.forecast_data
    }
  } catch {
    // No cache hit
  }
  return null
}

/**
 * Save forecast to cache
 */
async function cacheForecast(
  lat: number,
  lng: number,
  date: string,
  forecast: WeatherForecast
): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Cache expires in 3 hours
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('weather_forecasts').upsert(
      {
        latitude: lat.toFixed(4),
        longitude: lng.toFixed(4),
        forecast_date: date,
        forecast_data: forecast as unknown as Record<string, unknown>,
        high_temp_f: forecast.high_temp_f,
        low_temp_f: forecast.low_temp_f,
        precipitation_chance: forecast.precipitation_chance,
        wind_speed_mph: forecast.wind_speed_mph,
        conditions: forecast.conditions,
        expires_at: expiresAt.toISOString(),
        source: 'openweathermap',
      },
      { onConflict: 'latitude,longitude,forecast_date' }
    )
  } catch (error) {
    console.error('[Weather] Cache error:', error)
  }
}

/**
 * Fetch weather from OpenWeatherMap API
 */
async function fetchFromOpenWeatherMap(
  lat: number,
  lng: number
): Promise<WeatherForecast[]> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY

  if (!apiKey) {
    console.warn('[Weather] OPENWEATHERMAP_API_KEY not configured')
    return generateMockForecasts()
  }

  try {
    // Use One Call API 3.0 for 7-day forecast
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&units=imperial&exclude=minutely,hourly,alerts&appid=${apiKey}`

    const response = await fetch(url, { next: { revalidate: 3600 } })

    if (!response.ok) {
      throw new Error(`OpenWeatherMap API error: ${response.status}`)
    }

    const data = await response.json()

    return data.daily.slice(0, 7).map(
      (day: {
        dt: number
        temp: { max: number; min: number }
        weather: Array<{ main: string; icon: string; description: string }>
        pop: number
        wind_speed: number
        humidity: number
        uvi: number
        sunrise: number
        sunset: number
      }) => {
        const date = new Date(day.dt * 1000).toISOString().split('T')[0]
        return {
          date,
          conditions: day.weather[0]?.main || 'Unknown',
          icon: day.weather[0]?.icon || '01d',
          high_temp_f: Math.round(day.temp.max),
          low_temp_f: Math.round(day.temp.min),
          precipitation_chance: Math.round((day.pop || 0) * 100),
          wind_speed_mph: Math.round(day.wind_speed),
          humidity: day.humidity,
          uv_index: Math.round(day.uvi),
          sunrise: new Date(day.sunrise * 1000).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
          sunset: new Date(day.sunset * 1000).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
          description: day.weather[0]?.description || '',
        } as WeatherForecast
      }
    )
  } catch (error) {
    console.error('[Weather] API error:', error)
    return generateMockForecasts()
  }
}

/**
 * Generate mock forecasts when API is unavailable
 */
function generateMockForecasts(): WeatherForecast[] {
  const forecasts: WeatherForecast[] = []
  const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rain', 'Thunderstorm']

  for (let i = 0; i < 7; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    // Florida-ish weather simulation
    const baseTemp = 75 + Math.random() * 15
    const precipChance = Math.random() * 40 // Florida afternoon showers

    forecasts.push({
      date: dateStr,
      conditions: conditions[Math.floor(Math.random() * conditions.length)],
      icon: '01d',
      high_temp_f: Math.round(baseTemp + 10),
      low_temp_f: Math.round(baseTemp - 5),
      precipitation_chance: Math.round(precipChance),
      wind_speed_mph: Math.round(5 + Math.random() * 10),
      humidity: Math.round(60 + Math.random() * 20),
      uv_index: Math.round(6 + Math.random() * 4),
      sunrise: '6:45 AM',
      sunset: '7:30 PM',
      description: 'Mock forecast - API key not configured',
    })
  }

  return forecasts
}

/**
 * Analyze forecast and generate alerts
 */
function analyzeForecasts(
  forecast: WeatherForecast,
  config: WeatherConfig
): { alerts: WeatherAlert[]; isGoodForShoot: boolean } {
  const alerts: WeatherAlert[] = []

  // Check precipitation
  if (forecast.precipitation_chance >= config.rain_threshold_percent) {
    alerts.push({
      type: 'rain',
      severity:
        forecast.precipitation_chance >= 60 ? 'warning' : 'caution',
      message: `${forecast.precipitation_chance}% chance of rain`,
    })
  }

  // Check wind
  if (forecast.wind_speed_mph >= config.wind_threshold_mph) {
    alerts.push({
      type: 'wind',
      severity: forecast.wind_speed_mph >= 25 ? 'warning' : 'caution',
      message: `Wind gusts up to ${forecast.wind_speed_mph} mph - drone flight may be affected`,
    })
  }

  // Check for storms
  if (
    forecast.conditions.toLowerCase().includes('thunder') ||
    forecast.conditions.toLowerCase().includes('storm')
  ) {
    alerts.push({
      type: 'storm',
      severity: 'warning',
      message: 'Thunderstorms expected - outdoor shoots not recommended',
    })
  }

  // Check extreme heat
  if (forecast.high_temp_f >= 95) {
    alerts.push({
      type: 'heat',
      severity: 'caution',
      message: `High temperature of ${forecast.high_temp_f}°F - schedule for morning if possible`,
    })
  }

  // Determine if good for shooting
  const isGoodForShoot =
    forecast.precipitation_chance < config.rain_threshold_percent &&
    forecast.wind_speed_mph < config.wind_threshold_mph &&
    !forecast.conditions.toLowerCase().includes('thunder')

  return { alerts, isGoodForShoot }
}

/**
 * Get weather forecast for a location
 */
export async function getWeatherForecast(
  lat: number,
  lng: number
): Promise<DailyForecastResult[]> {
  const config = await getWeatherConfig()
  const results: DailyForecastResult[] = []

  // Fetch forecasts (will use cache or API)
  const forecasts = await fetchFromOpenWeatherMap(lat, lng)

  for (const forecast of forecasts) {
    // Check cache first
    const cached = await getCachedForecast(lat, lng, forecast.date)
    const finalForecast = cached || forecast

    // Cache if not from cache
    if (!cached) {
      await cacheForecast(lat, lng, forecast.date, finalForecast)
    }

    const { alerts, isGoodForShoot } = analyzeForecasts(finalForecast, config)

    results.push({
      date: finalForecast.date,
      forecast: finalForecast,
      alerts,
      is_good_for_shoot: isGoodForShoot,
    })
  }

  return results
}

/**
 * Get weather icon URL
 */
export function getWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`
}

/**
 * Format temperature display
 */
export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°F`
}
