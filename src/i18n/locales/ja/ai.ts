import type en from '../../en/ai';
import type { Translation } from '../../types';

export default {
  // AiPanel — header and mode switch
  'ai.panel.title': 'アシスタント',
  'ai.panel.modelSettings': 'モデルの設定',
  'ai.panel.noModel': 'モデルなし',
  // Tab: generate a new diagram from a prompt
  'ai.panel.modeCreate': '作成',
  // Tab: let the AI modify the diagram on the canvas
  'ai.panel.modeEdit': 'ダイアグラムを編集',
  'ai.panel.canvasEmpty': 'キャンバスは空です',
  'ai.panel.browserWarning': 'ブラウザー版プレビュー: API キーはこのタブのメモリ内にのみ保持され、リクエストはページから直接送信されます。',

  // AiPanel — setup / empty state
  'ai.panel.connectTitle': 'モデルを接続',
  'ai.panel.connectBody': 'Anthropic、OpenAI、Gemini の独自のキーを使用するか、Ollama で完全オフラインで実行できます。',
  'ai.panel.setUp': 'AI をセットアップ',
  'ai.panel.emptyEditTitle': '何を変更しますか?',
  'ai.panel.emptyGenerateTitle': '何を描きますか?',
  'ai.panel.emptyEditSelection': '変更内容を説明してください。「これ」は{count, plural, other {選択中の # 個の項目}}を指します。',
  'ai.panel.emptyEdit': '現在のダイアグラムへの変更内容を説明してください。',
  'ai.panel.emptyGenerate': 'システム、プロセス、スキーマを説明してください。クラウド図には実際の AWS、Azure、GCP アイコンが使われます。',

  // AiPanel — example prompts (clickable chips that fill the prompt box)
  'ai.example.generate1': 'AWS の 3 層 Web アプリ',
  'ai.example.generate2': 'EC サイトの C4 コンテナー図',
  'ai.example.generate3': 'ブログの ER 図',
  'ai.example.generate4': 'パスワードリセットのフローチャート',
  'ai.example.generate5': 'OAuth ログインのシーケンス図',
  'ai.example.generate6': 'Azure のイベント駆動パイプライン',
  'ai.example.edit1': 'データベースの前に Redis キャッシュを追加',
  'ai.example.edit2': 'すべての接続にラベルを付ける',
  'ai.example.edit3': 'すべてのサーバーに接続した監視サービスを追加',
  'ai.example.edit4': '外部システムをグレーで表示',

  // AiPanel — composer
  'ai.panel.placeholderEdit': '例: ロードバランサーの前に CDN を追加',
  'ai.panel.placeholderGenerate': '例: AWS 上のサーバーレス画像アップロードパイプライン',
  // {key} is ⌘ or Ctrl; ↵ is the Enter key
  'ai.panel.sendHint': '{key} ↵ で送信',
  // Verb: stop the running request
  'ai.panel.stop': '停止',
  // Verb: send the prompt
  'ai.panel.send': '送信',

  // AiPanel — run card
  // Badge on a prompt that edited the existing diagram (noun)
  'ai.run.editBadge': '編集',
  'ai.run.starting': '開始中…',
  'ai.run.stopped': '停止しました。',
  'ai.run.tryAgain': 'もう一度試す',

  // AiPanel — result card
  'ai.result.diagramReady': 'ダイアグラムの準備ができました',
  'ai.result.changesReady': '変更の準備ができました',
  'ai.result.specStats': '{shapes, plural, other {# 個の図形}} · {connectors, plural, other {# 本のコネクタ}}',
  'ai.result.specStatsIcons': '{shapes, plural, other {# 個の図形}} · {connectors, plural, other {# 本のコネクタ}} · {icons, plural, other {# 個のアイコン}}',
  'ai.result.editsFallback': '現在のダイアグラムへの編集',
  'ai.result.added': '+{count} 追加',
  'ai.result.changed': '~{count} 変更',
  'ai.result.removed': '−{count} 削除',
  // Notes about things the app adjusted in the AI's output
  'ai.result.adjustments': '{count, plural, other {# 件の調整}}',
  'ai.result.inserted': '挿入しました',
  'ai.result.replaced': 'ダイアグラムを置き換えました',
  'ai.result.applied': '適用しました',
  // {shortcut} is ⌘Z or CtrlZ
  'ai.result.undoHint': '· {shortcut} で元に戻す',
  // Button: replace the whole canvas with the generated diagram
  'ai.result.replaceDiagram': 'ダイアグラムを置き換え',
  'ai.result.applyChanges': '変更を適用',

  // Progress steps (src/ai/generate/agent.ts)
  'ai.step.planning': 'ダイアグラムを計画中',
  'ai.step.working': '処理中',
  'ai.step.searchingIcons': 'アイコン「{query}」を検索中',
  // {provider} is an icon set, e.g. aws, azure, gcp
  'ai.step.searchingIconsIn': '{provider} でアイコン「{query}」を検索中',
  'ai.step.matches': '{count, plural, =0 {一致なし} other {# 件一致}}',
  'ai.step.validating': 'ダイアグラムを検証中',
  'ai.step.nodesEdges': '{nodes, plural, other {# 個のノード}} · {edges, plural, other {# 本のエッジ}}',
  'ai.step.fixingValidation': '検証エラーを修正中',
  'ai.step.checkingChanges': '変更を確認中',
  'ai.step.operations': '{count, plural, other {# 件の操作}}',
  'ai.step.fixingChanges': '無効な変更を修正中',

  // useAiReady — why the assistant can't run yet
  'ai.ready.chooseModel': 'モデルを選択して開始してください。',
  'ai.ready.setEndpoint': 'エンドポイント URL を設定して開始してください。',
  'ai.ready.addKey': '{provider} の API キーを追加して開始してください。',

  // Errors shown in the panel / settings (agent, transport, provider adapters)
  'ai.error.nothingToEdit': '編集するものがありません。ダイアグラムは空です。',
  'ai.error.cutOff': '応答が途中で切れました。より小さなダイアグラムにするか、より高性能なモデルをお試しください。',
  'ai.error.noDiagram': 'モデルがダイアグラムを生成しませんでした。表現を変えるか、ツール呼び出しに対応したモデルを選択してください。',
  'ai.error.notFinished': 'モデルがダイアグラムを完成させませんでした。もう一度試すか、リクエストを簡単にしてください。',
  'ai.error.invalidUrl': '無効な URL: {url}',
  'ai.error.addKey': 'AI 設定で {provider} の API キーを追加してください。',
  'ai.error.requestFailed': 'リクエストに失敗しました。',
  'ai.error.unreachable': '{host} に接続できませんでした。',
  'ai.error.unreachableOllama': '{host} に接続できませんでした。Ollama は起動していますか?',
  'ai.error.invalidResponse': 'プロバイダーから無効な応答が返されました。',
  'ai.error.chooseModel': 'AI 設定でモデルを選択してください。',
  'ai.error.customBaseUrl': 'AI 設定でカスタムエンドポイントのベース URL を設定してください。',
  'ai.error.unexpectedResponse': '{provider} から予期しない応答がありました。',
  'ai.error.unexpectedEndpointResponse': 'モデルのエンドポイントから予期しない応答がありました。',
  'ai.error.declined': 'モデルがこのリクエストを拒否しました。表現を変えてお試しください。',
  // {category} is a provider-defined refusal category, e.g. "cyber"
  'ai.error.declinedCategory': 'モデルがこのリクエストを拒否しました ({category})。表現を変えてお試しください。',
  'ai.error.declinedReason': 'モデルがこのリクエストを拒否しました: {reason}',
  'ai.error.geminiBlocked': 'Gemini がプロンプトをブロックしました ({reason})。',
  'ai.error.geminiDeclined': 'Gemini がこのリクエストを拒否しました。表現を変えてお試しください。',
  // HTTP errors: {message} is one of the ai.http.* phrases, {detail} the provider's own error text
  'ai.http.withDetail': '{message}: {detail}',
  'ai.http.noDetail': '{message}。',
  'ai.http.rejected': 'API キーが拒否されました',
  'ai.http.notFound': '見つかりません (モデル名とエンドポイントを確認してください)',
  'ai.http.rateLimited': 'レート制限に達したか、クレジットが不足しています',
  'ai.http.overloaded': 'プロバイダーが過負荷状態です。しばらくしてからお試しください',
  'ai.http.failed': 'リクエストに失敗しました ({status})',

  // AiSettingsDialog
  'ai.settings.title': 'AI 設定',
  'ai.settings.subtitle': 'ご自身のキーを使用します。ダイアグラムは選択したプロバイダーにのみ送信されます。',
  'ai.settings.browserWarning': 'ブラウザー版プレビュー: キーはこのタブのメモリ内にのみ保持され、リクエストはページから直接送信されます。キーをシステムのキーチェーンに保存するにはデスクトップアプリを使用してください。',
  // Section heading: the AI service (Anthropic, OpenAI…)
  'ai.settings.provider': 'プロバイダー',
  'ai.settings.ollamaUrl': 'Ollama の URL',
  'ai.settings.baseUrl': 'ベース URL',
  'ai.settings.customHint': 'OpenRouter、Azure OpenAI (…/openai/v1)、LM Studio、vLLM など。OpenAI Chat Completions API に対応している必要があります。',
  // Label before the choice of HTTP authentication header style
  'ai.settings.authHeader': '認証ヘッダー',
  'ai.settings.apiKey': 'API キー',
  'ai.settings.apiKeyOptional': 'API キー (任意)',
  'ai.settings.checking': '確認中…',
  'ai.settings.endpointChanged': 'エンドポイントが変更されました。新しい URL で使用するには、キーを再入力してください。',
  'ai.settings.apiKeyPlaceholder': 'API キーを貼り付け',
  'ai.settings.hideKey': 'キーを隠す',
  'ai.settings.showKey': 'キーを表示',
  'ai.settings.saveKey': 'キーを保存',
  // {url} is a website address, e.g. console.anthropic.com/settings/keys
  'ai.settings.createKeyAt': '{url} でキーを作成',
  'ai.settings.storedKeychain': 'システムのキーチェーンに保存済み',
  'ai.settings.keptInMemory': 'このタブのメモリ内に保持',
  // Verb: replace the stored API key with a new one
  'ai.settings.replace': '置き換え',
  'ai.settings.deleteKey': 'キーを削除',
  // Field label: the AI model to use
  'ai.settings.model': 'モデル',
  'ai.settings.modelPlaceholder': 'モデル ID',
  // {model} is a model id, e.g. anthropic/claude-opus-5-5
  'ai.settings.customModelPlaceholder': '例: {model}',
  'ai.settings.testConnection': '接続をテスト',
  'ai.settings.privacyKeychain': 'キーは OS のキーチェーンに保存され、OpenDraw のネイティブ層でのみ使用されます。Web ビューに渡されることはありません。',
  'ai.settings.privacy': 'ダイアグラムとプロンプトは、ここで選択したプロバイダーにのみ送信されます。OpenDraw 独自のサーバーはありません。',
  'ai.settings.privacyOllama': 'Ollama を使用すると、すべてがこの端末内で完結し、オフラインで動作します。',
  'ai.settings.privacyChooseOllama': 'すべてをこの端末内で完結させるには Ollama を選択してください。',
  'ai.settings.keySaved': 'キーを保存しました',
  'ai.settings.noKeyNeeded': 'キーは不要です',
  'ai.settings.showModels': 'モデルを表示',
  'ai.settings.connecting': '接続中…',
  'ai.settings.connected': '接続済み',
  'ai.settings.connectedModels': '接続済み · {count, plural, other {# 個のモデルが利用可能}}',
  'ai.settings.somethingWrong': '問題が発生しました。',
  'ai.settings.setEndpointFirst': '先にエンドポイント URL を設定してください。',
  // {example} is a URL
  'ai.settings.enterFullUrl': '完全な URL を入力してください (例: {example})',

  // Providers (brand names stay as they are; only these descriptions are translated)
  'ai.provider.anthropic.tagline': 'Claude モデル',
  'ai.provider.openai.tagline': 'GPT モデル',
  'ai.provider.gemini.tagline': 'Gemini モデル',
  'ai.provider.ollama.tagline': 'ローカル & オフライン',
  'ai.provider.custom.tagline': 'OpenAI 互換 API',
  // Provider choice for any self-configured, OpenAI-compatible server
  'ai.provider.custom.name': 'カスタムエンドポイント',
  'ai.provider.custom.keyPlaceholder': 'ローカルサーバーでは任意',

  // Model hints in the model picker
  'ai.model.hint.mostCapable': '最も高性能な Opus · 推奨',
  'ai.model.hint.fastCapable': '高速かつ高性能',
  'ai.model.hint.fastest': '最速・最低コスト',
  'ai.model.hint.frontier': '最先端の推論、プレミアム価格',
  // "Tool calling" = the model's ability to call functions/tools
  'ai.model.hint.goodTools': 'ツール呼び出しに優れる',
} satisfies Translation<typeof en>;
