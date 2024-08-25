# hono-oidc-sample

参考：<https://zenn.dev/levtech/articles/what-is-oidc>

## GCP

- 新規プロジェクトを作成する
- Oauth consent screen 画面 (<https://console.cloud.google.com/apis/credentials/consent>) に進む
  - User Type: External を選択して作成する
  - App information を設定する
  - Scopes を設定する
    - Your non-sensitive scopes に .../auth/userinfo.profile (See your personal info, including any personal info you've made publicly available) を選択する
  - Test users を設定する
- Credentials 画面 (<https://console.cloud.google.com/apis/credentials>) に進む
  - "+ CREATE CREDENTIALS" から OAuth client ID (Requests user consent so your app can access the user's data) を選択する
  - Application type として Web application を選択する
  - Name に適当な名前を入力する
  - Authorized redirect URIs (Users will be redirected to this path after they have authenticated with Google. The path will be appended with the authorization code for access, and must have a protocol. It can’t contain URL fragments, relative paths, or wildcards, and can’t be a public IP address.) を設定する
    - ひとまず <http://localhost:3000/callback> を入力する
  - OAuth client ID を作成して、Client ID と Client secret を控える
