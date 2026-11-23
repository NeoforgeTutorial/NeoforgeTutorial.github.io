---
sidebar_position: 1
---
# 能力

能力可以动态、灵活地暴露功能，无需直接实现大量接口。通常而言，每种能力都以接口形式提供一项功能。

NeoForge 为方块、实体和物品堆栈添加了能力支持。下文会进一步说明。

## 为什么要使用能力？

能力的设计目标是把方块、实体或物品堆栈**能做什么**与**如何做到**分离开来。如果想知道某项任务是否适合使用能力，可以问自己以下几个问题：

1. 我是否只关心方块、实体或物品堆栈**能做什么**，而不关心**如何做到**？
1. 该**行为**是否只为部分方块、实体或物品堆栈提供，而不是为所有对象提供？
1. 该行为的**实现**是否取决于特定方块、实体或物品堆栈？

以下是适合使用能力的例子：

- *“我希望自己的流体容器能与其他模组的流体容器兼容，但不了解每种流体容器的具体实现。”* 是，使用 `ResourceHandler<FluidResource>` 能力。
- *“我希望统计某个实体中有多少物品，但不知道这个实体可能如何存储物品。”* 是，使用 `ResourceHandler<ItemResource>` 能力。
- *“我希望给某个物品堆栈充能，但不知道这个物品堆栈可能如何储存能量。”* 是，使用 `EnergyHandler` 能力。
- *“我希望给玩家当前指向的方块上色，但不知道这个方块会如何被变换。”* 是。NeoForge 没有提供为方块上色的能力，但可以自行实现一个。

以下是不适合使用能力的例子：

- *“我想检查某个实体是否位于机器的范围内。”* 否，应使用辅助方法。

## NeoForge 提供的能力 {#neoforge-provided-capabilities}

NeoForge 为以下三种[资源处理器][resourcehandler]提供能力：`ResourceHandler<ItemResource>`、`ResourceHandler<FluidResource>` 和 `EnergyHandler`。

`ResourceHandler<ItemResource>` 暴露用于管理物品栏槽位的接口。`ResourceHandler<ItemResource>` 类型的能力包括：

- `Capabilities.Item.BLOCK`：方块中可被自动化访问的物品栏（箱子、机器等）。
- `Capabilities.Item.ENTITY`：实体的物品栏内容（额外玩家槽位、生物/怪物物品栏或袋子）。
- `Capabilities.Item.ENTITY_AUTOMATION`：实体中可被自动化访问的物品栏（船、矿车等）。
- `Capabilities.Item.ITEM`：物品堆栈的内容（便携背包等）。

`ResourceHandler<FluidResource>` 暴露用于管理流体物品栏的接口。`ResourceHandler<FluidResource>` 类型的能力包括：

- `Capabilities.Fluid.BLOCK`：方块中可被自动化访问的流体物品栏。
- `Capabilities.Fluid.ENTITY`：实体的流体物品栏。
- `Capabilities.Fluid.ITEM`：物品堆栈的流体物品栏。

`EnergyHandler` 暴露用于处理能量容器的接口。它基于 TeamCoFH 的 RedstoneFlux API。类型为 [`EnergyHandler`][energyhandler] 的能力包括：

- `Capabilities.Energy.BLOCK`：方块内包含的能量。
- `Capabilities.Energy.ENTITY`：实体内包含的能量。
- `Capabilities.Energy.ITEM`：物品堆栈内包含的能量。

## 创建能力

NeoForge 支持方块、实体和物品堆栈的能力。

能力可以通过某种分发逻辑查找 API 的实现。NeoForge 实现了以下种类的 Capability：

- `BlockCapability`：方块和方块实体的能力，行为取决于具体 `Block`。
    - 该能力通常会指定 `Direction` 上下文，以便根据方向提供不同资源。
- `EntityCapability`：实体的能力，行为取决于具体 `EntityType`。
    - 该能力通常也会指定 `Direction` 上下文，以便根据方向提供不同资源。
