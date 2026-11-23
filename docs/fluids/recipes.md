---
description: 如何在配方中使用流体。
sidebar_position: 3
---
# 配方中的流体 {#fluids-in-recipes}

许多情况下，模组会需要在配方中使用[流体][fluid]。为此，NeoForge 提供 `FluidStack` 和 `FluidIngredient` 系统。它们分别模仿 [`ItemStack`][itemstack] 和 [`Ingredient`][ingredient]，因此如果以前用过物品对应系统，本页的大部分概念应该并不陌生。

## `FluidStack` {#fluidstack}

与 `ItemStack` 一样，`FluidStack` 由三个主要部分组成：

- 它表示的 `Fluid`。
    - 源流体和流动流体都可以使用，但通常只应使用源（非流动）流体，以免让玩家困惑。
- 数量。
- [数据组件][datacomponents]映射。

它们的工作方式大体等同于 `ItemStack`。`Fluid` 相当于 `ItemStack` 中的 `Item`，数量则相当于 `ItemStack` 中的堆叠数。

:::warning
与 `ItemStack` 不同，`FluidStack` 中的数量是**必需**的。流体单位是毫桶（mB），一桶（B）为 1000 mB；该常量可通过 `FluidType.BUCKET_VOLUME` 取得。
:::

此外，与 `ItemStack` 类似：

- 调用 `new FluidStack(fluid, amount)` 或 `new FluidStack(fluid, amount, dataComponents)` 创建 `FluidStack`。
- `FluidStack` 可变。
- 提供 `FluidStack#copy()` 和 `#copyWithAmount()`。
- 需要空值或 `null` 值时，应使用 `FluidStack.EMPTY`。
- 提供 `FluidStackTemplate`，在[数据生成][datagen]中的用途类似 [`ItemStackTemplate`][itemstacktemplate]。
- `FluidStackTemplate` 有对应的 JSON 表示：

```json5
{
    // 流体 ID，必需。
    "id": "minecraft:water",
    // 流体栈数量。1000 表示一桶。
    "amount": 1000,
    // 数据组件映射。可选，默认为空映射。
    "components": {
        "minecraft:enchantment_glint_override": true
    }
}
```

## `FluidIngredient` {#fluidingredient}

`FluidIngredient` 之于 `Fluid` 和 `FluidStack`，相当于 `Ingredient` 之于 `Item` 和 `ItemStack`。它们同样实现 `Predicate<FluidStack>`，可以调用 `#test(FluidStack)` 检查特定 `FluidStack` 是否匹配。

与物品 `Ingredient` 一样，可以调用 `FluidIngredient#of()` 的重载创建简单流体原料：

- `FluidIngredient.of()` 返回空流体原料。
- `FluidIngredient.of(Fluids.WATER, Fluids.LAVA)` 返回接受水或岩浆的流体原料。参数是可变参数 `Fluid...`，可以传入任意数量的 `Fluid`。
- `FluidIngredient.of(Stream.of(Fluids.WATER))` 与上一种方法作用相同，只是接收 `Stream<Fluid>`，而不是 `Fluid...`。
- `FluidIngredient.of(new FluidStack(Fluids.WATER), new FluidStack(Fluids.LAVA))` 与 `Fluid...` 版本相同，但接收 `FluidStack...`。这是便捷方法，会从 `FluidStack` 中提取 `Fluid`。如果还需要匹配数据组件，应使用下文的 `DataComponentFluidIngredient`。
- `FluidIngredient.of(BuiltInRegistries.FLUID.getOrThrow(Tags.Fluids.WATER))` 返回接受指定[标签][tag]中任意流体的原料。

与物品 `Ingredient` 一样，还存在一些专用实现：

- `CustomDisplayFluidIngredient.of(FluidIngredient.of(Fluids.WATER), SlotDisplay.Empty.INSTANCE)` 返回使用自定义 [`SlotDisplay`][slotdisplay] 的原料，用于决定客户端渲染时如何消耗槽位。
- `CompoundFluidIngredient.of(FluidIngredient.of(Fluids.WATER))` 返回一个包含子原料的复合原料，子原料通过构造函数的可变参数传入。任意子原料匹配时，复合原料即匹配。
- `DataComponentFluidIngredient.of(true, new FluidStack(Fluids.WATER))` 返回除流体外还匹配数据组件的原料。布尔参数表示严格匹配（`true`）或部分匹配（`false`）。严格匹配要求数据组件完全一致；部分匹配只要求指定数据组件一致，允许存在其他数据组件。`#of` 还有其他重载，可指定多个 `Fluid` 或提供其他选项。
- `DifferenceFluidIngredient.of(FluidIngredient.of(BuiltInRegistries.FLUID.getOrThrow(Tags.Fluids.WATER)), FluidIngredient.of(BuiltInRegistries.FLUID.getOrThrow(Tags.Fluids.LAVA)))` 返回匹配“第一个原料中且不在第二个原料中”内容的原料。
- `IntersectionFluidIngredient.of(FluidIngredient.of(BuiltInRegistries.FLUID.getOrThrow(Tags.Fluids.WATER)), FluidIngredient.of(BuiltInRegistries.FLUID.getOrThrow(Tags.Fluids.LAVA)))` 返回匹配同时符合两个子原料内容的原料。

