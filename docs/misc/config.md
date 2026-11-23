# 配置 {#configuration}

配置定义可应用于模组实例的设置和用户偏好。NeoForge 使用 [TOML][toml] 文件保存配置，并通过 [NightConfig][nightconfig] 读取。

## 创建配置 {#creating-a-configuration}

可以使用 `IConfigSpec` 的子类型创建配置。NeoForge 通过 `ModConfigSpec` 实现该类型，并允许通过 `ModConfigSpec.Builder` 构建。构建器可以通过 `Builder#push` 把配置值分到不同节中，并通过 `Builder#pop` 离开当前节。随后可以使用以下两种方法之一构建配置：

| 方法 | 说明 |
| :--- | :--- |
| `build` | 创建 `ModConfigSpec`。 |
| `configure` | 创建一对对象：持有配置值的类和 `ModConfigSpec`。 |

:::note
`ModConfigSpec.Builder#configure` 通常配合 `static` 块使用，并让保存配置值的类在构造方法中接收 `ModConfigSpec.Builder`，以便附加并保存这些值：

```java
// 定义字段，供以后保存配置和规范
public static final ExampleConfig CONFIG;
public static final ModConfigSpec CONFIG_SPEC;

private ExampleConfig(ModConfigSpec.Builder builder) {
    // 定义配置使用的属性
    // ...
}

// CONFIG 和 CONFIG_SPEC 都由同一个构建器构建，因此用静态块分隔属性和结果
static {
    Pair<ExampleConfig, ModConfigSpec> pair =
            new ModConfigSpec.Builder().configure(ExampleConfig::new);
        
    // 保存结果
    CONFIG = pair.getLeft();
    CONFIG_SPEC = pair.getRight();
}
```
:::

每个配置值都可以附加额外上下文，以实现额外行为。上下文必须在配置值完全构建之前定义：

| 方法 | 说明 |
| :--- | :--- |
| `comment` | 提供配置值用途的说明。可以传入多个字符串，形成多行注释。 |
| `translation` | 提供配置值名称的翻译键。 |
| `worldRestart` | 修改配置值前必须重启世界。 |
| `gameRestart` | 修改配置值前必须重启游戏。 |

### `ConfigValue` {#configvalue}

可以使用任意 `#define` 方法，并结合已定义的上下文构建配置值。

所有配置值方法至少接收两个组成部分：

- 表示变量名称的路径：一个用 `.` 分隔的字符串，表示配置值所在的各节。
- 没有有效配置时使用的默认值。

`ConfigValue` 专用方法还接收两个额外组成部分：

- 验证器，确保反序列化后的对象有效。
- 表示配置值数据类型的类。

```java
// 将配置属性保存为 public final
public final ModConfigSpec.ConfigValue<String> welcomeMessage;

private ExampleConfig(ModConfigSpec.Builder builder) {
    // 定义每个属性
    // 其中一项属性可以是游戏初始化时输出到控制台的消息
    welcomeMessage = builder.define("welcome_message", "Hello from the config!");
}
```

配置值本身可以通过 `ConfigValue#get` 取得。这些值还会被缓存，避免反复从文件读取。

#### 其他配置值类型 {#additional-config-value-types}

- **范围值**
    - 说明：值必须位于指定边界之间。
    - 类类型：`Comparable<T>`。
    - 方法名：`#defineInRange`。
    - 额外组成部分：
        - 配置值允许的最小值和最大值。
        - 表示配置值数据类型的类。

:::note
`DoubleValue`、`IntValue` 和 `LongValue` 都是范围值，其类分别指定为 `Double`、`Integer` 和 `Long`。
:::

- **白名单值**
    - 说明：值必须位于提供的集合中。
    - 类类型：`T`。
    - 方法名：`#defineInList`。
    - 额外组成部分：
        - 配置允许值的集合。

- **列表值**
    - 说明：值是条目列表。
    - 类类型：`List<T>`。
    - 方法名：`#defineList`；列表可以为空时使用 `#defineListAllowEmpty`。
    - 额外组成部分：
        - 提供默认值的 `Supplier`，在配置界面新增条目时使用。
        - 验证器，确保列表中反序列化出的元素有效。
        - （可选）验证器，确保列表不会包含过少或过多的条目。

- **枚举值**
    - 说明：位于提供集合中的枚举值。
    - 类类型：`Enum<T>`。
    - 方法名：`#defineEnum`。
    - 额外组成部分：
        - 把字符串或整数转换为枚举的 getter。
        - 配置允许值的集合。

- **布尔值**
    - 说明：`boolean` 值。
    - 类类型：`Boolean`。
    - 方法名：`#define`。

## 注册配置 {#registering-a-configuration}

构建 `ModConfigSpec` 后，必须注册它，使 NeoForge 能够按需加载、跟踪和同步配置设置。应在模组构造方法中通过 `ModContainer#registerConfig` 注册配置。注册时需要提供表示配置所属端的[给定类型][configtype]、`ModConfigSpec`，以及可选的配置文件名。