- `ItemCapability`：物品堆栈的能力，行为取决于具体 `Item`。
    - 该能力通常会指定 [`ItemAccess`][itemaccess] 上下文，表示持有该物品的资源。

:::tip
为了与其他模组兼容，只要可行，建议使用 `Capabilities` 类中 NeoForge 提供的能力。否则，可以按本节说明创建自己的能力。
:::

创建一个能力只需调用一次函数，结果对象应保存在 `static final` 字段中。必须提供以下参数：

- 能力名称。
    - 多次使用相同名称创建能力时，始终会返回同一个对象。
    - 名称不同的能力**完全独立**，可以用于不同用途。
- 要查询的行为类型，也就是 `T` 类型参数。
- 查询时附加上下文的类型，也就是 `C` 类型参数。

例如，可以为区分方向的方块 `ResourceHandler<ItemResource>` 这样声明能力：

```java
public static final BlockCapability<ResourceHandler<ItemResource>, @Nullable Direction> ITEM_HANDLER_BLOCK =
    BlockCapability.create(
        // 提供用于唯一标识该能力的名称。
        Identifier.fromNamespaceAndPath("mymod", "item_handler"),
        // 提供要查询的类型。这里需要查找 `ResourceHandler<ItemResource>` 实例。
        ResourceHandler.asClass(),
        // 提供上下文类型。查询时会额外接收 `Direction side` 参数。
        Direction.class
    );
```

`@Nullable Direction` 对方块来说十分常见，因此有一个专用辅助方法：

```java
public static final BlockCapability<ResourceHandler<ItemResource>, @Nullable Direction> ITEM_HANDLER_BLOCK =
    BlockCapability.createSided(
        // 提供用于唯一标识该能力的名称。
        Identifier.fromNamespaceAndPath("mymod", "item_handler"),
        // 提供要查询的类型。这里需要查找 `ResourceHandler<ItemResource>` 实例。
        ResourceHandler.asClass()
    );
```

如果不需要上下文，应使用 `Void`。此外，无上下文能力也有专用辅助方法：

```java
public static final BlockCapability<ResourceHandler<ItemResource>, Void> ITEM_HANDLER_NO_CONTEXT =
    BlockCapability.createVoid(
        // 提供用于唯一标识该能力的名称。
        Identifier.fromNamespaceAndPath("mymod", "item_handler_no_context"),
        // 提供要查询的类型。这里需要查找 `ResourceHandler<ItemResource>` 实例。
        ResourceHandler.asClass()
    );
```

`EntityCapability` 和 `ItemCapability` 也分别提供了类似方法。

## 查询能力

把 `BlockCapability`、`EntityCapability` 或 `ItemCapability` 对象保存在静态字段后，就可以查询能力。

对于实体和物品堆栈，可以使用 `getCapability` 尝试查找能力实现。如果结果为 `null`，表示没有可用实现。

例如：

```java
var object = entity.getCapability(CAP, context);
if (object != null) {
    // 使用 object
}
```

```java
var object = stack.getCapability(CAP, context);
if (object != null) {
    // 使用 object
}
```

方块能力的用法略有不同，因为没有方块实体的方块也可以具有能力。查询会在 `level` 上执行，并把要查找的 `pos` 位置作为额外参数：

```java
var object = level.getCapability(CAP, pos, context);
if (object != null) {
    // 使用 object
}
```

如果已知方块实体和/或方块状态，可以把它们传入，以减少查询时间：

```java
var object = level.getCapability(CAP, pos, blockState, blockEntity, context);
if (object != null) {
    // 使用 object
}
```

更具体的例子：从 `Direction.NORTH` 方向查询某个方块的 `ResourceHandler<ItemResource>` 能力：

```java
ResourceHandler<ItemResource> handler = level.getCapability(Capabilities.Item.BLOCK, pos, Direction.NORTH);
if (handler != null) {
    // 使用 handler 执行某些物品相关操作。
}
```

