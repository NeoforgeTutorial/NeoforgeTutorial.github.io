# 原料

`Ingredient` 用于[配方]检查 `ItemStack` 是否为有效输入，并实现 `Predicate<ItemStack>`。NeoForge 尽量绕开 `Ingredient` 的内部实现，改用 `ICustomIngredient` 定义自定义原料；两者可分别通过 `ICustomIngredient#toVanilla` 和 `Ingredient#getCustomIngredient` 转换。

## 内置原料类型

- `Ingredient.of()`：空原料。
- `Ingredient.of(Blocks.IRON_BLOCK, Items.GOLD_BLOCK)`：接受任意给定 `ItemLike`。
- `Ingredient.of(Stream.of(Items.DIAMOND_SWORD))`：接受流中的物品。
- `Ingredient.of(BuiltInRegistries.ITEM.getOrThrow(ItemTags.WOODEN_SLABS))`：接受标签中的所有物品。

NeoForge 额外提供：

- `new BlockTagIngredient(BlockTags.CONVERTABLE_TO_MUD)`：使用方块标签，仅当只有方块标签可用时使用。
- `CustomDisplayIngredient.of(Ingredient.of(Items.DIRT), SlotDisplay.Empty.INSTANCE)`：自定义客户端 [`SlotDisplay`][slotdisplay]。
- `CompoundIngredient.of(...)`：任一子原料匹配即可。
- `DataComponentIngredient.of(true, new ItemStack(Items.DIAMOND_SWORD))`：同时匹配数据组件；布尔值表示严格或部分匹配。
- `DifferenceIngredient.of(first, second)`：匹配第一个原料中、但不在第二个原料中的对象。
- `IntersectionIngredient.of(first, second)`：匹配同时属于两个原料的对象。

:::note
数据生成时，标签型原料使用的 `HolderSet` 应通过 `HolderLookup.Provider#lookupOrThrow` 和 `HolderGetter#getOrThrow` 获取。
:::

NeoForge 原料属于 `ICustomIngredient`，用于原版上下文前必须调用 `#toVanilla`。

## 自定义原料类型 {#custom-ingredient-types}

下面定义只接受带指定最低等级魔咒的标签物品：

```java
public class MinEnchantedIngredient implements ICustomIngredient {
    private final TagKey<Item> tag;
    private final Map<Holder<Enchantment>, Integer> enchantments;

    public static final MapCodec<MinEnchantedIngredient> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            TagKey.codec(Registries.ITEM).fieldOf("tag").forGetter(e -> e.tag),
            Codec.unboundedMap(Enchantment.CODEC, Codec.INT)
                    .optionalFieldOf("enchantments", Map.of())
                    .forGetter(e -> e.enchantments)
    ).apply(inst, MinEnchantedIngredient::new));

    public static final StreamCodec<RegistryFriendlyByteBuf, MinEnchantedIngredient> STREAM_CODEC =
            ByteBufCodecs.fromCodecWithRegistries(CODEC.codec());

    public MinEnchantedIngredient(TagKey<Item> tag, Map<Holder<Enchantment>, Integer> enchantments) {
        this.tag = tag;
        this.enchantments = enchantments;
    }

    @Override
    public boolean test(ItemStack stack) {
        return stack.is(tag) && enchantments.keySet().stream().allMatch(ench ->
            EnchantmentHelper.getEnchantmentsForCrafting(stack).getLevel(ench) >= enchantments.get(ench));
    }

    @Override
    public boolean isSimple() {
        return false;
    }

    @Override
    public Stream<Holder<Item>> items() {
        return BuiltInRegistries.ITEM.getOrThrow(tag).stream();
    }

    @Override
    public IngredientType<?> getType() {
        return MIN_ENCHANTED.get();
    }
}
```

原料类型是[注册表]对象，用 `IngredientType` 包装 `MapCodec` 和可选 `StreamCodec`：

```java
public static final DeferredRegister<IngredientType<?>> INGREDIENT_TYPES =
        DeferredRegister.create(NeoForgeRegistries.Keys.INGREDIENT_TYPE, ExampleMod.MOD_ID);

public static final Supplier<IngredientType<MinEnchantedIngredient>> MIN_ENCHANTED =
        INGREDIENT_TYPES.register("min_enchanted",
                () -> new IngredientType<>(MinEnchantedIngredient.CODEC, MinEnchantedIngredient.STREAM_CODEC));
```

## JSON 表示

带 `neoforge:ingredient_type` 的对象是非原版原料，例如：

```json5
{
    "neoforge:ingredient_type": "examplemod:min_enchanted",
    "tag": "c:swords",
    "enchantments": {
        "minecraft:sharpness": 4
    }
}
```

字符串表示原版原料：物品 ID 或带 `#` 的标签，例如 `"minecraft:dirt"`、`"#c:ingots"`。

[codec]: ../../../datastorage/codecs.md
[itemlike]: ../../../items/index.md#itemlike
[itemstack]: ../../../items/index.md#itemstacks
[recipes]: index.md
[registry]: ../../../concepts/registries.md
[slotdisplay]: custom.md#slot-displays
[streamcodec]: ../../../networking/streamcodecs.md
[tag]: ../tags.md
