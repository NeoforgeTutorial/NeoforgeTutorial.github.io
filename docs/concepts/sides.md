---
sidebar_position: 2
---
# 客户端与服务端

和许多其他程序一样，Minecraft 采用客户端—服务端概念：客户端负责显示数据，服务端负责更新数据。使用这些术语时，我们似乎都能相当直观地理解其含义……对吧？

事实并非如此。许多困惑来自 Minecraft 会根据上下文区分两种不同的“端”（side）：物理端和逻辑端。

## 逻辑端与物理端

### 物理端 {#the-physical-side}

打开 Minecraft 启动器、选择一个 Minecraft 安装并按下“开始游戏”后，你启动的是一个**物理客户端**（physical client）。“物理”在这里表示“这是一个客户端程序”。特别重要的是，这里可以使用客户端功能，例如所有渲染相关内容。相对地，**物理服务端**（physical server）也称为专用服务器，是在启动 Minecraft 服务端 JAR 时打开的端。Minecraft 服务端虽然带有一个简单 GUI，但缺少所有仅客户端功能。最值得注意的是，服务端 JAR 中不包含各种客户端类。在物理服务端上调用这些类会导致缺失类错误，也就是崩溃，因此必须采取防护措施。

### 逻辑端 {#the-logical-side}

逻辑端主要关注 Minecraft 的内部程序结构。**逻辑服务端**（logical server）负责运行游戏逻辑，例如时间与天气变化、实体 tick、实体生成等；所有类型的数据（例如物品栏内容）也由服务端负责。**逻辑客户端**（logical client）则负责显示所有需要显示的内容。Minecraft 把所有客户端代码放在独立的 `net.minecraft.client` 包中，并让它们在名为渲染线程（Render Thread）的独立线程中运行；其他内容都被视为通用代码，也就是同时供客户端和服务端使用的代码。

### 两者有什么区别？

下面的两个场景最能说明物理端与逻辑端的区别：

- 玩家加入**多人游戏**世界。这个过程比较直接：玩家的物理（也是逻辑）客户端连接到位于其他位置的物理（也是逻辑）服务端。玩家不需要知道服务端在哪里；只要能连接，客户端了解和需要了解的内容就只有连接本身。
- 玩家加入**单人游戏**世界。这里就变得复杂了：玩家的物理客户端会启动一个逻辑服务端，然后客户端以逻辑客户端的身份连接到同一台机器上的逻辑服务端。如果熟悉网络编程，可以把它理解为连接到 `localhost`（仅用于概念类比；实际并不涉及套接字连接等机制）。

这两个场景也揭示了主要问题：即使逻辑服务端能够运行你的代码，也不代表物理服务端一定能运行。因此，应始终在专用服务器上测试，检查是否有意外行为。客户端与服务端隔离不正确所导致的 `NoClassDefFoundError` 和 `ClassNotFoundException` 是模组开发中最常见的错误之一。另一个常见错误是在两个逻辑端访问静态字段；这个问题尤其棘手，因为通常没有任何迹象表明出现了错误。

:::tip
如需把数据从一个端传输到另一个端，必须[发送数据包][networking]。
:::

在 NeoForge 代码库中，物理端由名为 `Dist` 的枚举表示，逻辑端由名为 `LogicalSide` 的枚举表示。

:::info
历史上，服务端 JAR 拥有一些客户端 JAR 没有的类。现代版本已不再如此；可以认为物理服务端是物理客户端的子集。
:::

## 执行与端相关的操作

### `Level#isClientSide()`

这个布尔检查是你最常使用的端判断方式。在 `Level` 对象上查询该方法，可以确定该世界所属的**逻辑**端：返回 `true` 时，世界运行在逻辑客户端；返回 `false` 时，世界运行在逻辑服务端。由此可知，物理服务端上该方法始终返回 `false`，但不能反过来假定 `false` 就代表物理服务端，因为物理客户端中的逻辑服务端（即单人游戏世界）也会返回 `false`。

需要判断是否应运行游戏逻辑和其他机制时，就应使用这个检查。例如，如果你希望玩家每次点击方块时受到伤害，或者希望机器把泥土加工成钻石，就必须先确认 `#isClientSide()` 返回 `false`。在逻辑客户端运行游戏逻辑，轻则导致不同步（幽灵实体、统计数据不同步等），重则导致崩溃。

:::tip
应把这个检查当作默认做法。只要手上有 `Level`，就使用它判断端。
:::

### `FMLEnvironment#getDist()`

`FMLEnvironment#getDist()` 是 `Level#isClientSide()` 检查的**物理**端对应项。返回 `Dist.CLIENT` 时，你位于物理客户端；返回 `Dist.DEDICATED_SERVER` 时，你位于物理服务端。

#### `@Mod`

处理仅客户端类时，检查物理环境非常重要。推荐做法是把只应在某一物理端执行的代码放入单独的 [`@Mod` 注解][mod]类，并把 `dist` 参数设为该类应加载的物理端：

```java
@Mod("examplemod")
public class ExampleMod {
    public ExampleMod(IEventBus modBus) {
        // 执行两个端都应运行的逻辑
    }
}

@Mod(value = "examplemod", dist = Dist.CLIENT)
public class ExampleModClient {
    public ExampleModClient(IEventBus modBus) {
        // 只执行物理客户端上的逻辑
    }
}

@Mod(value = "examplemod", dist = Dist.DEDICATED_SERVER)
public class ExampleModDedicatedServer {
    public ExampleModDedicatedServer(IEventBus modBus) {
        // 只执行物理服务端上的逻辑
    }
}
```

:::tip
通常应确保模组能在客户端或服务端环境中工作。尤其对于仅客户端模组，你应验证它确实能在物理客户端运行，并在无法运行时不对事件做任何处理。
:::

[networking]: ../../26.1/networking/index.md
[mod]: ../gettingstarted/modfiles.md#javafml-and-mod
