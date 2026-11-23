# 版本管理

本文介绍 Minecraft 和 NeoForge 的版本编号方式，并为模组版本管理提供一些建议。

## Minecraft {#minecraft}

Minecraft 的版本编号方案多年来发生过变化。

从 1.0 到 1.21.11，版本采用受[语义化版本][semver]启发的 `major.minor.<patch>` 格式；为简洁起见，补丁版本通常省略。例如，1.21 和 1.21.11 都采用这种格式。

26.1 及更高版本采用受[日历化版本][calver]启发的 `year.release.<patch>` 格式；为简洁起见，补丁版本同样通常省略。例如，26.1 和 26.1.1 都采用这种格式。

### 早期发布阶段

游戏正式发布前，版本方案经常变化，曾出现过 `a1.1`（Alpha 1.1）、`b1.7.3`（Beta 1.7.3）等版本，甚至还有完全没有清晰版本规则的 `infdev` 版本。

### 大型更新阶段

游戏以 Minecraft 1.0 正式发布后，采用了新的版本方案：`1` 是主版本，第二个数字表示（通常是年度的）大型更新，第三个数字表示小版本和补丁。例如，Minecraft 1.20.2 的主版本是 1，次版本是 20，补丁版本是 2。该格式从 2011 年 Minecraft 1.0 一直使用到 2026 年初的 26.1 更新。

后来，Minecraft 开始以“游戏投放”（Game Drop）的形式发布更新。由于这些更新被视为小更新，只递增补丁版本，导致 1.21 版本持续了近两年，这种版本方案才不再适用。

#### 快照

1.21.11 及以下版本的快照不遵循标准版本方案。它们采用 `YYwWWa` 格式，其中 `YY` 是年份的后两位（例如 `23`），`WW` 是当年的周数（例如 `01`）。例如，快照 `23w01a` 是 2023 年第一周发布的快照。

后缀 `a` 用于同一周发布两个快照的情况，第二个快照会命名为 `23w01b` 之类的形式。Mojang 过去偶尔使用这种命名。其他后缀也曾用于 `20w14infinite` 等快照，后者是 [2020 年无限维度愚人节玩笑][infinite]。

#### 预发布版和候选发布版

快照周期接近结束时，Mojang 会开始发布预发布版（pre-release）。预发布版已经具备该版本的全部功能，只专注于修复漏洞。其名称由目标版本加上 `-preX` 后缀组成。例如，1.20.2 的第一个预发布版名为 `1.20.2-pre1`。预发布版可能而且通常会发布多个，后续版本依次使用 `-pre2`、`-pre3` 等后缀。

类似地，预发布周期完成后，Mojang 会发布候选发布版 1（Release Candidate 1），在版本号后添加 `-rc1`，例如 `1.20.2-rc1`。Mojang 的目标是准备一个候选版本，如果没有新漏洞就正式发布。不过，如果出现意外漏洞，也可能会有 `-rc2`、`-rc3` 等版本，与预发布版的做法类似。

### 游戏投放阶段

从每年一次大型更新并穿插补丁，改为每季度发布游戏投放后，Mojang 决定把 Minecraft 版本编号改为 `year.release.<patch>` 新格式。例如，26.1 是第一个采用这种编号方式的版本，表示 2026 年的第一次投放。如需发布紧急修复，版本号会是 26.1.1；2026 年的第二次投放则是 26.2。

#### 快照、预发布版和候选发布版

开发下一个更新时，Mojang 会发布名为快照的早期版本。快照会快速改动游戏内容，且相当不稳定，但很适合观察下一更新的大致方向。26.1 及更高版本的快照使用目标版本的日历化版本号，并添加 `-snapshot-X` 后缀。例如，26.1-snapshot-1 是即将到来的 26.1 更新的第一个快照，后续快照则标记为 `snapshot-2` 或 `snapshot-3`。

