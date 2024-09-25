import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/**
 * Google OAuth 2.0 認証エンドポイント。
 */
const GOOGLE_OAUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'

/**
 * Google OAuth 2.0 トークンエンドポイント。
 */
const GOOGLE_OAUTH_TOKEN_ENDPOINT = 'https://www.googleapis.com/oauth2/v4/token'

/**
 * Google UserInfo エンドポイント。
 */
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'

/**
 * Google OAuth 2.0 JWKS (JSON Web Key Set) URI.
 */
const GOOGLE_OAUTH_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs'

/**
 * Cloudflare Workers の環境変数の型定義。
 */
type Bindings = {
  BASE_URL: string
  GOOGLE_OAUTH_CLIENT_ID: string
  GOOGLE_OAUTH_CLIENT_SECRET: string
}

/**
 * Hono アプリケーションのインスタンスを作成する。
 */
const app = new Hono<{ Bindings: Bindings }>()

// JSON レスポンスを整形するミドルウェアを使用する。
app.use(prettyJSON())

/**
 * ルートパスへのGETリクエストを処理する。
 * @param {Context} c - Honoのコンテキストオブジェクト。
 * @returns {Response} テキストレスポンス。
 */
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

/**
 * Google OAuth 2.0 認証を開始するエンドポイント。
 * @param {Context} c - Honoのコンテキストオブジェクト。
 * @returns {Response} Google認証ページへのリダイレクトレスポンス。
 */
app.get('/auth', (c) => {
  const responseType = 'code'
  // 認可エンドポイントの URL のクエリパラメータを配列で定義する。
  const queryParams = [
    `response_type=${responseType}`,
    `client_id=${encodeURIComponent(c.env.GOOGLE_OAUTH_CLIENT_ID)}`,
    `redirect_uri=${encodeURIComponent(`${c.env.BASE_URL}/callback`)}`,
    // クライアントが要求する情報のスコープを定義する。
    `scope=${encodeURIComponent(
      [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ].join(' ')
    )}`,
  ]

  // クエリパラメータを結合して認可エンドポイントの URL を構築する。
  const googleOAuthUrl = `${GOOGLE_OAUTH_ENDPOINT}?${queryParams.join('&')}`
  console.log(`Redirecting to: ${googleOAuthUrl}`)

  // 認可エンドポイントにリダイレクトして、ユーザー認証を開始する。
  return c.redirect(googleOAuthUrl)
})

/**
 * Google OAuth 2.0 認証のコールバックを処理するエンドポイント。
 * @param {Context} c - Honoのコンテキストオブジェクト。
 * @returns {Promise<Response>} ユーザー情報を含むJSONレスポンス、またはエラーレスポンス。
 */
app.get('/callback', async (c) => {
  console.log(`callback: ${c.req.url}`)
  // 認可コードを受け取る。
  const url = new URL(c.req.url)
  const code = url.searchParams.get('code')

  // 認可コードがない場合はエラーを返す。
  if (!code) {
    return c.text('Authorization code not found', 400)
  }

  // 認可コードを使用してトークンをリクエストする。
  const tokenResponse = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      code,
      client_id: c.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: c.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: `${c.env.BASE_URL}/callback`,
      // 認可コードを使ってトークンをリクエストするために指定する。
      grant_type: 'authorization_code',
    }),
  })

  // トークンレスポンスを確認する。
  const tokenData = await tokenResponse.json()
  console.log('Token response:', tokenData)

  // ID トークンを取り出す。存在しない場合はエラーを返す。
  const idToken = tokenData.id_token as string | undefined
  if (!idToken) {
    return c.text('Failed to obtain ID token', 400)
  }

  try {
    // GOOGLE_OAUTH_JWKS_URI を使ってリモートからキーセットを動的に取得する。
    const jwks = createRemoteJWKSet(new URL(GOOGLE_OAUTH_JWKS_URI))

    // ID トークンを検証する。
    const { payload } = await jwtVerify(idToken, jwks, {
      // Id トークンが、「正しい発行者 (issuer) = Google」から発行されたことを確認する。
      issuer: 'https://accounts.google.com',
      // Id トークンが、「正しいクライアント ID (audience) = 自分のアプリケーション」向けに発行されたことを確認する。
      audience: c.env.GOOGLE_OAUTH_CLIENT_ID,
    })
    console.log('ID Token verified successfully:', payload)
  } catch (error) {
    console.error('ID Token verification failed:', error)
    // 検証に失敗した場合はエラーを返す。
    return c.text('ID Token verification failed', 400)
  }

  // アクセストークンを取り出す。存在しない場合はエラーを返す。
  const accessToken = tokenData.access_token as string | undefined
  if (!accessToken) {
    return c.text('Access token not found', 400)
  }

  // アクセストークンを利用して、Google の UserInfo エンドポイントから追加情報を取得する。
  const userInfoResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const userInfo = await userInfoResponse.json()

  // 得られたユーザー情報を返す。
  return c.json(userInfo)
})

export default app
