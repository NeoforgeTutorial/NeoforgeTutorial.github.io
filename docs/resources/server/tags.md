# 标签

标签是同一类型已注册对象的列表，从数据文件加载，用于成员检查。例如制作木棍可接受任意木板。标签常以 `#` 前缀区分，例如 `#minecraft:planks`。

任何[注册表]都可以有标签；方块和物品最常见，流体、实体类型、伤害类型等也常使用标签。标签位于 `data/<tag_namespace>/tags/<registry_path>/<tag_path>.json`；非 Minecraft 注册表使用 `data/<tag_namespace>/tags/<registry_namespace>/<registry_path>/<tag_path>.json`。例如修改 `minecraft:planks` 标签的文件为 `data/minecraft/tags/item/planks.json`。

:::info
NeoForge 添加的通用标签通常使用 `c` 命名空间（如 `c:ingots/gold`），以便与 Fabric 统一。与 NeoForge 系统紧密相关的标签例外，例如部分[伤害类型][damagetype]标签。
:::

同名标签文件默认合并而不是整体替换。只有指定 `replace: true` 时才清除已有条目。

## 标签文件格式

```json5
{
    "values": [
        {
            "id": "examplemod:example_ingot",
            "required": false
        },
        // 必需条目的简写
        "minecraft:gold_ingot",
        // 引用另一个标签；循环依赖会导致数据包加载失败
        "#minecraft:planks"
    ],
    // 是否先清除已有条目，资源包开发者主要使用
    "replace": false,
    // NeoForge 添加，精确移除条目
    "remove": [
        "minecraft:iron_ingot"
    ]
}
```

## 查找和命名标签

先查原版标签（`BlockTags`、`ItemTags` 等）；再查 NeoForge 标签（`Tags.Blocks`、`Tags.Items` 等）；都不存在时再创建自己的标签。

创建时判断：

- 只影响自己的模组行为：使用模组命名空间。
- 其他模组可能共用：使用 `c` 命名空间，常见于金属、宝石。
- 其他情况：使用模组命名空间。

命名建议使用复数（`planks`、`ingots`）；同类多对象可建立文件夹和总标签，例如 `c:ingots/iron`、`c:ingots/gold` 与包含两者的 `c:ingots`。

## 使用标签

用注册表和标识符创建 `TagKey<T>`：

```java
public static final TagKey<Block> MY_TAG = TagKey.create(
        Registries.BLOCK,
        Identifier.fromNamespaceAndPath("examplemod", "example_tag")
);
```

:::warning
`TagKey` 虽然可公开构造，但不要直接调用构造方法，否则可能导致标签查询问题。
:::

检查成员：

```java
boolean isInTag = level.registryAccess().lookupOrThrow(BuiltInRegistries.BLOCK).getOrThrow(MY_TAG)
    .stream().anyMatch(holder -> holder.is(Blocks.DIRT));

boolean isInBlockTag = blockState.is(MY_TAG);
boolean isInItemTag = itemStack.is(MY_ITEM_TAG);

Stream<Holder<Block>> blocksInTag =
    level.registryAccess().lookupOrThrow(BuiltInRegistries.BLOCK).getOrThrow(MY_TAG).stream();
```

在数据组件中可通过初始化器提供的 `HolderLookup.Provider` 解析标签：

```java
Item.Properties props = new Item.Properties().delayedComponent(
    DataComponents.DAMAGE_RESISTANT,
    registries -> new DamageResistant(registries.getOrThrow(DamageTypeTags.IS_FIRE))
);
```

静态注册表可在启动阶段通过 `BuiltInRegistries#acquireBootstrapRegistrationLookup` 取得标签：

```java
HolderSet<Block> blockTag = BuiltInRegistries
    .acquireBootstrapRegistrationLookup(BuiltInRegistries.BLOCK)
    .getOrThrow(MY_TAG);
```

## 数据生成 {#datagen}

每种标签有对应 provider，均继承 `TagsProvider<T>`。主要分为 `IntrinsicHolderTagsProvider<T>`（可直接传对象）和 `KeyTagProvider`（传资源键）；`HolderTagProvider<T>` 用于包装为 `Holder` 的静态对象。

