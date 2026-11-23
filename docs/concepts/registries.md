---
sidebar_position: 1
---
# 注册表

注册就是把模组的对象（例如[物品][item]、[方块][block]、实体等）登记到游戏中，使游戏知道它们存在。注册非常重要；如果没有注册，游戏根本不知道这些对象，会导致难以解释的行为和崩溃。

简单来说，注册表是围绕映射（map）的封装，它把注册名映射到已注册对象，这些对象通常称为注册表条目。注册名在同一个注册表内必须唯一，但同一个注册名可以出现在多个注册表中。最常见的例子是方块（位于 `BLOCKS` 注册表），它还有一个注册名相同的物品形式（位于 `ITEMS` 注册表）。

每个已注册对象都有一个唯一名称，称为注册名。注册名使用 [`Identifier`][identifier]表示。例如，泥土方块的注册名是 `minecraft:dirt`，僵尸的注册名是 `minecraft:zombie`。模组对象自然不会使用 `minecraft` 命名空间，而会使用其模组 ID 作为命名空间。

## 原版与模组

要理解 NeoForge 注册表系统的一些设计选择，首先需要了解 Minecraft 的做法。下面以方块注册表为例，大多数其他注册表的工作方式与之相同。

注册表通常注册[单例][singleton]。这意味着每个注册表条目只存在一个实例。例如，游戏中随处可见的石制方块实际上是同一个石方块的不同显示。如果需要石方块，只需引用已注册的方块实例。

Minecraft 在 `Blocks` 类中注册所有方块。`register` 方法会调用 `Registry#register()`，并把 `BuiltInRegistries.BLOCK` 中的方块注册表作为第一个参数。所有方块注册完成后，Minecraft 会根据方块列表执行各种检查，例如自检并确认每个方块都加载了模型。

这一切能够正常工作的主要原因是，Minecraft 足够早地加载了 `Blocks` 类。Minecraft 不会自动加载模组类，因此需要一些变通方案。

## 注册方法 {#methods-for-registering}

NeoForge 提供两种注册对象的方式：`DeferredRegister` 类和 `RegisterEvent`。前者是后者的封装，推荐优先使用，以避免出错。

### `DeferredRegister` {#deferredregister}

首先创建 `DeferredRegister`：

```java
public static final DeferredRegister<Block> BLOCKS = DeferredRegister.create(
        // 要使用的注册表。
        // Minecraft 的注册表位于 BuiltInRegistries，NeoForge 的注册表位于 NeoForgeRegistries。
        // 模组也可以添加自定义注册表，具体位置请查阅相应模组的文档或源码。
        BuiltInRegistries.BLOCK,
        // 模组 ID。
        ExampleMod.MOD_ID
);
```

随后可以使用以下方法之一，把注册表条目添加为静态 final 字段（`new Block()` 中应传入哪些参数，请参阅[方块][block]一文）：

```java
public static final DeferredHolder<Block, Block> EXAMPLE_BLOCK_1 = BLOCKS.register(
        // 注册名。
        "example_block",
        // 待注册对象的提供者。
        () -> new Block(...)
);

public static final DeferredHolder<Block, SlabBlock> EXAMPLE_BLOCK_2 = BLOCKS.register(
        // 注册名。
        "example_block",
        // 接收 Identifier 形式的注册名，
        // 并创建待注册对象的函数。
        registryName -> new SlabBlock(...)
);
```

`DeferredHolder<R, T extends R>` 类持有我们的对象。类型参数 `R` 是所注册到注册表的类型（本例中为 `Block`），类型参数 `T` 是提供者的类型。第一个例子直接注册 `Block`，因此第二个参数使用 `Block`。如果要注册 `Block` 子类的对象，例如第二个例子中的 `SlabBlock`，这里就应使用 `SlabBlock`。

`DeferredHolder<R, T extends R>` 是 `Supplier<T>` 的子类。需要取得已注册对象时，可以调用 `DeferredHolder#get()`。由于 `DeferredHolder` 继承 `Supplier`，字段类型也可以直接写成 `Supplier`。这样上面的代码可以改为：

```java
public static final Supplier<Block> EXAMPLE_BLOCK_1 = BLOCKS.register(
        // 注册名。
        "example_block",
        // 待注册对象的提供者。
        () -> new Block(...)
);

public static final Supplier<SlabBlock> EXAMPLE_BLOCK_2 = BLOCKS.register(
        // 注册名。
        "example_block",
        // 接收 Identifier 形式的注册名，
        // 并创建待注册对象的函数。
        registryName -> new SlabBlock(...)
);
```

:::note
少数位置明确要求使用 `Holder` 或 `DeferredHolder`，不接受任意 `Supplier`。如果需要这两种类型，最好按需把字段类型改回 `Holder` 或 `DeferredHolder`。
:::

