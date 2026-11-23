# 模组文件

模组文件决定哪些模组会被打包进 JAR、在“模组”菜单中显示哪些信息，以及游戏应如何加载你的模组。

## `gradle.properties` {#gradleproperties}

`gradle.properties` 文件保存模组的各种常用属性，例如模组 ID 或模组版本。构建期间，Gradle 会读取这些值，并把它们内联到 [neoforge.mods.toml][neoforgemodstoml] 等各个位置。这样只需要在一个地方修改值，修改就会自动应用到所有相关位置。

大多数值也在 [MDK 的 `gradle.properties` 文件][mdkgradleproperties]中通过注释进行了说明。

| 属性 | 说明 | 示例 |
|------|------|------|
| `org.gradle.jvmargs` | 允许向 Gradle 传递额外的 JVM 参数。最常见的用途是为 Gradle 分配更多或更少内存。注意，这是为 Gradle 本身设置的，而不是为 Minecraft 设置。 | `org.gradle.jvmargs=-Xmx3G` |
| `org.gradle.daemon` | 构建时 Gradle 是否使用守护进程。 | `org.gradle.daemon=false` |
| `org.gradle.parallel` | Gradle 是否启动多个 JVM，以并行执行项目。 | `org.gradle.parallel=false` |
| `org.gradle.caching` | Gradle 是否复用先前构建的任务输出。 | `org.gradle.caching=false` |
| `org.gradle.configuration-cache` | Gradle 是否复用先前构建的构建配置。 | `org.gradle.configuration-cache=false` |
| `org.gradle.debug` | 是否让 Gradle 进入调试模式。调试模式主要意味着输出更多 Gradle 日志。注意，这是为 Gradle 本身设置的，而不是为 Minecraft 设置。 | `org.gradle.debug=false` |
| `minecraft_version` | 当前开发所基于的 Minecraft 版本，必须与 `neo_version` 匹配。 | `minecraft_version=1.20.6` |
| `minecraft_version_range` | 该模组支持的 Minecraft 版本范围，使用 [Maven 版本范围][mvr]表示。注意，[快照、预发布版和候选发布版][mcversioning]不保证能正确排序，因为它们不遵循 Maven 版本规则。 | `minecraft_version_range=[1.20.6,1.21)` |
| `neo_version` | 当前开发所基于的 NeoForge 版本，必须与 `minecraft_version` 匹配。关于 NeoForge 版本编号方式的更多信息，请参阅 [NeoForge 版本管理][neoversioning]。 | `neo_version=20.6.62` |
| `mod_id` | 见[模组 ID][modid]。 | `mod_id=examplemod` |
| `mod_name` | 模组便于人阅读的显示名称。默认情况下，只会在模组列表中看到它；不过，[JEI][jei]等模组也会在物品提示框中醒目地显示模组名称。 | `mod_name=Example Mod` |
| `mod_license` | 模组使用的许可证。建议将其设置为所使用许可证的 [SPDX 标识符][spdx]和/或许可证链接。可以访问 https://choosealicense.com/ 来选择许可证。 | `mod_license=MIT` |
| `mod_version` | 模组版本，会显示在模组列表中。更多信息请参阅[版本管理][versioning]。 | `mod_version=1.0` |
| `mod_group_id` | 见 [Group ID][group]。 | `mod_group_id=com.example.examplemod` |

### 模组 ID {#the-mod-id}

模组 ID 是区分不同模组的主要方式。它用于许多位置，包括模组[注册表][registration]的命名空间，以及模组的[资源包和数据包][resource]命名空间。如果两个模组的 ID 相同，游戏将无法加载。

因此，模组 ID 应具有唯一性且容易记忆。通常可以使用模组显示名称的小写形式，或在其基础上稍作变化。模组 ID 只能包含小写字母、数字和下划线，长度必须为 2 到 64 个字符（含边界值）。

:::info
在 `gradle.properties` 中修改此属性会自动把修改应用到其他位置，但主模组类中的 [`@Mod` 注解][javafml]除外。你需要在其中手动修改该注解，使其与 `gradle.properties` 中的值一致。
:::

### Group ID {#the-group-id}

只有在计划把模组发布到 Maven 时，`build.gradle` 中的 `group` 属性才是必需的；不过，始终正确设置它仍被视为良好做法。`gradle.properties` 的 `mod_group_id` 属性会自动帮你设置这个值。

