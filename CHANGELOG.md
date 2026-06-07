# Changelog

## [1.1.0](https://github.com/wrcp20/claude-oauth-chat/compare/v1.0.0...v1.1.0) (2026-06-07)


### Features

* **auth:** agregar token Bearer para proteger endpoints /api/* ([e1ac1c0](https://github.com/wrcp20/claude-oauth-chat/commit/e1ac1c0233767e055c76f5f3c8c98b3340fab9ff))
* **chrome-extension:** agregar extensión Chrome con widget OAuth ([5f221c0](https://github.com/wrcp20/claude-oauth-chat/commit/5f221c02c7acab47fc900134717cef03d9d5330f))
* extensión Chrome para widget Claude OAuth en cualquier página ([68da5ad](https://github.com/wrcp20/claude-oauth-chat/commit/68da5adeb54eb08028b0c35c535bce9e2af7e680))
* widget embebible con autenticación Bearer para páginas PHP ([89bb2fa](https://github.com/wrcp20/claude-oauth-chat/commit/89bb2fad009c0c04ad2983bed8f3288b7f1498e2))
* **widget:** agregar widget embebible para integración en páginas PHP ([9f8a7e1](https://github.com/wrcp20/claude-oauth-chat/commit/9f8a7e190760f0d7bebda0c42dfedf4d5837943d))


### Bug Fixes

* **auth:** agregar Authorization header en frontend y extensión Chrome ([bf3f1c8](https://github.com/wrcp20/claude-oauth-chat/commit/bf3f1c8b9a0565b412bbf04845aba4d1ea9a5a5e))
* **cors:** agregar Authorization a Access-Control-Allow-Headers ([64a3ee7](https://github.com/wrcp20/claude-oauth-chat/commit/64a3ee7dc79bd043b885b280ced909364142ba35))
* resolver 401 en frontend web y extensión Chrome ([fbc6992](https://github.com/wrcp20/claude-oauth-chat/commit/fbc6992411d8bcb79207aff84b67aee5d371ce8e))

## 1.0.0 (2026-04-03)


### Features

* agregar flutter_markdown para renderizar respuestas ([31c5892](https://github.com/wrcp20/claude-oauth-chat/commit/31c5892ca813c6583738cfcc0be1fd35308e945b))
* agregar frontend Flutter (Android/iOS/Web) ([8f6361f](https://github.com/wrcp20/claude-oauth-chat/commit/8f6361f8207e3e030d1a9e217221f9c266dbd2d9))
* chat web local con OAuth de Claude Code ([66431f4](https://github.com/wrcp20/claude-oauth-chat/commit/66431f4a51073cc7942393ebdbf5269f41f026e2))
* **ci:** agregar release-artifacts — build Flutter web + notificación Discord ([f44eb21](https://github.com/wrcp20/claude-oauth-chat/commit/f44eb214723b4cf6a01e310026e6242846c24c7d))
* **ci:** agregar workflows de CI/CD con GitHub Actions ([34e8a54](https://github.com/wrcp20/claude-oauth-chat/commit/34e8a542a82f59bbb1647f46b1400e3c706c1412))
* Docker y docker-compose para ejecución local ([8b103da](https://github.com/wrcp20/claude-oauth-chat/commit/8b103dae95c46845d07c3496a53ebd0cd76b4965))


### Bug Fixes

* **ci:** analizar solo lib/ en flutter analyze — excluir test scaffold ([11581ae](https://github.com/wrcp20/claude-oauth-chat/commit/11581ae51e2402ede936fc1bbf1de2d69fa0781e))
* **ci:** reemplazar if secrets por continue-on-error en notify-discord ([33ada5c](https://github.com/wrcp20/claude-oauth-chat/commit/33ada5c3525d97b65f976d8aeeec8e585a422c51))
* **ci:** usar release-please@v4.1.3 para evitar nil pointer en v4 ([292a0f0](https://github.com/wrcp20/claude-oauth-chat/commit/292a0f0cf5a679bcd45ed37e742e7d0b93f8b817))
* corregir blockquoteContentColor en MarkdownStyleSheet ([9949fa4](https://github.com/wrcp20/claude-oauth-chat/commit/9949fa4d9ea4b511893c1b9ce2c00e3ff8ec742e))
* **docker:** corregir usuario root bloqueado por --dangerously-skip-permissions ([cb4c798](https://github.com/wrcp20/claude-oauth-chat/commit/cb4c7988f404fb81cf53bd06e93df8b81223c822))
* quitar frontend de docker-compose ([af3b986](https://github.com/wrcp20/claude-oauth-chat/commit/af3b9866de4a9610fcc21767785dd2a5b29f8824))