快照周期接近结束时，Mojang 会开始发布预发布版。预发布版已经具备该版本的全部功能，只专注于修复漏洞。这些版本同样使用 `-pre-X` 后缀。例如，26.1 的第一个预发布版名为 `26.1-pre-1`。预发布版可能而且通常会发布多个，后续版本依次使用 `-pre-2`、`-pre-3` 等后缀。

类似地，预发布周期完成后，Mojang 会发布候选发布版 1（Release Candidate 1），例如 `26.1-rc-1`。Mojang 的目标是准备一个候选版本，如果没有新漏洞就正式发布。不过，如果出现意外漏洞，也可能会有 `-rc-2`、`-rc-3` 等版本，与预发布版的做法类似。

## NeoForge {#neoforge}

NeoForge 使用经过调整的语义化版本系统：主版本是 Minecraft 的次版本，次版本是 Minecraft 的补丁版本，补丁版本则是 NeoForge 自身的“实际”版本。例如，NeoForge 20.2.59 是 Minecraft 1.20.2 的第 60 个版本（从 0 开始计数）。

以前，NeoForge 版本会省略 Minecraft 版本号开头的 `1`，因为当时认为这个数字不会变化。后来发现并非如此，NeoForge 便改为包含完整的 Minecraft 版本号；需要时用 `0` 填补补丁版本的位置。例如，NeoForge 26.1.0.5-beta 是 Minecraft 26.1 的第 6 个版本。

NeoForge 的部分位置还使用 [Maven 版本范围][mvr]，例如 [`neoforge.mods.toml`][neoforgemodstoml] 中的 Minecraft 和 NeoForge 版本范围。这些范围大体兼容语义化版本，但并不完全兼容，例如它不会考虑 `pre` 标签。

## 模组

并不存在绝对最佳的版本系统。开发方式、项目范围等因素都会影响版本系统的选择。有时也可以组合多种版本系统。本节介绍一些常见做法，并给出实际示例。

模组文件名通常采用 `modid-<version>.jar` 格式。因此，如果模组 ID 是 `examplemod`，版本是 `1.2.3`，模组文件就应命名为 `examplemod-1.2.3.jar`。

:::note
版本系统只是建议，并非强制规则。尤其对于何时修改（“递增”）版本以及如何递增，更是如此。如果你希望采用其他版本系统，也没有人会阻止你。
:::

### 语义化版本

语义化版本（semver）由三部分组成：`major.minor.patch`。代码库发生重大变化时递增主版本，这通常对应重要新功能和漏洞修复；引入次要功能时递增次版本；更新中只包含漏洞修复时递增补丁版本。

通常认为，任何 `0.x.x` 版本都属于开发版本，首次（完整）发布时应将版本提升到 `1.0.0`。

在实践中，“次版本用于功能、补丁版本用于漏洞修复”的规则经常被忽略。一个常见例子就是 Minecraft 本身：它通过次版本发布重要功能，通过补丁版本发布次要功能，并通过快照修复漏洞（见上文）。

根据模组更新频率的不同，这些数字可能较小或较大。例如，[Supplementaries][supplementaries] 当前使用 `2.6.31`（撰写本文时）。尤其是 `patch` 部分，出现三位数甚至四位数完全可能。

### “缩减式”和“扩展式”语义化版本

有时语义化版本只包含两个数字。这可以视为“缩减式语义化版本”或“两段式语义化版本”，版本号只采用 `major.minor` 格式。只添加少量简单对象、因此很少更新（Minecraft 版本更新除外）的小型模组通常使用这种方案，版本可能一直保持为 `1.0`。

“扩展式语义化版本”或“四段式语义化版本”包含四个数字，例如 `1.0.0.0`。根据模组不同，格式可以是 `major.api.minor.patch`、`major.minor.patch.hotfix` 或其他形式，并没有标准做法。

对于 `major.api.minor.patch`，`major` 版本与 `api` 版本相互独立。也就是说，`major`（功能）部分和 `api` 部分可以分别递增。为其他模组作者提供 API 的模组通常采用这种方案。例如，[Mekanism][mekanism] 当前版本为 10.4.5.19（撰写本文时）。