Group ID 应设置为顶层包。更多信息请参阅[打包][packaging]。

```properties
# 在 gradle.properties 文件中
mod_group_id=com.example
```

Java 源码（`src/main/java`）中的包也应符合这个结构，并用内部包表示模组 ID：

```text
com
- example（group 属性指定的顶层包）
    - mymod（模组 ID）
        - MyMod.java（由 ExampleMod.java 重命名而来）
```

## `neoforge.mods.toml` {#neoforgemodstoml}

`neoforge.mods.toml` 文件位于 `src/main/resources/META-INF/neoforge.mods.toml`，采用 [TOML][toml] 格式，定义模组的元数据。它还包含模组加载方式的附加信息，以及在“模组”菜单中显示的展示信息。[MDK 提供的 `neoforge.mods.toml` 文件][mdkneoforgemodstoml]通过注释解释了每个条目，下面会进一步说明。

`neoforge.mods.toml` 可分为三部分：与模组文件关联的非模组专属属性、每个模组各有一节的模组属性，以及每个模组依赖各有一节的依赖配置。`neoforge.mods.toml` 的部分属性是必填项；必填属性必须提供值，否则会抛出异常。

:::note
在默认 MDK 中，Gradle 会用 `gradle.properties` 中的值替换此文件中的多个属性。例如，`license="${mod_license}"` 表示 `license` 字段会替换为 `gradle.properties` 中的 `mod_license` 属性。这类会被替换的值应在 `gradle.properties` 中修改，而不是在此文件中修改。
:::

### 非模组专属属性

非模组专属属性与 JAR 本身关联，用于说明如何加载模组以及任何额外的全局元数据。

| 属性 | 类型 | 默认值 | 说明 | 示例 |
|------|------|--------|------|------|
| `modLoader` | string | `javafml` | 模组使用的语言加载器。可用于支持其他语言结构，例如主文件使用 Kotlin 对象，或使用接口、方法等不同方式确定入口点。NeoForge 提供 Java 加载器 [`"javafml"`][javafml]。 | `modLoader="javafml"` |
| `loaderVersion` | string | `""` | 语言加载器可接受的版本范围，使用 [Maven 版本范围][mvr]表示。对于 `javafml`，当前版本为 `1`。如果未指定版本，则可以使用模组加载器的任意版本。 | `loaderVersion="[1,)"` |
| `license` | string | **必填** | 此 JAR 中模组所使用的许可证。建议将其设置为所使用许可证的 [SPDX 标识符][spdx]和/或许可证链接。可以访问 https://choosealicense.com/ 来选择许可证。 | `license="MIT"` |
| `showAsResourcePack` | boolean | `false` | 设为 `true` 时，模组的资源会作为独立资源包显示在“资源包”菜单中，而不是合并到“模组资源”资源包中。 | `showAsResourcePack=true` |
| `showAsDataPack` | boolean | `false` | 设为 `true` 时，模组的数据文件会作为独立数据包显示在“数据包”菜单中，而不是合并到“模组数据”数据包中。 | `showAsDataPack=true` |
| `services` | array | `[]` | 模组使用的服务数组。NeoForge 对 Java Platform Module System 的实现会在为模组创建模块时读取这项设置。 | `services=["net.neoforged.neoforgespi.language.IModLanguageProvider"]` |
| `properties` | table | `{}` | 替换属性表。`StringSubstitutor` 会用它把 `${file.<key>}` 替换为对应的值。 | `properties={"example"="1.2.3"}`（之后可通过 `${file.example}` 引用） |
| `issueTrackerURL` | string | *无* | 用于报告和跟踪模组问题的 URL。 | `"https://github.com/neoforged/NeoForge/issues"` |

:::note
`services` 属性在功能上等同于指定[模块中的 `uses` 指令][uses]，后者允许[加载指定类型的服务][serviceload]。

也可以在 `src/main/resources/META-INF/services` 文件夹内定义服务文件。文件名为服务的完全限定名，文件内容是待加载服务的名称（另见 [AtlasViewer 模组中的示例][atlasviewer]）。
:::

### 模组专属属性

模组专属属性通过 `[[mods]]` 标头与指定模组关联。这是一个[表数组][array]；在下一个标头出现之前，所有键值属性都会附加到该模组。