## 方块能力缓存

查询能力时，系统会在内部执行以下步骤：

1. 如果未提供方块实体和方块状态，就取得它们。
1. 取得已注册的能力提供器（详见下文）。
1. 遍历提供器，询问它们能否提供该能力。
1. 其中一个提供器会返回能力实例，并可能分配新对象。

该实现效率较高，但对于每个游戏 tick 都会执行的高频查询，这些步骤可能占用大量服务端时间。对于在固定位置频繁查询的能力，`BlockCapabilityCache` 系统能显著提高速度。

:::tip
通常，`BlockCapabilityCache` 只创建一次，然后保存在执行频繁能力查询的对象的字段中。具体保存位置由你决定。
:::

要创建缓存，请调用 `BlockCapabilityCache.create`，传入要查询的能力、关卡、位置和查询上下文。

```java
// 声明字段：
private BlockCapabilityCache<ResourceHandler<ItemResource>, @Nullable Direction> capCache;

// 之后，例如在方块实体的 `onLoad` 中：
this.capCache = BlockCapabilityCache.create(
    Capabilities.Item.BLOCK, // 要缓存的能力
    level, // 关卡
    pos, // 目标位置
    Direction.NORTH // 上下文
);
```

随后通过 `getCapability()` 查询缓存：

```java
ResourceHandler<ItemResource> handler = this.capCache.getCapability();
if (handler != null) {
    // 使用 handler 执行某些物品相关操作。
}
```

**缓存会由垃圾回收器自动清理，无需注销。**

还可以在能力对象变化时接收通知，包括能力发生变化（`oldHandler != newHandler`）、变为不可用（`null`），或再次变为可用（不再是 `null`）。

此时需要使用两个额外参数创建缓存：

- 有效性检查，用于确定缓存是否仍然有效。
    - 最简单的情况是作为方块实体字段使用，此时 `() -> !this.isRemoved()` 即可。
- 失效监听器，在能力发生变化时调用。
    - 可以在这里响应能力的改变、移除或重新出现。

```java
// 在方块实体的 `onLoad` 中：
// 带可选的失效监听器：
this.capCache = BlockCapabilityCache.create(
    Capabilities.Item.BLOCK, // 要缓存的能力
    level, // 关卡
    pos, // 目标位置
    Direction.NORTH, // 上下文
    () -> !this.isRemoved(), // 有效性检查（缓存可能比所属对象存活更久）
    () -> onCapInvalidate() // 失效监听器
);
```

## 方块能力失效 {#block-capability-invalidation}

:::info
能力失效仅适用于方块能力。实体和物品堆栈能力无法缓存，也不需要失效处理。
:::

为了确保缓存能正确更新保存的能力，**每当能力发生变化、出现或消失时，模组开发者都必须调用 `level.invalidateCapabilities(pos)`**。

```java
// 每当能力发生变化、出现或消失时：
level.invalidateCapabilities(pos);
```

NeoForge 已经处理区块加载/卸载以及方块实体创建/移除等常见情况，但其他情况需要模组开发者显式处理。例如，以下情况必须使能力失效：

- 之前返回的能力不再有效。
- 提供能力的方块（没有方块实体）被放置或改变状态，应重写 `onPlace` 并在这里处理。
- 提供能力的方块（没有方块实体）被移除，应重写 `onRemove` 并在这里处理。

普通方块的示例可参考 `ComposterBlock.java`。

更多信息请参考 [`IBlockCapabilityProvider`][block-cap-provider] 的 javadoc。

## 注册能力 {#registering-capabilities}

能力_提供器_最终负责提供能力。提供器是一个函数，可以返回能力实例；如果无法提供该能力，则返回 `null`。提供器与以下对象绑定：

- 它正在提供的给定能力。
- 它正在提供能力的方块实例、方块实体类型、实体类型或物品实例。

