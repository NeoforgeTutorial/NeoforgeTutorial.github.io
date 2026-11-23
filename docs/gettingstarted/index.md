# NeoForge 入门

本节介绍如何搭建 NeoForge 开发工作区，以及如何运行和测试模组。

## 前置条件

- 熟悉 Java 编程语言，尤其是面向对象、多态、泛型和函数式特性。
- 安装 Java 25 Development Kit（JDK）和 64 位 Java Virtual Machine（JVM）。NeoForge 推荐并正式支持 [Microsoft 构建的 OpenJDK][jdk]，但其他 JDK 通常也可以使用。

:::caution
请确认使用的是 64 位 JVM。可以在终端中运行 `java -version` 来检查。Minecraft 不支持 32 位 JVM。
:::

- 熟悉一款你选择的 Integrated Development Environment（IDE，集成开发环境）。
    - NeoForge 正式支持 [IntelliJ IDEA][intellij] 和 [Eclipse][eclipse]，二者都集成了 Gradle 支持。不过，也可以使用任何 IDE，包括 Netbeans、Visual Studio Code、Vim 或 Emacs。
- 熟悉 [Git][git] 和 [GitHub][github]。严格来说这并不是必需的，但会让开发轻松很多。

## 搭建工作区

- 打开 [Mod Generator][modgen] 网页，填写模组名称（也可以填写模组 ID）、包名、Minecraft 版本和 Gradle 插件（[ModDevGradle][mdg] 或 [NeoGradle][ng]），点击“Download Mod Project”，然后解压下载的 ZIP 文件。
- 打开 IDE 并导入 Gradle 项目。IntelliJ IDEA 和 Eclipse 会自动执行这一步。如果你的 IDE 不会自动导入，也可以在终端中通过 `gradlew` 命令完成。
    - 首次执行时，Gradle 会下载 NeoForge 的所有依赖（包括 Minecraft 本身）并进行反编译。这可能要花不少时间，具体取决于硬件性能和网络状况，最长可能需要一小时。
    - 每次修改 Gradle 文件后，都需要重新加载 Gradle 变更。可以使用 IDE 中的“Reload Gradle”按钮，也可以再次使用 `gradlew` 终端命令。

### Minecraft 源代码

Gradle 成功加载后，你不仅会得到一个示例模组项目，工作区中还会包含 Minecraft 和 NeoForge 的（已打补丁的）源代码与[资源文件][resources]供参考。在 IntelliJ IDEA 中，可以在 `External Libraries` 下找到这些源码；在 Eclipse 中则位于 `Referenced Libraries` 下。名称会因所用的 Gradle 插件而异（其中 `<version>` 是所使用的 NeoForge 版本）：

| Gradle 插件 | Minecraft 源代码 | NeoForge 源代码 |
|-------------|-------------------|------------------|
| NeoGradle | `ng_dummy_ng.net.neoforged:neoforge:<version>` | `net.neoforged:neoforge:universal:<version>` |
| ModDevGradle | `minecraft-patched-<version>-merged.jar` | `net.neoforged:neoforge:universal:<version>` |

此外，还可以使用 IDE 的搜索功能查找特定的 Minecraft 类或文件。在 IntelliJ IDEA 中默认按两次 Shift，在 Eclipse 中默认按 Ctrl+H。

:::warning
其他 IDE 可能没有这种集成。源代码对于实现许多功能至关重要；如果需要查看源代码，我们只支持 IntelliJ IDEA 或 Eclipse。
:::

## 自定义模组信息

许多模组基础属性都可以在 `gradle.properties` 文件中修改，包括模组名称、模组版本等基础信息。更多信息请查看该文件中的注释，或参阅 [`gradle.properties` 文件文档][properties]。

如果想进一步修改构建流程，可以编辑 `build.gradle` 和 `settings.gradle`。NeoForge 提供的 [ModDevGradle][mdg] 或 [NeoGradle][ng] Gradle 插件都提供了若干配置选项，构建脚本中的注释解释了其中一部分。

:::caution
只有在你清楚各项设置的作用时才应编辑 `build.gradle` 和 `settings.gradle`。所有基础属性都可以通过 `gradle.properties` 设置。
:::

## 构建和测试模组

要构建模组，请运行 `gradlew build`。构建产物会输出到 `build/libs`，文件名为 `<archivesBaseName>-<version>.jar`。`<archivesBaseName>` 和 `<version>` 由 `build.gradle` 设置，默认分别对应 `gradle.properties` 中的 `mod_id` 和 `mod_version`；如有需要，也可以在 `build.gradle` 中修改。随后，可以把生成的 JAR 文件放入启用了 NeoForge 的 Minecraft 安装的 `mods` 文件夹，或上传到模组分发平台。

要在测试环境中运行模组，可以使用生成的运行配置，也可以使用对应任务（例如 `gradlew runClient`）。这会从对应的运行目录（例如 `runs/client` 或 `runs/server`）启动 Minecraft，并加载指定的源码集。默认 MDK 包含 `main` 源码集，因此写在 `src/main/java` 中的所有代码都会生效。

### 服务端测试

无论使用运行配置还是 `gradlew runServer` 启动专用服务器，服务器都会立即关闭。你需要在运行目录中的 `eula.txt` 文件里接受 Minecraft 最终用户许可协议（EULA）。

接受协议后，服务器会加载并可通过 `localhost`（默认即 `127.0.0.1`）访问。不过，此时仍然无法加入游戏，因为服务器默认处于在线模式，需要身份验证，而开发环境使用的玩家没有可用于验证的账户。要解决这个问题，请再次停止服务器，把 `server.properties` 中的 `online-mode` 属性设为 `false`。重新启动服务器后，就应该能够连接了。

:::tip
始终应该在专用服务器环境中测试模组，包括[仅客户端模组][client]。这类模组在服务端加载时不应该执行任何操作。
:::

[client]: ../concepts/sides.md
[eclipse]: https://www.eclipse.org/downloads/
[git]: https://www.git-scm.com/
[github]: https://github.com/
[intellij]: https://www.jetbrains.com/idea/
[jdk]: https://learn.microsoft.com/en-us/java/openjdk/download#openjdk-25
[mdg]: https://github.com/neoforged/ModDevGradle
[modgen]: https://neoforged.net/mod-generator/
[ng]: https://github.com/neoforged/NeoGradle
[properties]: modfiles.md#gradleproperties
[resources]: ../resources/index.md