```toml
# examplemod1 的属性
[[mods]]
modId = "examplemod1"

# examplemod2 的属性
[[mods]]
modId = "examplemod2"
```

| 属性 | 类型 | 默认值 | 说明 | 示例 |
|------|------|--------|------|------|
| `modId` | string | **必填** | 见[模组 ID][modid]。 | `modId="examplemod"` |
| `namespace` | string | `modId` 的值 | 覆盖模组的命名空间。也必须是有效的[模组 ID][modid]，但还可以包含点和短横线。当前未使用。 | `namespace="example"` |
| `version` | string | `"1"` | 模组版本，最好采用[Maven 版本规范的一种变体][versioning]。设为 `${file.jarVersion}` 时，会替换为 JAR 清单中 `Implementation-Version` 属性的值（在开发环境中显示为 `0.0NONE`）。 | `version="1.20.2-1.0.0"` |
| `displayName` | string | `modId` 的值 | 模组的显示名称。界面上表示该模组时使用，例如模组列表和模组不匹配界面。 | `displayName="Example Mod"` |
| `description` | string | `'''MISSING DESCRIPTION'''` | 模组列表界面中显示的模组描述。建议使用[多行字面量字符串][multiline]。该值也可以翻译，详见[翻译模组元数据][i18n]。 | `description='''This is an example.'''` |
| `logoFile` | string | *无* | 模组列表界面所用图片文件的名称和扩展名。位置必须是以 JAR 或源码集根目录为起点的绝对路径（例如主源码集对应 `src/main/resources`）。有效文件名字符包括小写字母（`a-z`）、数字（`0-9`）、斜杠（`/`）、下划线（`_`）、句点（`.`）和短横线（`-`）。完整字符集为 `[a-z0-9_-.]`。 | `logoFile="test/example_logo.png"` |
| `logoBlur` | boolean | `true` | 渲染 `logoFile` 时使用 `GL_LINEAR*`（true）还是 `GL_NEAREST*`（false）。简单来说，就是缩放标志时是否应将其模糊处理。 | `logoBlur=false` |
| `updateJSONURL` | string | *无* | [更新检查器][update]用于确认所运行模组是否为最新版本的 JSON 文件 URL。 | `updateJSONURL="https://example.github.io/update_checker.json"` |
| `modUrl` | string | *无* | 模组下载页面的 URL。当前未使用。 | `modUrl="https://neoforged.net/"` |
| `credits` | string | *无* | 模组列表界面中显示的致谢和鸣谢信息。 | `credits="The person over here and there."` |
| `authors` | string | *无* | 模组列表界面中显示的模组作者。 | `authors="Example Person"` |
| `displayURL` | string | *无* | 模组列表界面中显示的模组展示页面 URL。 | `displayURL="https://neoforged.net/"` |
| `enumExtensions` | string | *无* | 用于[枚举扩展][enumextension]的 JSON 文件路径。 | `enumExtensions="META_INF/enumextensions.json"` |
| `featureFlags` | string | *无* | 用于[功能标志][featureflags]的 JSON 文件路径。 | `featureFlags="META-INF/feature_flags.json"` |

#### 特性 {#features}

特性系统允许模组要求加载系统时具备特定设置、软件或硬件。当某个特性未满足时，模组加载会失败，并向用户说明缺少的要求。这些配置使用[表][table] `[features.<modid>]` 创建，其中 `modid` 是使用该特性的模组标识符。NeoForge 当前提供以下特性：

| 特性 | 说明 | 示例 |
|------|------|------|
| `javaVersion` | Java 版本可接受的范围，使用 [Maven 版本范围][mvr]表示。应当填写 Minecraft 使用的受支持版本。 | `javaVersion="[17,)"` |

#### 模组属性

模组属性系统把任意键映射到与特定模组关联的值。当不同模组文件定义相同的键、但提供不同元数据时，这种机制会很有用。之后可以通过 `IModInfo#getModProperties` 从映射中获取对象值，从而取得某个键对应的模组专属属性值。这些配置使用[表][table] `[modproperties.<modid>]` 创建，其中 `modid` 是使用所定义属性的模组标识符。