它们需要注册到 `RegisterCapabilitiesEvent`。

方块提供器通过 `registerBlock` 注册。例如：

```java
@SubscribeEvent // 在模组事件总线上
public static void registerCapabilities(RegisterCapabilitiesEvent event) {
    event.registerBlock(
        Capabilities.Item.BLOCK, // 要注册的能力
        (level, pos, state, be, side) -> <返回 ResourceHandler<ItemResource>>,
        // 要为其注册能力的方块
        MY_ITEM_HANDLER_BLOCK,
        MY_OTHER_ITEM_HANDLER_BLOCK
    );
}
```

通常，注册会针对某些方块实体类型，因此还提供了 `registerBlockEntity` 辅助方法：

```java
event.registerBlockEntity(
    Capabilities.Item.BLOCK, // 要注册的能力
    MY_BLOCK_ENTITY_TYPE, // 要为其注册能力的方块实体类型
    (myBlockEntity, side) -> myBlockEntity.myResourceHandlerForTheGivenSide
);
```

:::danger
如果方块或方块实体提供器之前返回的能力已不再有效，**必须调用 `level.invalidateCapabilities(pos)` 使缓存失效**。更多信息见上文[失效部分][invalidation]。
:::

实体注册类似，使用 `registerEntity`：

```java
event.registerEntity(
    Capabilities.Item.ENTITY, // 要注册的能力
    MY_ENTITY_TYPE, // 要为其注册能力的实体类型
    (myEntity, v) -> myEntity.myResourceHandlerForTheGivenContext
);
```

物品注册同样类似。注意提供器会接收物品堆栈：

```java
event.registerItem(
    Capabilities.Item.ITEM, // 要注册的能力
    (stack, itemAccess) -> <返回此 itemStack 的 ResourceHandler<ItemResource>>,
    // 要为其注册能力的物品
    MY_ITEM,
    MY_OTHER_ITEM
);
```

## 为所有对象注册能力

如果确实需要为所有方块、实体或物品注册提供器，就要遍历对应注册表，并为每个对象注册提供器。

例如，NeoForge 使用该系统为所有 `BucketItem`（不包括子类）注册流体资源处理器能力：

```java
// 供参考，这段代码位于 `CapabilityHooks` 类中。
for (Item item : BuiltInRegistries.ITEM) {
    if (item.getClass() == BucketItem.class) {
        event.registerItem(Capabilities.Fluid.ITEM, (stack, itemAccess) -> new BucketResourceHandler(itemAccess), item);
    }
}
```

系统会按照注册顺序询问提供器。如果希望在某项能力已经由 NeoForge 为你的某个对象注册的提供器之前运行，请使用更高优先级注册 `RegisterCapabilitiesEvent` 处理器。

例如：

```java
// 使用 HIGH 优先级以先于 NeoForge 注册！
@SubscribeEvent(priority = EventPriority.HIGH) // 在模组事件总线上
public static void registerCapabilities(RegisterCapabilitiesEvent event) {
    event.registerItem(
        Capabilities.Fluid.ITEM,
        (stack, itemAccess) -> new BucketResourceHandler(itemAccess),
        // 要为其注册能力的物品
        MY_CUSTOM_BUCKET
    );
}
```

NeoForge 自身注册的提供器列表见 [`CapabilityHooks`][capability-hooks]。

[block-cap-provider]: https://github.com/neoforged/NeoForge/blob/26.1.x/src/main/java/net/neoforged/neoforge/capabilities/IBlockCapabilityProvider.java
[capability-hooks]: https://github.com/neoforged/NeoForge/blob/26.1.x/src/main/java/net/neoforged/neoforge/capabilities/CapabilityHooks.java
[energyhandler]: transactions.md#energy-handler
[invalidation]: #block-capability-invalidation
[itemaccess]: transactions.md#item-access
[resourcehandler]: transactions.md#resource-handlers