对于 `major.minor.patch.hotfix`，补丁层级被拆成两部分。[Create][create] 模组使用这种做法，当前版本为 0.5.1f（撰写本文时）。注意，Create 用字母表示紧急修复，而不增加第四个数字，以便与常规语义化版本保持兼容。

:::info
缩减式语义化版本、扩展式语义化版本、两段式语义化版本和四段式语义化版本都不是官方术语，也没有任何标准化格式。
:::

### Alpha、Beta 和 Release

与 Minecraft 本身一样，模组开发通常也遵循软件工程中经典的 `alpha`、`beta`、`release` 阶段。`alpha` 表示不稳定或实验性版本（有时也称作 `experimental` 或 `snapshot`），`beta` 表示半稳定版本，`release` 表示稳定版本（有时使用 `stable` 代替 `release`）。

有些模组用主版本号表示 Minecraft 版本更新。例如，[JEI][jei] 对 Minecraft 1.19.2 使用 `13.x.x.x`，对 1.19.4 使用 `14.x.x.x`，对 1.20.1 使用 `15.x.x.x`（没有面向 1.19.3 和 1.20.0 的版本）。另一些模组会在名称后追加阶段标签，例如 [Minecolonies][minecolonies] 当前版本为 `1.1.328-BETA`（撰写本文时）。

### 包含 Minecraft 版本

在文件名中包含模组所面向的 Minecraft 版本非常常见。这样最终用户可以更容易地看出模组适用于哪个 Minecraft 版本。常见做法是把 Minecraft 版本放在模组版本之前或之后，前者更普遍。例如，面向 1.20.2 的 JEI 版本 `16.0.0.28`（撰写本文时最新）可以命名为 `jei-1.20.2-16.0.0.28` 或 `jei-16.0.0.28-1.20.2`。

### 包含模组加载器

NeoForge 并不是唯一的模组加载器，许多模组作者会同时面向多个平台开发。因此，需要区分同一模组、同一版本但面向不同加载器的两个文件。

通常会在文件名中的某个位置标明模组加载器。`jei-neoforge-1.20.2-16.0.0.28`、`jei-1.20.2-neoforge-16.0.0.28` 和 `jei-1.20.2-16.0.0.28-neoforge` 都是有效写法。对于其他加载器，可以把 `neoforge` 替换为 `forge`、`fabric`、`quilt` 或你同时支持的加载器名称。

### 关于 Maven 的说明

Maven 是用于托管依赖的系统，其版本系统在一些细节上与语义化版本不同（尽管基本仍采用 `major.minor.patch` 模式）。相关的 [Maven 版本范围（MVR）][mvr] 系统在 NeoForge 的部分位置使用（见[上文][neoforge]）。选择版本方案时，应确保它与 MVR 兼容；否则，其他模组将无法依赖你的模组特定版本。

[create]: https://www.curseforge.com/minecraft/mc-mods/create
[infinite]: https://minecraft.wiki/w/Java_Edition_20w14∞
[jei]: https://www.curseforge.com/minecraft/mc-mods/jei
[mekanism]: https://www.curseforge.com/minecraft/mc-mods/mekanism
[minecolonies]: https://www.curseforge.com/minecraft/mc-mods/minecolonies
[minecraft]: #minecraft
[neoforgemodstoml]: modfiles.md#neoforgemodstoml
[mvr]: https://maven.apache.org/enforcer/enforcer-rules/versionRanges.html
[mvr]: https://maven.apache.org/ref/3.9.9/maven-artifact/apidocs/org/apache/maven/artifact/versioning/ComparableVersion.html
[neoforge]: #neoforge
[pre]: #pre-releases
[rc]: #release-candidates
[semver]: https://semver.org/
[calver]: https://calver.org/
[supplementaries]: https://www.curseforge.com/minecraft/mc-mods/supplementaries
