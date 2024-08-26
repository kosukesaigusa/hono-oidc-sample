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
    - ひとまず <http://localhost:8787/callback> を入力する
  - OAuth client ID を作成して、Client ID と Client secret を控える

## 環境構築

`.dev.vars` に GCP で作成した OAuth client ID と client secret を設定する。

```.dev.vars
GOOGLE_OAUTH_CLIENT_ID = "YOUR_GOOGLE_OAUTH_CLIENT_ID"
GOOGLE_OAUTH_CLIENT_SECRET = "YOUR_GOOGLE_OAUTH_CLIENT_SECRET"
```

bun をインストールする。

```sh
brew install oven-sh/bun/bun
```

依存関係をインストールする。

```sh
bun i
```

Dev サーバーを起動する。

```sh
bun run dev
```

テストリクエストを行う。

```sh
$ curl http://localhost:8787
Hello Hono!
```

## CI

`.github/workflows/deploy.yml` を参照する。

Repository secrets に下記を設定しておく。

![Repository Secrets](https://github.com/user-attachments/assets/7fef3008-e7cd-43d4-9b96-7606dbf1b579)