```java
// 在主模组文件中，已有 ModConfigSpec CONFIG_SPEC
public ExampleMod(ModContainer container) {
    ...
    // 注册配置
    container.registerConfig(ModConfig.Type.COMMON, ExampleConfig.CONFIG_SPEC);
    ...
}
```

### 配置类型 {#configuration-types}

配置类型决定配置文件所在位置、加载时机以及是否会通过网络同步。默认情况下，所有配置都从物理客户端的 `.minecraft/config` 或物理服务端的 `<服务器文件夹>/config` 加载。各配置类型之间的细微差异见下面各小节。

:::tip
NeoForge 在其代码库中说明了这些[配置类型][type]。
:::

- `STARTUP`
    - 在物理客户端和物理服务端上，从配置文件夹加载。
    - 注册时立即读取。
    - **不会**通过网络同步。
    - 默认添加 `-startup` 后缀。

:::warning
注册为 `STARTUP` 类型的配置可能导致客户端与服务端不同步，例如使用配置禁用内容注册时。因此，强烈建议不要使用 `STARTUP` 中的配置启用或禁用可能改变模组内容的特性。
:::

- `CLIENT`
    - **仅**在物理客户端上从配置文件夹加载。
        - 此配置类型没有服务端位置。
    - 在触发 `FMLCommonSetupEvent` 之前立即读取。
    - **不会**通过网络同步。
    - 默认添加 `-client` 后缀。
- `COMMON`
    - 在物理客户端和物理服务端上，从配置文件夹加载。
    - 在触发 `FMLCommonSetupEvent` 之前立即读取。
    - **不会**通过网络同步。
    - 默认添加 `-common` 后缀。
- `SERVER`
    - 在物理客户端和物理服务端上，从配置文件夹加载。
        - 可以通过把配置加入以下位置，让每个世界覆盖配置：
            - 客户端：`.minecraft/saves/<世界名称>/serverconfig`
            - 服务端：`<服务器文件夹>/world/serverconfig`
    - 在触发 `ServerAboutToStartEvent` 之前立即读取。
    - 通过网络同步到客户端。
    - 默认添加 `-server` 后缀。

## 配置事件 {#configuration-events}

配置加载、重新加载或卸载时执行的操作，可以通过 `ModConfigEvent.Loading`、`ModConfigEvent.Reloading` 和 `ModConfigEvent.Unloading` 事件完成。这些事件必须[注册][events]到模组事件总线。

:::caution
这些事件会针对模组的所有配置调用；应使用提供的事件中的 `ModConfig` 对象判断当前正在加载或重新加载哪个配置。
:::

## 配置界面 {#configuration-screen}

配置界面允许玩家在游戏中修改模组配置值，无需打开任何文件。界面会自动解析已注册的配置文件，并填充界面。

模组可以使用 NeoForge 提供的内置配置界面。模组可以继承 `ConfigurationScreen` 来修改默认界面的行为，或创建自己的配置界面。模组也可以从头创建界面，并通过下面的扩展点把自定义界面提供给 NeoForge。

可以在模组构造期间，在[客户端][client]注册 `IConfigScreenFactory` 扩展点，为模组添加配置界面：

```java
// 在主客户端模组文件中
public ExampleModClient(ModContainer container) {
    ...
    // 这会使用 NeoForge 的 ConfigurationScreen 显示此模组的配置
    container.registerExtensionPoint(IConfigScreenFactory.class, ConfigurationScreen::new);
    ...
}
```

在游戏中进入“模组”页面，从侧栏选择模组并点击“配置”按钮，即可打开配置界面。启动、通用和客户端配置始终可以编辑。只有在本地世界游玩时，才能在此界面中编辑服务端配置。如果连接到服务器或他人的局域网世界，界面中的服务端配置选项会被禁用。模组配置界面的第一页会显示所有已注册配置文件，供玩家选择要编辑的文件。

:::warning
如果要制作配置界面，应为所有配置条目添加翻译键，并在语言 JSON 中定义文本。

可以通过 `ModConfigSpec$Builder#translation` 方法为配置指定翻译键，例如扩展前面的代码：
```java
ConfigValue<T> value = builder.comment("这个值名为 'config_value_name'；如果不存在现有配置，则设为 defaultValue")
    .translation("modid.config.config_value_name")
    .define("config_value_name", defaultValue);
```

为了简化翻译，可以打开配置界面，依次访问所有配置及其子节，然后返回模组列表界面。此时，所有遇到但尚未翻译的配置条目会输出到控制台，便于确定需要翻译哪些内容以及对应的翻译键。
:::

[toml]: https://toml.io/
[nightconfig]: https://github.com/TheElectronWill/night-config
[configtype]: #configuration-types
[type]: https://github.com/neoforged/FancyModLoader/blob/aafe4660ae6eff2702ec786dba8e83c69c0d9e91/loader/src/main/java/net/neoforged/fml/config/ModConfig.java#L88-L121
[events]: ../concepts/events.md#registering-an-event-handler
[client]: ../concepts/sides.md#mod
