# NeoForge 更新检查器 {#neoforge-update-checker}

NeoForge 提供一套非常轻量、需要主动启用的更新检查框架。如果任何模组有可用更新，主菜单和模组列表的“模组”按钮上会显示闪烁图标，并给出相应的更新日志。它**不会**自动下载更新。

## 开始使用 {#getting-started}

首先需要在 `mods.toml` 文件中指定 `updateJSONURL` 参数。该参数的值必须是指向更新 JSON 文件的有效 URL。只要所有模组用户都能可靠访问，这个文件可以托管在自己的 Web 服务器、GitHub 或任何其他位置。

## 更新 JSON 格式 {#update-json-format}

JSON 本身的格式相对简单：

```json5
{
    "homepage": "<模组主页或下载页>",
    "<mcversion>": {
        "<modversion>": "<此版本的更新日志>", 
        // 列出给定 Minecraft 版本的所有模组版本及其更新日志
        // ...
    },
    "promos": {
        "<mcversion>-latest": "<modversion>",
        // 声明给定 Minecraft 版本的最新“前沿”版本
        "<mcversion>-recommended": "<modversion>",
        // 声明给定 Minecraft 版本的最新“稳定”版本
        // ...
    }
}
```

这相当直观，不过还有几点说明：

- `homepage` 下的链接会在模组过期时显示给用户。
- NeoForge 使用内部算法判断一个模组版本字符串是否比另一个“更新”。大多数版本方案应当兼容；如果担心自己的方案是否受支持，请参阅 `ComparableVersion` 类。强烈建议遵循 [Maven 版本规则][mvnver]。
- 更新日志字符串可以使用 `\n` 分行。有些作者喜欢包含简略日志，再链接到提供完整更改列表的外部网站。
- 手动填写数据可能很麻烦。由于 Groovy 原生支持 JSON 解析，可以配置 `build.gradle` 在构建发布版时自动更新此文件。具体做法留给读者自行练习。

- 可以在 [nocubes]、[Corail Tombstone][corail] 和 [Chisels & Bits 2][chisel] 中找到示例。

## 获取更新检查结果 {#retrieving-update-check-results}

可以通过 `VersionChecker#getResult(IModInfo)` 获取 NeoForge 更新检查器的结果。可以把 `ModContainer` 作为模组构造方法参数，并通过 `ModContainer#getModInfo` 取得 `IModInfo`。也可以通过 `ModList.get().getModContainerById(<modId>)` 取得其他模组的 `ModContainer`。返回对象的 `#status` 方法表示版本检查状态。

| 状态 | 说明 |
| ---: | :--- |
| `FAILED` | 版本检查器无法连接到提供的 URL。 |
| `UP_TO_DATE` | 当前版本等于推荐版本。 |
| `AHEAD` | 没有最新版本时，当前版本比推荐版本更新。 |
| `OUTDATED` | 存在新的推荐版本或最新版本。 |
| `BETA_OUTDATED` | 存在新的最新版本。 |
| `BETA` | 当前版本等于或新于最新版本。 |
| `PENDING` | 请求的结果尚未完成，应稍后重试。 |

返回对象还包含目标版本，以及 `update.json` 中指定的更新日志行。

[mvnver]: ../gettingstarted/versioning.md
[nocubes]: https://cadiboo.github.io/projects/nocubes/update.json
[corail]: https://github.com/Corail31/tombstone_lite/blob/master/update.json
[chisel]: https://curseupdate.com/231095/chiselsandbits?ml=neoforge