| 类型 | Provider |
|------|----------|
| `Block` | `BlockTagsProvider`（NeoForge 提供） |
| `Item` | `ItemTagsProvider`（NeoForge 提供） |
| `EntityType` | `EntityTypeTagsProvider` |
| `Fluid` | `FluidTagsProvider` |
| `DamageType` | `DamageTypeTagsProvider` |
| `Enchantment` | `EnchantmentTagsProvider` |
| `Biome` | `BiomeTagsProvider` |
| `Structure` | `StructureTagsProvider` |
| `Potion` | `PotionTagsProvider` |

方块标签示例：

```java
public class MyBlockTagsProvider extends BlockTagsProvider {
    public MyBlockTagsProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider) {
        super(output, lookupProvider, ExampleMod.MOD_ID);
    }

    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        this.tag(MY_TAG)
            .add(Blocks.DIRT, Blocks.COBBLESTONE)
            .add(TagEntry.optionalElement(Identifier.fromNamespaceAndPath("botania", "pure_daisy")))
            .addTag(BlockTags.PLANKS)
            .addTags(BlockTags.LOGS, BlockTags.WOODEN_SLABS)
            .addOptionalTag(BlockTags.create(Identifier.fromNamespaceAndPath("c", "ingots/tin")))
            .replace(false)
            .remove(Blocks.CRIMSON_SLAB, Blocks.WARPED_SLAB);
    }
}
```

注册 provider：

```java
@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    // 添加数据包对象时，先调用 event.createDatapackRegistryObjects(...)
    event.createProvider(MyBlockTagsProvider::new);
}
```

### 自定义标签 Provider

继承 `TagsProvider<T>`。使用 `getOrCreateRawBuilder` 可得到按 `Identifier` 操作的 `TagBuilder`，包括 `addElement`、`addOptionalElement`、`addTag`、`addOptionalTag`、`removeElement`、`removeTag` 和 `setReplace`。

`TagAppender<E, T>` 包装 `TagBuilder`，把任意入口对象 `E` 转为标签操作。`KeyTagProvider` 和 `IntrinsicHolderTagsProvider` 分别把资源键或注册对象映射为标识符。

```java
public class MyRecipeTypeTagsProvider extends TagsProvider<RecipeType<?>> {
    public MyRecipeTypeTagsProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider) {
        super(output, Registries.RECIPE_TYPE, lookupProvider, ExampleMod.MOD_ID);
    }

    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        this.getOrCreateRawBuilder(MY_TAG)
            .addElement(Identifier.fromNamespaceAndPath("minecraft", "crafting"))
            .addOptionalElement(Identifier.fromNamespaceAndPath("minecraft", "blasting"))
            .addTag(SMELTERS.location())
            .addOptionalTag(CRAFTERS.location())
            .removeElement(Identifier.fromNamespaceAndPath("minecraft", "campfire_cooking"))
            .removeTag(SMITHERS.location());
    }
}
```

#### 复制标签内容

`BlockTagCopyingItemTagProvider` 可把方块标签内容复制到对应物品标签：

```java
public class ExampleBlockTagCopyingItemTagProvider extends BlockTagCopyingItemTagProvider {
    public ExampleBlockTagCopyingItemTagProvider(
        PackOutput output,
        CompletableFuture<HolderLookup.Provider> lookupProvider,
        CompletableFuture<TagLookup<Block>> blockTags
    ) {
        super(output, lookupProvider, blockTags, ExampleMod.MOD_ID);
    }

    @Override
    protected void addTags(HolderLookup.Provider lookupProvider) {
        this.copy(EXAMPLE_BLOCK_TAG, EXAMPLE_ITEM_TAG);
    }
}

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createBlockAndItemTags(MyBlockTagsProvider::new, ExampleBlockTagCopyingItemTagProvider::new);
}
```

[damagetype]: damagetypes.md
[datacomponent]: ../../items/datacomponents.md
[datagen]: ../index.md#data-generation
[registry]: ../../concepts/registries.md
[regkey]: ../../misc/identifier.md#resourcekeys
[identifier]: ../../misc/identifier.md
