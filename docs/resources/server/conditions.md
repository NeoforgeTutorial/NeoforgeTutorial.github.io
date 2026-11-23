# 数据加载条件

有时需要在另一个模组存在、或有任意模组添加了另一种矿石等情况下禁用或启用某些功能。针对这些场景，NeoForge 添加了数据加载条件。它们最初称为配方条件，因为配方是该系统最早的使用场景，后来该系统扩展到了其他系统。这也是某些内置条件仅适用于物品的原因。

大多数 JSON 文件都可以在根对象中声明可选的 `neoforge:conditions` 块。该块会在数据文件真正加载前求值；当且仅当所有条件都通过时，加载才会继续，否则会忽略该数据文件。（[战利品表][loottable]是例外，它们会被替换为空战利品表。）

```json5
{
    "neoforge:conditions": [
        {
            // 条件 1
        },
        {
            // 条件 2
        },
        // ...
    ],
    // 数据文件的其余部分
}
```

:::note
如果要加载的值不是 map/object，则把它保存在 `neoforge:value` 中：

```json5
{
    "neoforge:conditions": [ /* ...*/ ],
    "neoforge:value": 2 // 要加载的值
}
```
:::

例如，只在 ID 为 `examplemod` 的模组存在时加载文件，文件可以写成这样：

```json5
{
    // highlight-start
    "neoforge:conditions": [
        {
            "type": "neoforge:mod_loaded",
            "modid": "examplemod"
        }
    ],
    // highlight-end
    "type": "minecraft:crafting_shaped",
    // ...
}
```

:::note
大多数原版文件都已修改为使用 `ConditionalCodec` 包装器来支持条件。不过，并非所有系统都能使用条件，尤其是那些不使用 [codec] 的系统。要确认某个数据文件能否使用条件，请检查其底层 codec 定义。
:::

## 内置条件

### `neoforge:always` 与 `neoforge:never`

这两个条件不包含数据，返回预期值。

```json5
{
    // 始终返回 true（"neoforge:never" 则始终返回 false）
    "type": "neoforge:always"
}
```

:::tip
使用 `neoforge:never` 条件可以非常干净地禁用任意数据文件。只需在对应位置放置一个包含以下内容的文件：

```json5
{"neoforge:conditions":[{"type":"neoforge:never"}]}
```

用这种方式禁用文件**不会**产生日志刷屏。
:::

### `neoforge:not`

该条件接收另一个条件并反转其结果。

```json5
{
    // 反转所保存条件的结果
    "type": "neoforge:not",
    "value": {
        // 另一个条件
    }
}
```

### `neoforge:and` 与 `neoforge:or`

这两个条件接收要操作的一个或多个条件，并应用相应逻辑。可接收的条件数量没有限制。

```json5
{
    // 对所保存的条件执行 AND（"neoforge:or" 则执行 OR）
    "type": "neoforge:and",
    "values": [
        {
            // 第一个条件
        },
        {
            // 第二个条件
        }
    ]
}
```

### `neoforge:mod_loaded`

如果具有给定模组 ID 的模组已加载，该条件返回 true，否则返回 false。

```json5
{
    "type": "neoforge:mod_loaded",
    // 如果 "examplemod" 已加载则返回 true
    "modid": "examplemod"
}
```

### `neoforge:registered`

如果特定注册表中具有给定注册名的对象已注册，该条件返回 true，否则返回 false。

```json5
{
    "type": "neoforge:registered",
    // 要检查值所在注册表
    // 默认为 `minecraft:item`
    "registry": "minecraft:item",
    // 如果 "examplemod:example_item" 已注册则返回 true
    "value": "examplemod:example_item"
}
```

### `neoforge:tag_empty`

如果给定注册表[标签]为空，该条件返回 true，否则返回 false。

```json5
{
    "type": "neoforge:tag_empty",
    // 要检查标签所在注册表
    // 默认为 `minecraft:item`
    "registry": "minecraft:item",
    // 如果 "examplemod:example_tag" 是空标签则返回 true
    "tag": "examplemod:example_tag"
}
```

### `neoforge:feature_flags_enabled`

如果所提供的[功能标志][flags]已启用，该条件返回 true，否则返回 false。

```json5
{
    "type": "neoforge:feature_flags_enabled",
    // 如果 "examplemod:example_feature" 已启用则返回 true
    "flags": [
        "examplemod:example_feature"
    ]
}
```

## 创建自定义条件

自定义条件需要实现 `ICondition` 及其 `#test(IContext)` 方法，并为其创建 [map codec][codec]。`#test` 中的 `IContext` 参数可以访问部分游戏状态。目前它只允许从注册表查询标签。有些带条件的对象可能早于标签加载，此时上下文为 `IContext.EMPTY`，完全不含标签信息。

例如，假设要实现 `xor` 条件，条件代码类似下面这样：

```java
public record XorCondition(ICondition first, ICondition second) implements ICondition {
    public static final MapCodec<XorCondition> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            ICondition.CODEC.fieldOf("first").forGetter(XorCondition::first),
            ICondition.CODEC.fieldOf("second").forGetter(XorCondition::second)
    ).apply(inst, XorCondition::new));

    @Override
    public boolean test(ICondition.IContext context) {
        return this.first.test(context) ^ this.second.test(context);
    }

    @Override
    public MapCodec<? extends ICondition> codec() {
        return CODEC;
    }
}
```

条件本身是 codec 的注册表，因此需要像下面这样[注册][register] codec：

```java
public static final DeferredRegister<MapCodec<? extends ICondition>> CONDITION_CODECS =
        DeferredRegister.create(NeoForgeRegistries.Keys.CONDITION_CODECS, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<XorCondition>> XOR =
        CONDITION_CODECS.register("xor", () -> XorCondition.CODEC);
```

随后就可以在数据文件中使用该条件（假设已在 `examplemod` 命名空间下注册）：

```json5
{
    "neoforge:conditions": [
        {
            "type": "examplemod:xor",
            "first": {
                // 或者此条件为 true
                "type": "..."
            },
            "second": {
                // 或者此条件为 true，但不能两者同时为 true！
                "type": "..."
            }
        }
    ],
    // 数据文件的其余部分
}
```

## 数据生成

虽然任意数据包 JSON 文件都能使用加载条件，但只有少数[数据提供器][datagen]经过修改，可以生成条件。包括：

- [`RecipeProvider`][recipeprovider]（通过 `RecipeOutput#withConditions`），包括配方进度
- `JsonCodecProvider` 及其子类 `SpriteSourceProvider`
- [`DataMapProvider`][datamapprovider]
- [`GlobalLootModifierProvider`][glmprovider]
- [`DatapackBuiltinEntriesProvider`][datapackentries]（通过 `Map<ResourceKey<?>, List<ICondition>>` 参数）

对于条件本身，`NeoForgeConditions` 类为每种内置条件类型提供静态辅助方法，返回相应的 `ICondition`。

[codec]: ../../datastorage/codecs.md
[datagen]: ../index.md#data-generation
[datamapprovider]: datamaps/index.md#data-generation
[datapackentries]: ../../concepts/registries.md#data-generation-for-datapack-registries
[flags]: ../../../26.1/advanced/featureflags.md
[glmprovider]: loottables/glm.md#datagen
[loottable]: loottables/index.md
[recipeprovider]: recipes/index.md#data-generation
[register]: ../../../26.1/concepts/registries.md
[tag]: tags.md