最后，整个系统封装了注册表事件，因此需要让 `DeferredRegister` 按需附加到注册表事件：

```java
// 这是模组构造方法
public ExampleMod(IEventBus modBus) {
    //highlight-next-line
    ExampleBlocksClass.BLOCKS.register(modBus);
    //其他内容
}
```

:::info
方块、物品和数据组件有专用的 `DeferredRegister` 变体，它们提供辅助方法：[`DeferredRegister.Blocks`][defregblocks]、[`DeferredRegister.Items`][defregitems]、[`DeferredRegister.DataComponents`][defregcomp] 和 [`DeferredRegister.Entities`][defregentity]。
:::

### `RegisterEvent` {#registerevent}

`RegisterEvent` 是第二种注册对象的方式。这个[事件][event]会为每个注册表触发，触发时间在模组构造方法之后（因为 `DeferredRegister` 会在构造方法中注册其内部事件处理器）、配置加载之前。`RegisterEvent` 在模组事件总线上触发。

```java
@SubscribeEvent // 在模组事件总线上
public static void register(RegisterEvent event) {
    event.register(
            // 注册表的键。
            // 原版注册表可从 BuiltInRegistries 获取，
            // NeoForge 注册表可从 NeoForgeRegistries.Keys 获取。
            BuiltInRegistries.BLOCK,
            // 在这里注册对象。
            registry -> {
                registry.register(Identifier.fromNamespaceAndPath(MODID, "example_block_1"), new Block(...));
                registry.register(Identifier.fromNamespaceAndPath(MODID, "example_block_2"), new Block(...));
                registry.register(Identifier.fromNamespaceAndPath(MODID, "example_block_3"), new Block(...));
            }
    );
}
```

## 查询注册表

有时需要通过给定 ID 取得已注册对象，或者取得某个已注册对象的 ID。注册表本质上是把 ID（`Identifier`）映射到不同对象的映射，也就是可逆映射，因此这两种操作都可行：

```java
BuiltInRegistries.BLOCK.getValue(Identifier.fromNamespaceAndPath("minecraft", "dirt")); // 返回泥土方块
BuiltInRegistries.BLOCK.getKey(Blocks.DIRT); // 返回资源位置 "minecraft:dirt"

// 假设 ExampleBlocksClass.EXAMPLE_BLOCK.get() 是一个 ID 为 "yourmodid:example_block" 的 Supplier<Block>
BuiltInRegistries.BLOCK.getValue(Identifier.fromNamespaceAndPath("yourmodid", "example_block")); // 返回示例方块
BuiltInRegistries.BLOCK.getKey(ExampleBlocksClass.EXAMPLE_BLOCK.get()); // 返回资源位置 "yourmodid:example_block"
```

如果只想检查某个对象是否存在，也可以做到，不过只能按键检查：

```java
BuiltInRegistries.BLOCK.containsKey(Identifier.fromNamespaceAndPath("minecraft", "dirt")); // true
BuiltInRegistries.BLOCK.containsKey(Identifier.fromNamespaceAndPath("create", "brass_ingot")); // 仅当安装了 Create 时返回 true
```

如最后一个例子所示，可以使用任意模组 ID 检查某个对象是否存在，这是判断其他模组是否提供了某个物品的理想方式。

最后，还可以遍历注册表中的所有条目，既可以遍历键，也可以遍历条目（条目使用 Java 的 `Map.Entry` 类型）：

```java
for (Identifier id : BuiltInRegistries.BLOCK.keySet()) {
    // ...
}
for (Map.Entry<ResourceKey<Block>, Block> entry : BuiltInRegistries.BLOCK.entrySet()) {
    // ...
}
```

:::note
查询操作始终使用原版 `Registry`，而不是 `DeferredRegister`，因为 `DeferredRegister` 只是注册工具。
:::

:::danger
只有在注册完成后才能安全地查询注册表。**注册仍在进行时不要查询注册表！**
:::

## 自定义注册表 {#custom-registries}

自定义注册表允许你定义额外的系统，供基于你的模组开发的附属模组接入。例如，如果模组添加法术，可以把法术做成注册表，让其他模组向你的模组添加法术，而你无需再编写其他代码。自定义注册表还可以自动执行一些操作，例如同步条目。

首先创建[注册表键][resourcekey]和注册表本身：