### 自定义流体原料 {#custom-fluid-ingredients}

模组开发者可以继承 `FluidIngredient` 添加自己的流体原料类型。参照[物品原料页面中的示例][customingredients]，下面添加一种只有在 `FluidStack` 属于指定标签，并且具有所提供魔咒时才匹配的流体原料：

```java
public class MinEnchantedFluidIngredient extends FluidIngredient {
    private final TagKey<Fluid> tag;
    private final Map<Holder<Enchantment>, Integer> enchantments;
    // 用于序列化原料的 codec。
    public static final MapCodec<MinEnchantedFluidIngredient> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            TagKey.codec(Registries.FLUID).fieldOf("tag").forGetter(e -> e.tag),
            Codec.unboundedMap(Enchantment.CODEC, Codec.INT)
                    .optionalFieldOf("enchantments", Map.of())
                    .forGetter(e -> e.enchantments)
    ).apply(inst, MinEnchantedFluidIngredient::new));
    // 为原料创建流编解码器。对于当前用途，从普通 codec 创建即可。
    public static final StreamCodec<RegistryFriendlyByteBuf, MinEnchantedFluidIngredient> STREAM_CODEC =
            ByteBufCodecs.fromCodecWithRegistries(CODEC.codec());

    // 初始化字段的构造函数。也可以改用 #of() 等模式。
    public MinEnchantedFluidIngredient(TagKey<Fluid> tag, Map<Holder<Enchantment>, Integer> enchantments) {
        this.tag = tag;
        this.enchantments = enchantments;
    }

    // 检查传入的 FluidStack 是否满足要求。
    @Override
    public boolean test(FluidStack stack) {
        return stack.is(tag) && enchantments.keySet()
                .stream()
                .allMatch(ench -> stack.getOrDefault(DataComponents.ENCHANTMENTS, ItemEnchantments.EMPTY)
                        .getLevel(ench) >= enchantments.get(ench));
    }

    // 判断此流体原料是否执行数据组件匹配：false 表示执行，true 表示不执行。
    // 这也决定是否使用流编解码器同步，后文会介绍。
    // 因为要从流体栈查询魔咒，所以此原料不是简单原料。
    @Override
    public boolean isSimple() {
        return false;
    }

    // 返回匹配此原料的流体流，主要用于显示。
    // 注意事项与 Ingredient 文档中的说明完全相同。
    @Override
    protected Stream<Holder<Fluid>> generateFluids() {
        return BuiltInRegistries.FLUID.getOrThrow(tag).stream();
    }

    // FluidIngredient 要求实现 hashCode() 和 equals()。
    @Override
    public int hashCode() {
        return Objects.hash(tag, enchantments);
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof MinEnchantedFluidIngredient that)) return false;
        return Objects.equals(this.tag, that.tag)
            && Objects.equals(this.enchantments, that.enchantments);
    }
}
```

然后注册 `FluidIngredientType`：

```java
public static final DeferredRegister<FluidIngredientType<?>> FLUID_INGREDIENT_TYPES =
        DeferredRegister.create(NeoForgeRegistries.Keys.FLUID_INGREDIENT_TYPE, ExampleMod.MOD_ID);

public static final Supplier<FluidIngredientType<MinEnchantedFluidIngredient>> MIN_ENCHANTED =
        FLUID_INGREDIENT_TYPES.register("min_enchanted",
                // 流编解码器参数可选。如果未指定，
                // 会通过 ByteBufCodecs#fromCodec 或 #fromCodecWithRegistries 从 codec 创建。
                () -> new FluidIngredientType<>(
                    MinEnchantedFluidIngredient.CODEC,
                    MinEnchantedFluidIngredient.STREAM_CODEC));
```

最后，还需要在原料类中重写 `#getType`：

```java
public class MinEnchantedFluidIngredient extends FluidIngredient {
    // 其他内容

    @Override    
    public FluidIngredientType<?> getType() {
        return MIN_ENCHANTED.get();
    }
}
```

### JSON 表示 {#json-representation}

与 `FluidIngredient` 的其他内容一样，它的 JSON 表示也模仿物品 `Ingredient`。以自定义原料为例：

```json5
{
    "neoforge:fluid_ingredient_type": "examplemod:min_enchanted",
    "tag": "c:water",
    "enchantments": {
        "minecraft:sharpness": 4
    }
}
```

“普通”流体原料同样模仿原版：不指定 `type`，而是序列化为字符串：

```
"minecraft:water" // 流体
"#c:water"        // 流体标签
```

这些“普通”流体原料在代码中表示为 `SimpleFluidIngredient`。

[customingredients]: ../resources/server/recipes/ingredients.md#custom-ingredient-types
[datacomponents]: ../items/datacomponents.md
[datagen]: ../resources/index.md#data-generation
[fluid]: index.md
[ingredient]: ../resources/server/recipes/ingredients.md
[itemstack]: ../items/index.md#itemstacks
[itemstacktemplate]: ../items/index.md#itemstacktemplates
[tag]: ../resources/server/tags.md
[slotdisplay]: ../resources/server/recipes/custom.md#slot-displays
