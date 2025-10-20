# Backend Contract (Used by Expo App)

Base URL: `http://localhost:8800`

## Auth
### POST /auth/login
- Request: `{ idToken: string }`
- Response: `{ user: {...}, token?: string }`

### POST /auth/register
- Request: `{ idToken: string, displayName?: string }`
- Response: `{ user: {...}, token?: string }`

## Profile
### GET /profile
- Headers: `Authorization: Bearer <idToken>`
- Response:
{ id: string, email: string, name: string, avatarUrl: string, base64Image?: string }


## Upload
### POST /upload
- Headers: `Authorization: Bearer <idToken>`
- Content-Type: `multipart/form-data`
- Fields: `image` (file)
- Response:
{ avatarUrl: string, base64Image?: string }

- Behavior: uploads to Cloudinary, stores only Cloudinary URL in Supabase, deletes previous image.

## AI Recommendations
### POST /ai/recommendations
- Headers: `Authorization: Bearer <idToken>`
- Request:
{ query: string, latitude: number, longitude: number }

- Response:
{ restaurants: [ { id: string, name: string, latitude: number, longitude: number, address?: string, rating?: number, distanceMeters?: number } ] }

- Notes: Backend handles deduplication and fallback.