```java
// 假设有两个模组 `mod1` 和 `mod2`，它们分别在各自文件中定义了以下属性配置：
// [modproperties.mod1]
// key="value1"
// [modproperties.mod2]
// key="value2"

@Mod("mod1")
public class ModOne {

    private final String key;

    public ModOne(ModContainer container) {
        // 会把 'value1' 保存到 key 中
        this.key = (String) container.getModInfo().getModProperties().get("key");
    }
}

@Mod("mod2")
public class ModTwo {

    private final String key;

    public ModTwo(ModContainer container) {
        // 会把 'value2' 保存到 key 中
        this.key = (String) container.getModInfo().getModProperties().get("key");
    }
}
```

### Access Transformer 专属属性

[Access Transformer 专属属性][accesstransformer]通过 `[[accessTransformers]]` 标头与指定 Access Transformer 关联。这是一个[表数组][array]；在下一个标头出现之前，所有键值属性都会附加到该 Access Transformer。Access Transformer 标头是可选的；不过一旦指定，其中所有元素都是必填项。

| 属性 | 类型 | 默认值 | 说明 | 示例 |
|:----:|:----:|:------:|------|------|
| `file` | string | **必填** | 见[添加 AT][accesstransformer]。 | `file="at.cfg"` |

### Mixin 配置属性

[Mixin 配置属性][mixinconfig]通过 `[[mixins]]` 标头与指定 Mixin 配置关联。这是一个[表数组][array]；在下一个标头出现之前，所有键值属性都会附加到该 Mixin 配置块。Mixin 标头是可选的；不过一旦指定，其中所有元素都是必填项。