```java
// 这里以法术作为注册表示例，不说明法术的具体含义，因为这并不重要。
// 当然，所有对法术的提及都可以且应该替换成实际注册表的内容。
public static final ResourceKey<Registry<Spell>> SPELL_REGISTRY_KEY = ResourceKey.createRegistryKey(Identifier.fromNamespaceAndPath("yourmodid", "spells"));
public static final Registry<YourRegistryContents> SPELL_REGISTRY = new RegistryBuilder<>(SPELL_REGISTRY_KEY)
        // 如果要为网络通信启用整数 ID 同步。
        // 这类 ID 应只用于网络上下文，例如数据包或纯网络相关的 NBT 数据。
        .sync(true)
        // 默认键，类似于方块的 minecraft:air。此项可选。
        .defaultKey(Identifier.fromNamespaceAndPath("yourmodid", "empty"))
        // 有效限制最大数量。通常不推荐，但在网络等场景中可能有意义。
        .maxId(256)
        // 构建注册表。
        .create();
```

然后在 `NewRegistryEvent` 中把注册表注册到根注册表，让游戏知道它存在：

```java
@SubscribeEvent // 在模组事件总线上
public static void registerRegistries(NewRegistryEvent event) {
    event.register(SPELL_REGISTRY);
}
```

现在可以像其他注册表一样，通过 `DeferredRegister` 或 `RegisterEvent` 注册新的注册表内容：

```java
public static final DeferredRegister<Spell> SPELLS = DeferredRegister.create(SPELL_REGISTRY, "yourmodid");
public static final Supplier<Spell> EXAMPLE_SPELL = SPELLS.register("example_spell", () -> new Spell(...));

// 或者：
@SubscribeEvent // 在模组事件总线上
public static void register(RegisterEvent event) {
    event.register(SPELL_REGISTRY_KEY, registry -> {
        registry.register(Identifier.fromNamespaceAndPath("yourmodid", "example_spell"), () -> new Spell(...));
    });
}
```

## 数据包注册表 {#datapack-registries}

数据包注册表（datapack registry）也称动态注册表（dynamic registry），或者按其常见用途称为世界生成注册表（worldgen registry）。它是一种特殊注册表，会在世界加载时从[数据包][datapack] JSON 文件加载内容，而不是在游戏启动时加载。默认数据包注册表主要包括大多数世界生成注册表，以及少数其他注册表。

数据包注册表允许用 JSON 文件定义内容，因此无需编写代码，除非你不想手写 JSON 而想使用[数据生成][datagen]。每个数据包注册表都有关联的 [`Codec`][codec]用于序列化，注册表 ID 决定其数据包路径：

- Minecraft 的数据包注册表使用 `data/yourmodid/registrypath` 格式，例如 `data/yourmodid/worldgen/biome`，其中 `worldgen/biome` 是注册表路径。
- 其他所有数据包注册表（NeoForge 或模组注册表）使用 `data/yourmodid/registrynamespace/registrypath` 格式，例如 `data/yourmodid/neoforge/biome_modifier`，其中 `neoforge` 是注册表命名空间，`biome_modifier` 是注册表路径。

数据包注册表可从 `RegistryAccess` 获取。服务端可调用 `ServerLevel#registryAccess()` 取得 `RegistryAccess`；客户端则调用 `Minecraft.getInstance().getConnection()#registryAccess()`（后者只在实际连接到世界时有效，否则连接对象为 null）。取得结果后，可以像使用其他注册表一样获取特定元素或遍历内容。

### 自定义数据包注册表 {#custom-datapack-registries}

自定义数据包注册表不需要构造 `Registry`，只需要一个注册表键和至少一个用于序列化和反序列化内容的 [`Codec`][codec]。沿用前面的法术示例，把法术注册表注册为数据包注册表的代码如下：

```java
public static final ResourceKey<Registry<Spell>> SPELL_REGISTRY_KEY = ResourceKey.createRegistryKey(Identifier.fromNamespaceAndPath("yourmodid", "spells"));

@SubscribeEvent // 在模组事件总线上
public static void registerDatapackRegistries(DataPackRegistryEvent.NewRegistry event) {
    event.dataPackRegistry(
            // 注册表键。
            SPELL_REGISTRY_KEY,
            // 注册表内容的 Codec。
            Spell.CODEC,
            // 注册表内容的网络 Codec。通常与普通 Codec 相同。
            // 也可以是普通 Codec 的缩减版本，省略客户端不需要的数据。
            // 可以为 null。为 null 时，注册表条目完全不会同步到客户端。
            // 也可以省略；这与传入 null 功能相同，
            // 此时会调用一个双参数重载，并把 null 传给普通的三参数方法。
            Spell.CODEC,
            // 通过 RegistryBuilder 配置所构造注册表的 Consumer。
            // 可以省略；这与传入 builder -> {} 功能相同。
            builder -> builder.maxId(256)
    );
}
```

### 为数据包注册表生成数据 {#data-generation-for-datapack-registries}

