export const OFFICE_PROXIMITY_METERS = 12
export const GEOLOCATION_RADIUS_METERS = 100
export const AUTO_CHECKOUT_HOUR = 5
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7 // 7 days
export const PKCE_COOKIE_MAX_AGE = 60 * 10 // 10 minutes

export const ESN_OAUTH = {
  authorizeUrl: 'https://accounts.esn.org/oauth/authorize',
  tokenUrl: 'https://accounts.esn.org/oauth/token',
  userinfoUrl: 'https://accounts.esn.org/oauth/v1/userinfo',
  scope: 'oauth2_access_to_profile_information',
} as const

export const SECTION_NAME = process.env.NEXT_PUBLIC_SECTION_NAME ?? 'ESN'
export const OFFICE_ADDRESS = process.env.NEXT_PUBLIC_OFFICE_ADDRESS ?? 'ESN Office'

export const OFFICE_COORDINATES = {
  latitude: parseFloat(process.env.NEXT_PUBLIC_OFFICE_LATITUDE ?? '0'),
  longitude: parseFloat(process.env.NEXT_PUBLIC_OFFICE_LONGITUDE ?? '0'),
}