| 属性 | 类型 | 默认值 | 说明 | 示例 |
|:----:|:----:|:------:|------|------|
| `config` | string | **必填** | Mixin 配置文件的位置。 | `config="examplemod.mixins.json"` |
| `requiredMods` | array | `[]` | 必须存在才能应用这些 Mixin 的模组 ID。 | `requiredMods=["sodium"]` |
| `behaviorVersion` | string | *无* | 要匹配其行为的 [Fabric Mixin 版本](https://github.com/FabricMC/Mixin/tags)。必须介于默认行为版本（每次 Neo 离开破坏性变更窗口时固定）和运行时存在的 Fabric Mixin 版本之间。 | `behaviorVersion="0.17.1"` |

### 依赖配置

模组可以指定依赖。NeoForge 会在加载模组前检查这些依赖。依赖配置使用[表数组][array] `[[dependencies.<modid>]]` 创建，其中 `modid` 是使用该依赖的模组标识符。

| 属性 | 类型 | 默认值 | 说明 | 示例 |
|------|------|--------|------|------|
| `modId` | string | **必填** | 作为依赖添加的模组标识符。 | `modId="jei"` |
| `type` | string | `"required"` | 指定依赖的性质：`"required"` 是默认值，依赖缺失时阻止模组加载；`"optional"` 在依赖缺失时不会阻止模组加载，但仍会验证依赖是否兼容；`"incompatible"` 在依赖存在时阻止模组加载；`"discouraged"` 在依赖存在时仍允许模组加载，但会向用户发出警告。 | `type="incompatible"` |
| `reason` | string | *无* | 可选的用户可见消息，用于说明此依赖为何必需，或为何不兼容。 | `reason="integration"` |
| `versionRange` | string | `"*"` | 该依赖可接受的版本范围，使用 [Maven 版本范围][mvr]表示。`"*"` 匹配任意版本。 | `versionRange="[1, 2)"` |
| `ordering` | string | `"NONE"` | 定义模组必须在该依赖之前（`"BEFORE"`）还是之后（`"AFTER"`）加载。如果顺序无关紧要，则使用 `"NONE"`。 | `ordering="AFTER"` |
| `side` | string | `"BOTH"` | 依赖必须存在的[物理端][sides]：`"CLIENT"`、`"SERVER"` 或 `"BOTH"`。 | `side="CLIENT"` |
| `referralUrl` | string | *无* | 依赖下载页面的 URL。当前未使用。 | `referralUrl="https://library.example.com/"` |

:::danger
两个模组的 `ordering` 可能形成循环依赖并导致崩溃，例如模组 A 必须在模组 B 之前加载，同时模组 B 又必须在模组 A 之前加载。
:::

## 模组入口点

`neoforge.mods.toml` 填写完成后，还需要为模组提供入口点。入口点本质上是执行模组代码的起点。入口点本身由 `neoforge.mods.toml` 中使用的语言加载器决定。

### `javafml` 与 `@Mod` {#javafml-and-mod}

`javafml` 是 NeoForge 为 Java 编程语言提供的语言加载器。入口点通过一个带有 `@Mod` 注解的公共类定义。`@Mod` 的值必须是 `neoforge.mods.toml` 中指定的某个模组 ID。随后，所有初始化逻辑（例如[注册事件][events]或[添加 `DeferredRegister`][registration]）都可以写在类的构造方法中。

主模组类只能有一个公共构造方法，否则会抛出 `RuntimeException`。构造方法可以按**任意**顺序包含以下**任意**参数，没有哪个参数是明确必需的；但是不允许出现重复参数。

| 参数类型 | 说明 |
|----------|------|
| `IEventBus` | [模组专属事件总线][modbus]（用于注册、事件等） |
| `ModContainer` | 保存该模组元数据的抽象容器 |
| `FMLModContainer` | `javafml` 定义的实际容器，保存该模组元数据；它是 `ModContainer` 的扩展 |
| `Dist` | 模组加载所在的[物理端][sides] |

```java
@Mod("examplemod") // 必须与 neoforge.mods.toml 中的某个模组 ID 匹配
public class ExampleMod {
    // 有效构造方法，只使用两种可用参数类型
    public ExampleMod(IEventBus modBus, ModContainer container) {
        // 在这里执行初始化逻辑
    }
}
```

默认情况下，`@Mod` 注解会在两个[端][sides]上都加载。可以通过指定 `dist` 参数来改变这一点：

```java
// 必须与 neoforge.mods.toml 中的某个模组 ID 匹配
// 这个模组类只会在物理客户端上加载
@Mod(value = "examplemod", dist = Dist.CLIENT)
public class ExampleModClient {
    // 有效构造方法
    public ExampleModClient(FMLModContainer container, IEventBus modBus, Dist dist) {
        // 在这里执行仅客户端逻辑
    }
}
```

:::note
`neoforge.mods.toml` 中的条目不需要有对应的 `@Mod` 注解。同样，`neoforge.mods.toml` 中的一个条目也可以对应多个 `@Mod` 注解，例如你希望把通用逻辑和仅客户端逻辑分开时。
:::

[accesstransformer]: ../advanced/accesstransformers.md#adding-ats
[array]: https://toml.io/en/v1.0.0#array-of-tables
[atlasviewer]: https://github.com/XFactHD/AtlasViewer/blob/1.20.2/neoforge/src/main/resources/META-INF/services/xfacthd.atlasviewer.platform.services.IPlatformHelper
[events]: ../concepts/events.md
[features]: #features
[group]: #the-group-id
[i18n]: ../resources/client/i18n.md#translating-mod-metadata
[javafml]: #javafml-and-mod
[jei]: https://www.curseforge.com/minecraft/mc-mods/jei
[mcversioning]: versioning.md#minecraft
[mdkgradleproperties]: https://github.com/NeoForgeMDKs/MDK-26.1-NeoGradle/blob/main/gradle.properties
[mdkneoforgemodstoml]: https://github.com/NeoForgeMDKs/MDK-26.1-NeoGradle/blob/main/src/main/resources/META-INF/neoforge.mods.toml
[neoforgemodstoml]: #neoforgemodstoml
[mixinconfig]: https://github.com/SpongePowered/Mixin/wiki/Introduction-to-Mixins---The-Mixin-Environment#mixin-configuration-files
[modbus]: ../concepts/events.md#event-buses
[modid]: #the-mod-id
[multiline]: https://toml.io/en/v1.0.0#string
[mvr]: https://maven.apache.org/enforcer/enforcer-rules/versionRanges.html
[neoversioning]: versioning.md#neoforge
[packaging]: structuring.md#packaging
[registration]: ../concepts/registries.md#deferredregister
[resource]: ../resources/index.md
[serviceload]: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ServiceLoader.html#load(java.lang.Class)
[sides]: ../concepts/sides.md
[spdx]: https://spdx.org/licenses/
[table]: https://toml.io/en/v1.0.0#table
[toml]: https://toml.io/
[update]: ../misc/updatechecker.md
[uses]: https://docs.oracle.com/javase/specs/jls/se21/html/jls-7.html#jls-7.7.3
[versioning]: versioning.md
[enumextension]: ../advanced/extensibleenums.md
[featureflags]: ../advanced/featureflags.md