手写所有 JSON 文件既繁琐又容易出错，因此 NeoForge 提供[数据提供器][datagenindex]来生成 JSON 文件。它同时适用于内置数据包注册表和自定义数据包注册表。

首先创建 `RegistrySetBuilder`，并向其中添加条目（一个 `RegistrySetBuilder` 可以保存多个注册表的条目）：

```java
new RegistrySetBuilder()
    .add(Registries.CONFIGURED_FEATURE, bootstrap -> {
        // 通过 bootstrap 上下文注册已配置特性（见下文）
    })
    .add(Registries.PLACED_FEATURE, bootstrap -> {
        // 通过 bootstrap 上下文注册已放置特性（见下文）
    });
```

`bootstrap` lambda 参数才是实际用于注册对象的内容，其类型为 `BootstrapContext`。要注册对象，可以对其调用 `#register`：

```java
// 对象的资源键。
public static final ResourceKey<ConfiguredFeature<?, ?>> EXAMPLE_CONFIGURED_FEATURE = ResourceKey.create(
    Registries.CONFIGURED_FEATURE,
    Identifier.fromNamespaceAndPath(MOD_ID, "example_configured_feature")
);

new RegistrySetBuilder()
    .add(Registries.CONFIGURED_FEATURE, bootstrap -> {
        bootstrap.register(
            // 已配置特性的资源键。
            EXAMPLE_CONFIGURED_FEATURE,
            // 实际的已配置特性。
            new ConfiguredFeature<>(Feature.ORE, new OreConfiguration(...))
        );
    })
    .add(Registries.PLACED_FEATURE, bootstrap -> {
        // ...
    });
```

如有需要，也可以使用 `BootstrapContext` 查询另一个注册表中的条目：

```java
public static final ResourceKey<ConfiguredFeature<?, ?>> EXAMPLE_CONFIGURED_FEATURE = ResourceKey.create(
    Registries.CONFIGURED_FEATURE,
    Identifier.fromNamespaceAndPath(MOD_ID, "example_configured_feature")
);
public static final ResourceKey<PlacedFeature> EXAMPLE_PLACED_FEATURE = ResourceKey.create(
    Registries.PLACED_FEATURE,
    Identifier.fromNamespaceAndPath(MOD_ID, "example_placed_feature")
);

new RegistrySetBuilder()
    .add(Registries.CONFIGURED_FEATURE, bootstrap -> {
        bootstrap.register(EXAMPLE_CONFIGURED_FEATURE, ...);
    })
    .add(Registries.PLACED_FEATURE, bootstrap -> {
        HolderGetter<ConfiguredFeature<?, ?>> otherRegistry = bootstrap.lookup(Registries.CONFIGURED_FEATURE);
        bootstrap.register(EXAMPLE_PLACED_FEATURE, new PlacedFeature(
            otherRegistry.getOrThrow(EXAMPLE_CONFIGURED_FEATURE), // 取得已配置特性
            List.of() // 放置时不做任何操作；请替换为实际的放置参数
        ));
    });
```

最后，在实际的数据提供器中使用 `RegistrySetBuilder`，并把该数据提供器注册到事件：

```java
@SubscribeEvent // 在模组事件总线上
public static void onGatherData(GatherDataEvent.Client event) {
    // 把生成的注册表对象添加到当前查询提供器，
    // 供其他数据生成任务使用。
    event.createDatapackRegistryObjects(
        // 用于生成数据的注册表集构建器。
        new RegistrySetBuilder().add(...),
        // （可选）一个 BiConsumer，接收用于加载
        // 资源键所关联对象的任意条件。
        conditions -> {
            conditions.accept(resourceKey, condition);
        },
        // （可选）正在为其生成条目的模组 ID 集合。
        // 默认提供当前模组容器的模组 ID。
        Set.of("yourmodid")
    );

    // 可以调用某个 `#create*` 方法使用包含生成条目的查询提供器，
    // 也可以通过 `#getLookupProvider` 获取实际查询提供器。
    // ...
}
```

[block]: ../blocks/index.md
[blockentity]: ../blockentities/index.md
[codec]: ../datastorage/codecs.md
[datagen]: #data-generation-for-datapack-registries
[datagenindex]: ../resources/index.md#data-generation
[datapack]: ../resources/index.md#data
[defregblocks]: ../blocks/index.md#deferredregisterblocks-helpers
[defregcomp]: ../items/datacomponents.md#creating-custom-data-components
[defregentity]: ../entities/index.md#entitytype
[defregitems]: ../items/index.md#deferredregisteritems
[event]: events.md
[item]: ../items/index.md
[identifier]: ../misc/identifier.md
[resourcekey]: ../misc/identifier.md#resourcekeys
[singleton]: https://en.wikipedia.org/wiki/Singleton_pattern
