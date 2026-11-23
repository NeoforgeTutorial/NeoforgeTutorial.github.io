import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 客户端物品

客户端物品在代码中表示游戏应如何提交 `ItemStack` 进行渲染，并指定在不同状态下使用哪些模型。客户端物品位于 [`assets` 文件夹][assets]内的 `items` 子目录，位置由 `DataComponents#ITEM_MODEL` 中的相对位置指定。默认使用对象注册名，例如 `minecraft:apple` 默认位于 `assets/minecraft/items/apple.json`。

客户端物品保存在 `ModelManager` 中，可通过 `Minecraft.getInstance().modelManager` 访问。然后可传入 [`Identifier`][rl]，调用 `ModelManager#getItemModel` 或 `getItemProperties` 取得客户端物品信息。

:::warning
不要把它与游戏中实际烘焙并渲染的[模型][models]混淆。
:::

## 概览

客户端物品 JSON 可分为两部分：由 `model` 定义的模型，以及由 `properties` 定义的属性。`model` 负责指定在给定上下文中提交 `ItemStack` 渲染时使用哪些模型 JSON；`properties` 则负责渲染器使用的设置。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    // 定义提交渲染的模型
    "model": {
        "type": "minecraft:model",
        // 指向相对于 'models' 目录的模型 JSON
        // 位于 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item"
    },
    // 定义渲染过程中使用的一些设置
    "properties": {
        // 为 false 时禁用物品切换时抬向其正常位置的动画
        "hand_animation_on_swap": false,
        // 为 true 时允许模型在 GUI 中渲染到已定义槽位边界
        //（定义于 GuiItemRenderState#bounds）之外，而不是被裁剪
        "oversized_in_gui": false,
        // 把标量应用到切换时的手部高度
        "swap_animation_scale": 1.0
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展的 ModelProvider 中
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.register(
        EXAMPLE_ITEM.get(),
        // 定义提交渲染的模型
        new CuboidItemModelWrapper.Unbaked(
            // 指向相对于 'models' 目录的模型 JSON
            // 位于 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            Collections.emptyList()
        ),
        // 定义渲染过程中使用的一些设置
        new ClientItem.Properties(
            // 为 false 时禁用物品切换时抬向其正常位置的动画
            false,
            // 为 true 时允许模型在 GUI 中渲染到已定义槽位边界之外，而不是被裁剪
            false,
            // 把标量应用到切换时的手部高度
            1.0F
        )
    );
}
```

</TabItem>
</Tabs>

物品模型如何提交渲染的更多信息见[下文][itemmodel]。

## 基础模型 {#a-basic-model}

`model` 中的 `type` 字段决定如何为物品选择提交渲染的模型。最简单的类型由 `minecraft:model`（或 `CuboidItemModelWrapper`）处理，其功能是指定相对于 `models` 目录提交渲染的模型 JSON（例如 `assets/<namespace>/models/<path>.json`）。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // 指向相对于 'models' 目录的模型 JSON
        // 位于 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item"
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展的 ModelProvider 中
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // 指向相对于 'models' 目录的模型 JSON
            // 位于 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            Collections.emptyList()
        )
    );
}
```

</TabItem>
</Tabs>

### 局部变换

大多数客户端物品模型可像模型 JSON 一样指定物品模型 `Transformation`。这些 `Transformation` 在关联显示上下文的模型 JSON 变换之后应用，通过 `minecraft:model` 类型的 `transformation` 字段设置。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // 指向 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item",
        // 在模型 JSON 变换之后应用的变换。
        "transformation": {
            // 客户端物品平移，形式为 `[x, y, z]`。
            "translation": [
                0.5,
                0.0,
                0.5
            ],
            // 客户端物品初始旋转，可指定为：
            // - `[x, y, z, w]`
            // - { angle, [x, y, z] 旋转轴 }
            "left_rotation": [
                1.0,
                0.0,
                0.0,
                0.0
            ],
            // 客户端物品缩放，形式为 `[x, y, z]`。
            "scale": [
                1.0,
                1.0,
                1.0
            ],
            // 缩放后客户端物品的旋转，可指定为：
            // - `[x, y, z, w]`
            // - { angle, [x, y, z] 旋转轴 }
            "right_rotation": {
                "angle": 0,
                "axis": [
                    0.0,
                    0.0,
                    0.0
                ]
            }
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展的 ModelProvider 中
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // 指向 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            // 在模型 JSON 变换之后应用的变换。
            Optional.of(new Transformation(
                // 客户端物品平移。
                new Vector3f(0.5f, 0f, 0.5f),
                // 客户端物品初始旋转。
                new Quaternionf(1f, 0f, 0f, 0f),
                // 客户端物品缩放。
                new Vector3f(1f, 1f, 1f),
                // 缩放后的旋转。
                new Quaternionf(new AxisAngle4f(0f, 0f, 0f, 0f))
            )),
            Collections.emptyList()
        )
    );
}
```

</TabItem>
</Tabs>

### 着色 {#tinting}

与大多数模型一样，客户端物品可根据物品堆栈属性改变指定纹理颜色。因此 `minecraft:model` 类型有 `tints` 字段，用于定义要应用的不透明颜色。这些对象称为 `ItemTintSource`，定义在 `ItemTintSources` 中。它们也有 `type` 字段指定来源类型，应用到的 `tintindex` 由列表中的索引决定。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
// JSON 位于 'assets/examplemod/items/example_item.json'
{
    "model": {
        "type": "minecraft:model",
        // 指向 'assets/examplemod/models/item/example_item.json'
        "model": "examplemod:item/example_item",
        // 要应用的着色列表
        "tints": [
            {
                // 对应 tintindex: 0
                "type": "minecraft:constant",
                // 0x00FF00（纯绿色）
                "value": 65280
            },
            {
                // 对应 tintindex: 1
                "type": "minecraft:dye",
                // 0x0000FF（纯蓝色）
                // 仅在未设置 `DataComponents#DYED_COLOR` 时调用
                "default": 255
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
// 假设存在 DeferredItem<Item> EXAMPLE_ITEM
// 在扩展的 ModelProvider 中
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            // 指向 'assets/examplemod/models/item/example_item.json'
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            // 要应用的着色列表
            List.of(
                // 对应 tintindex: 0
                new Constant(
                    // 纯绿色
                    0x00FF00
                ),
                // 对应 tintindex: 1
                new Dye(
                    // 纯蓝色
                    // 仅在未设置 `DataComponents#DYED_COLOR` 时调用
                    0x0000FF
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自定义 `ItemTintSource` 与其他基于 codec 的注册对象类似：实现 `ItemTintSource`，创建用于编解码的 `MapCodec`，并在[模组事件总线][modbus]上通过 `RegisterColorHandlersEvent.ItemTintSources` 注册 codec。`ItemTintSource` 只有 `calculate` 方法，接收当前 `ItemStack`、物品堆栈所在关卡和持有者实体，返回 ARGB 格式的不透明颜色，高 8 位为 0xFF。

```java
public record DamageBar(int defaultColor) implements ItemTintSource {

    // 要注册的 map codec
    public static final MapCodec<DamageBar> MAP_CODEC = ExtraCodecs.RGB_COLOR_CODEC.fieldOf("default")
        .xmap(DamageBar::new, DamageBar::defaultColor);

    public DamageBar(int defaultColor) {
        // 确保传入颜色不透明
        this.defaultColor = ARGB.opaque(defaultColor);
    }

    @Override
    public int calculate(ItemStack stack, @Nullable ClientLevel level, @Nullable LivingEntity entity) {
        return stack.isDamaged() ? ARGB.opaque(stack.getBarColor()) : defaultColor;
    }

    @Override
    public MapCodec<DamageBar> type() {
        return MAP_CODEC;
    }
}

// 在某个事件处理器类中
@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerItemTintSources(RegisterColorHandlersEvent.ItemTintSources event) {
    event.register(
        // 用作 type 的名称
        Identifier.fromNamespaceAndPath("examplemod", "damage_bar"),
        // map codec
        DamageBar.MAP_CODEC
    )
}
```

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 对于某个物品 'examplemod:example_item'
{
    "model": {
        "type": "minecraft:model",
        "model": "examplemod:item/example_item",
        "tints": [
            {
                "type": "examplemod:damage_bar",
                "default": 65280
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CuboidItemModelWrapper.Unbaked(
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            Optional.empty(),
            List.of(new DamageBar(0x00FF00))
        )
    );
}
```

</TabItem>
</Tabs>

## 复合模型 {#composite-models}

有时要为单个物品注册多个模型。虽然可直接使用[复合模型加载器][composite]，但物品模型有自定义的 `minecraft:composite` 类型，接收一组提交渲染的模型。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "model": {
        "type": "minecraft:composite",
        // 提交渲染的模型，按列表顺序绘制
        "models": [
            {
                "type": "minecraft:model",
                "model": "examplemod:item/example_item_1"
            },
            {
                "type": "minecraft:model",
                "model": "examplemod:item/example_item_2"
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new CompositeModel.Unbaked(
            List.of(
                new CuboidItemModelWrapper.Unbaked(
                    Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                    Optional.empty(),
                    Collections.emptyList()
                ),
                new CuboidItemModelWrapper.Unbaked(
                    Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                    Optional.empty(),
                    Collections.emptyList()
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

## 属性模型

有些物品会根据堆栈中的数据改变状态（例如拉弓、鞘翅损坏程度、特定维度中的时钟等）。为让模型随状态变化，物品模型可指定一个属性并据此选择模型。属性模型有三种：范围分发、选择和条件，它们分别相当于针对 float 的表达式、switch case 和 boolean。

### 范围分发模型

范围分发模型的 `type` 定义某个 `RangeSelectItemModelProperty`，取得用于切换模型的 float。每个条目有阈值，只有 float 大于阈值时才会选择对应模型。实际选择不超过属性值且最接近它的阈值（例如属性值为 `4`、阈值为 `3` 和 `5` 时选择与 `3` 关联的模型；值为 `6` 时选择与 `5` 关联的模型）。可用属性见 `RangeSelectItemModelProperties`。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "model": {
        "type": "minecraft:range_dispatch",
        "property": "minecraft:count",
        "scale": 1,
        "fallback": {
            "type": "minecraft:model",
            "model": "examplemod:item/example_item"
        },
        // `Count` 定义的属性；为 true 时按最大堆叠数归一化数量
        "normalize": true,
        "entries": [
            {
                "threshold": 0.33,
                "model": {
                    "type": "minecraft:model",
                    "model": "examplemod:item/example_item_1"
                }
            },
            {
                "threshold": 0.66,
                "model": {
                    "type": "minecraft:model",
                    "model": "examplemod:item/example_item_2"
                }
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new RangeSelectItemModel.Unbaked(
            new Count(true),
            1,
            List.of(
                new RangeSelectItemModel.Entry(
                    0.33,
                    new CuboidItemModelWrapper.Unbaked(
                        Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                        Optional.empty(),
                        Collections.emptyList()
                    )
                ),
                new RangeSelectItemModel.Entry(
                    0.66,
                    new CuboidItemModelWrapper.Unbaked(
                        Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                        Optional.empty(),
                        Collections.emptyList()
                    )
                )
            ),
            Optional.of(
                new CuboidItemModelWrapper.Unbaked(
                    ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
                    Optional.empty(),
                    Collections.emptyList()
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自定义 `RangeSelectItemModelProperty` 与其他基于 codec 的注册对象类似：实现接口、创建 `MapCodec`，并通过[模组事件总线][modbus]上的 `RegisterRangeSelectItemModelPropertyEvent` 注册。它只有 `get` 方法，接收 `ItemStack`、客户端关卡、物品持有者和种子值，返回由范围分发模型解释的 float。

```java
public record AppliedEnchantments() implements RangeSelectItemModelProperty {

    public static final MapCodec<AppliedEnchantments> MAP_CODEC = MapCodec.unit(new AppliedEnchantments());

    @Override
    public float get(ItemStack stack, @Nullable ClientLevel level, @Nullable ItemOwner owner, int seed) {
        return (float) stack.getTagEnchantments().size();
    }

    @Override
    public MapCodec<AppliedEnchantments> type() {
        return MAP_CODEC;
    }
}

@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerRangeProperties(RegisterRangeSelectItemModelPropertyEvent event) {
    event.register(
        Identifier.fromNamespaceAndPath("examplemod", "applied_enchantments"),
        AppliedEnchantments.MAP_CODEC
    )
}
```

JSON 中把 `property` 设为 `examplemod:applied_enchantments`，再用 `scale` 和 `entries` 设置阈值即可。

### 选择模型

选择模型类似范围分发模型，但会根据 `SelectItemModelProperty` 定义的值进行 switch，类似枚举的 switch 语句。实际选择与 case 值完全匹配的模型。可用属性见 `SelectItemModelProperties`。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "model": {
        "type": "minecraft:select",
        "property": "minecraft:display_context",
        "fallback": {
            "type": "minecraft:model",
            "model": "examplemod:item/example_item"
        },
        "cases": [
            {
                "when": "gui",
                "model": {
                    "type": "minecraft:model",
                    "model": "examplemod:item/example_item_1"
                }
            },
            {
                "when": "firstperson_righthand",
                "model": {
                    "type": "minecraft:model",
                    "model": "examplemod:item/example_item_2"
                }
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new SelectItemModel.Unbaked(
            new SelectItemModel.UnbakedSwitch(
                new DisplayContext(),
                List.of(
                    new SelectItemModel.SwitchCase(
                        List.of(ItemDisplayContext.GUI),
                        new CuboidItemModelWrapper.Unbaked(
                            Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                            Optional.empty(),
                            Collections.emptyList()
                        )
                    ),
                    new SelectItemModel.SwitchCase(
                        List.of(ItemDisplayContext.FIRST_PERSON_RIGHT_HAND),
                        new CuboidItemModelWrapper.Unbaked(
                            Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                            Optional.empty(),
                            Collections.emptyList()
                        )
                    )
                )
            ),
            Optional.of(
                new CuboidItemModelWrapper.Unbaked(
                    ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
                    Optional.empty(),
                    Collections.emptyList()
                )
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自定义 `SelectItemModelProperty<T>` 时，实现接口、创建用于属性值的 `Codec`、创建对象自身的 `MapCodec`，并在[模组事件总线][modbus]上通过 `RegisterSelectItemModelPropertyEvent` 注册。`get` 方法接收物品堆栈、关卡、持有者、种子和显示上下文，返回用于 switch 的任意 `T`。

```java
public record StackRarity() implements SelectItemModelProperty<Rarity> {

    public static final SelectItemModelProperty.Type<StackRarity, Rarity> TYPE = SelectItemModelProperty.Type.create(
        MapCodec.unit(new StackRarity()),
        // 被选择对象的 codec，用于序列化 case 项（"when": <属性值>）
        Rarity.CODEC
    );

    @Nullable
    @Override
    public Rarity get(ItemStack stack, @Nullable ClientLevel level, @Nullable LivingEntity entity, int seed, ItemDisplayContext displayContext) {
        // 返回 null 时使用 fallback 模型
        return stack.get(DataComponents.RARITY);
    }

    @Override
    public SelectItemModelProperty.Type<StackRarity, Rarity> type() {
        return TYPE;
    }
}

@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerSelectProperties(RegisterSelectItemModelPropertyEvent event) {
    event.register(
        Identifier.fromNamespaceAndPath("examplemod", "rarity"),
        StackRarity.TYPE
    )
}
```

JSON 的 `property` 可设为 `examplemod:rarity`，case 的 `when` 分别使用 `uncommon`、`rare` 等值。

### 条件模型

条件模型是三种中最简单的。其类型定义 `ConditionalItemModelProperty`，取得用于切换的 boolean，并根据返回 true 还是 false 选择模型。可用属性见 `ConditionalItemModelProperties`。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "model": {
        "type": "minecraft:condition",
        "property": "minecraft:damaged",
        "on_true": {
            "type": "minecraft:model",
            "model": "examplemod:item/example_item_1"
        },
        "on_false": {
            "type": "minecraft:model",
            "model": "examplemod:item/example_item_2"
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new ConditionalItemModel.Unbaked(
            new Damaged(),
            new CuboidItemModelWrapper.Unbaked(
                Identifier.fromNamespaceAndPath("examplemod", "item/example_item_1"),
                Optional.empty(),
                Collections.emptyList()
            ),
            new CuboidItemModelWrapper.Unbaked(
                Identifier.fromNamespaceAndPath("examplemod", "item/example_item_2"),
                Optional.empty(),
                Collections.emptyList()
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自定义 `ConditionalItemModelProperty` 时，实现接口、创建 `MapCodec`，并在[模组事件总线][modbus]上通过 `RegisterConditionalItemModelPropertyEvent` 注册。`get` 方法返回条件模型用来选择 `on_true` 或 `on_false` 的 boolean。

```java
public record BarVisible() implements ConditionalItemModelProperty {

    public static final MapCodec<BarVisible> MAP_CODEC = MapCodec.unit(new BarVisible());

    @Override
    public boolean get(ItemStack stack, @Nullable ClientLevel level, @Nullable LivingEntity entity, int seed, ItemDisplayContext context) {
        return stack.isBarVisible();
    }

    @Override
    public MapCodec<BarVisible> type() {
        return MAP_CODEC;
    }
}

@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerConditionalProperties(RegisterConditionalItemModelPropertyEvent event) {
    event.register(
        Identifier.fromNamespaceAndPath("examplemod", "bar_visible"),
        BarVisible.MAP_CODEC
    )
}
```

JSON 中把 `property` 设为 `examplemod:bar_visible`，并在 `on_true` 和 `on_false` 中分别提供模型即可。

## 特殊模型 {#special-models}

并非所有模型都能用基础模型 JSON 表示。有些模型具有动态组件，或复用为[`BlockEntityRenderer`][ber]创建的现有 `Model`。此时可使用特殊模型类型指定提交渲染的[特性][features]。这些对象称为 `SpecialModelRenderer`，定义在 `SpecialModelRenderers` 中。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
{
    "model": {
        "type": "minecraft:special",
        // 用于读取粒子纹理和显示变换的父模型
        "base": "minecraft:item/template_skull",
        "model": {
            "type": "minecraft:head",
            // `SkullSpecialRenderer.Unbaked` 定义的属性
            "kind": "wither_skeleton",
            "texture": "examplemod:heads/skeleton_override",
            "animation": 0.5
        }
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new SpecialModelWrapper.Unbaked(
            Identifier.fromNamespaceAndPath("minecraft", "item/template_skull"),
            new SkullSpecialRenderer.Unbaked(
                SkullBlock.Types.WITHER_SKELETON,
                Optional.of(Identifier.fromNamespaceAndPath("examplemod", "heads/skeleton_override")),
                0.5f
            )
        )
    );
}
```

</TabItem>
</Tabs>

创建自定义 `SpecialModelRenderer` 包含三部分：提交物品渲染[特性][features]的 `SpecialModelRenderer` 实例、用于 JSON 编解码的 `SpecialModelRenderer.Unbaked` 实例，以及把它注册为物品渲染器（必要时也注册为方块渲染器）。

`SpecialModelRenderer` 的工作方式类似其他渲染器。它应接收提交过程中使用的静态数据。需要注意 `extractArgument` 和 `submit` 两个方法。`extractArgument` 只从 `ItemStack` 提供 `submit` 所需的必要数据；不知道需要哪些数据时可直接返回 `ItemStack`，完全不需要数据时可使用 `NoDataSpecialModelRenderer`。`submit` 接收提取值、姿态栈、收集器、光照、覆盖纹理、附魔光效状态和轮廓颜色，所有特性提交都应在此发生。

```java
public record ExampleSpecialRenderer(SpriteGetter spriteGetter, Model.Simple model, SpriteId sprite) implements SpecialModelRenderer<Boolean> {

    @Nullable
    public Boolean extractArgument(ItemStack stack) {
        // 提取要使用的数据
        return stack.isBarVisible();
    }

    @Override
    public void submit(Boolean argument, PoseStack poseStack, SubmitNodeCollector collector, int lightCoords, int overlayCoords, boolean hasFoil, int outlineColor) {
        collector.submitModel(
            this.model, Unit.INSTANCE,
            poseStack, this.sprite.renderType(argument ? RenderType::entityCutout : RenderType::entitySolid),
            lightCoords, overlayCoords, -1, this.spriteGetter.get(this.sprite), outlineColor, null
        );
    }
}
```

`SpecialModelRenderer.Unbaked` 保存从文件读取、用于构造渲染器的数据，并通过 `bake` 构造渲染器、通过 `type` 提供编解码用 `MapCodec`：

```java
public record ExampleSpecialRenderer(SpriteGetter spriteGetter, Model.Simple model, SpriteId sprite) implements SpecialModelRenderer<Boolean> {

    // ...

    public record Unbaked(Identifier texture) implements SpecialModelRenderer.Unbaked {

        public static final MapCodec<ExampleSpecialRenderer.Unbaked> MAP_CODEC = Identifier.CODEC.fieldOf("texture")
            .xmap(ExampleSpecialRenderer.Unbaked::new, ExampleSpecialRenderer.Unbaked::texture);

        @Override
        public MapCodec<ExampleSpecialRenderer.Unbaked> type() {
            return MAP_CODEC;
        }

        @Override
        public SpecialModelRenderer<?> bake(SpecialModelRenderer.BakingContext ctx) {
            // 把资源位置解析为绝对纹理路径
            Identifier textureLoc = this.texture.withPath(path -> "textures/entity/" + path + ".png");
            // 取得模型和待渲染精灵
            return new ExampleSpecialRenderer(ctx.sprites(), ...);
        }
    }
}
```

最后注册对象。客户端物品渲染器通过[模组事件总线][modbus]上的 `RegisterSpecialModelRendererEvent` 注册。如果特殊渲染器还需要用于 `BlockEntityRenderer`（例如末影人拿着方块时渲染），还应通过 `RegisterBlockModelsEvent` 注册方块的 `Unbaked` 版本。

```java
@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerSpecialRenderers(RegisterSpecialModelRendererEvent event) {
    event.register(
        Identifier.fromNamespaceAndPath("examplemod", "example_special"),
        ExampleSpecialRenderer.Unbaked.MAP_CODEC
    );
}

@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerSpecialBlockRenderers(RegisterBlockModelsEvent event) {
    event.register(
        new SpecialBlockModelWrapper.Unbaked(
            new ExampleSpecialRenderer.Unbaked(Identifier.fromNamespaceAndPath("examplemod", "entity/example_special")),
            Optional.empty()
        ),
        EXAMPLE_BLOCK.get()
    );
}
```

```json5
{
    "model": {
        "type": "minecraft:special",
        "base": "minecraft:item/template_skull",
        "model": {
            "type": "examplemod:example_special",
            "texture": "examplemod:example/example_texture"
        }
    }
}
```

## 动态流体容器

NeoForge 添加了一个物品模型，用于构造动态流体容器，可在运行时重新着色以匹配所装流体。

:::note
要让流体颜色应用到流体纹理，物品必须附加 `Capabilities.FluidHandler.ITEM`。如果物品没有直接或间接使用 `BucketItem`，需要为它[注册该能力][capability]。
:::

```json5
{
    "model": {
        "type": "neoforge:fluid_container",
        // 构造容器使用的纹理，相对于 `textures` 目录
        "textures": {
            // 模型粒子精灵。未设置时依次使用流体静止纹理、容器基础纹理，
            // 以及未作为遮罩使用的容器覆盖纹理
            "particle": "minecraft:item/bucket",
            // 第一层纹理，通常是流体容器本身。未设置时不添加该层
            "base": "minecraft:item/bucket",
            // 流体静止纹理的遮罩，应使用纯白色表示可见流体
            "fluid": "neoforge:item/mask/bucket_fluid",
            // `cover_is_mask` 为 false 时是覆盖纹理，为 true 时是基础纹理遮罩
            "cover": "neoforge:item/mask/bucket_fluid_cover"
        },
        // 对密度小于等于 0 的流体把模型旋转 180 度。默认 false
        "flip_gas": true,
        // 把 cover 纹理用作 base 纹理遮罩。默认 true
        "cover_is_mask": true,
        // 对光照等级大于 0 的流体把流体层 lightmap 设为最大值。默认 true
        "apply_fluid_luminosity": false
    }
}
```

数据生成时使用 `DynamicFluidContainerModel.Unbaked`，纹理对应 `DynamicFluidContainerModel.Textures` 的四个 `Optional<Identifier>`，后续三个参数依次对应 `flip_gas`、`cover_is_mask` 和 `apply_fluid_luminosity`。

## 手动提交物品渲染 {#manually-rendering-an-item}

如果需要在 `BlockEntityRenderer` 或 `EntityRenderer` 中提交物品[特性][features]，可分三步完成。首先由渲染器创建 `ItemStackRenderState` 保存物品堆栈状态；然后由 `ItemModelResolver` 的某个方法用当前物品更新该状态；最后通过 `ItemStackRenderState#submit` 提交物品。

`ItemStackRenderState` 保存绘制所需数据。每个“模型”都有独立的 `ItemStackRenderState.LayerRenderState`，包含待渲染 `BakedQuad`、渲染类型、附魔光效状态、着色、动画标志、范围和特殊渲染器。层通过 `newLayer` 创建，用 `clear` 清除；图层数量固定时可用 `ensureCapacity` 保证有足够的 `LayerRenderState`。

:::note
[屏幕][screens]使用 `TrackingItemStackRenderState` 子类保存模型身份元素，以跨帧缓存渲染状态。
:::

`ItemModelResolver` 负责更新 `ItemStackRenderState`。生物持有的物品使用 `updateForLiving`，其他实体持有的物品使用 `updateForNonLiving`，其他情况使用 `updateForTopItem`。这些方法接收渲染状态、待渲染堆栈和当前显示上下文，其他参数描述手持侧、关卡、物品所有者和种子值。方法会先调用 `ItemStackRenderState#clear`，再对从 `DataComponents#ITEM_MODEL` 取得的 `ItemModel` 调用 `update`。不在渲染器上下文时，可通过 `Minecraft#getItemModelResolver` 取得 `ItemModelResolver`。

## 自定义物品模型定义

创建自定义 `ItemModel` 分为三部分：更新渲染状态的 `ItemModel` 实例、用于 JSON 编解码的 `ItemModel.Unbaked` 实例，以及注册 `ItemModel`。

:::warning
请先确认上文现有系统无法实现所需物品模型。大多数情况下不需要创建自定义 `ItemModel`。
:::

`ItemModel` 负责更新 `ItemStackRenderState`，让物品正确绘制。它接收提交过程中使用的静态数据（例如 `BakedQuad` 列表、属性信息等）。唯一方法 `update` 接收渲染状态、堆栈、模型解析器、显示上下文、关卡、物品所有者和种子值。只应修改 `ItemStackRenderState`，其余参数应视为只读。

```java
public record ExampleModelWrapper(QuadCollection quads, List<ItemTintSource> tints, ModelRenderProperties properties, Matrix4fc transformation) implements ItemModel {

    @Override
    public void update(ItemStackRenderState state, ItemStack stack, ItemModelResolver resolver, ItemDisplayContext displayContext, @Nullable ClientLevel level, @Nullable ItemOwner owner, int seed) {
        state.appendModelIdentityElement(this);
        ItemStackRenderState.LayerRenderState layerState = state.newLayer();

        if (stack.hasFoil()) {
            layerState.setFoilType(ItemStackRenderState.FoilType.STANDARD);
            state.appendModelIdentityElement(ItemStackRenderState.FoilType.STANDARD);
        }

        int tintSize = this.tints.size();
        int[] tintLayers = layerState.prepareTintLayers(tintSize);
        for (int idx = 0; idx < tintSize; idx++) {
            int tintColor = this.tints.get(idx).calculate(stack, level, owner.asLivingEntity());
            tintLayers[idx] = tintColor;
            state.appendModelIdentityElement(tintColor);
        }

        layerState.setExtents(CuboidItemModelWrapper.computeExtents(this.quads.getAll()));
        layerState.setLocalTransform(this.transformation);
        this.properties.applyToLayer(layerState, displayContext);
        layerState.prepareQuadList().addAll(this.quads.getAll());

        if (this.quads.hasMaterialFlag(BakedQuad.FLAG_ANIMATED)) {
            layerState.setAnimated();
        }
    }
}
```

`ItemModel.Unbaked` 保存从文件读取的数据，并提供 `bake` 和 `type`：

```java
public record ExampleModelWrapper(QuadCollection quads, List<ItemTintSource> tints, ModelRenderProperties properties, Matrix4fc transformation) implements ItemModel {

    // ...

    public record Unbaked(Identifier model, List<ItemTintSource> tints, Optional<Transformation> transformation) implements ItemModel.Unbaked {
        public static final MapCodec<ExampleModelWrapper.Unbaked> MAP_CODEC = RecordCodecBuilder.mapCodec(instance ->
            instance.group(
                Identifier.CODEC.fieldOf("model").forGetter(ExampleModelWrapper.Unbaked::model),
                ItemTintSources.CODEC.listOf().optionalFieldOf("tints", List.of()).forGetter(ExampleModelWrapper.Unbaked::tints),
                Transformation.EXTENDED_CODEC.optionalFieldOf("transformation").forGetter(ExampleModelWrapper.Unbaked::transformation)
            ).apply(instance, ExampleModelWrapper.Unbaked::new)
        );

        @Override
        public void resolveDependencies(ResolvableModel.Resolver resolver) {
            resolver.markDependency(this.model);
        }

        @Override
        public ItemModel bake(ItemModel.BakingContext context, Matrix4fc parentTransform) {
            ModelBaker baker = context.blockModelBaker();
            ResolvedModel resolvedModel = baker.getModel(this.model);
            TextureSlots slots = resolvedModel.getTopTextureSlots();
            return new ExampleModelWrapper(
                resolvedModel.bakeTopGeometry(slots, baker, BlockModelRotation.IDENTITY),
                this.tints,
                ModelRenderProperties.fromResolvedModel(baker, resolvedModel, slots),
                Transformation.compose(parentTransform, this.transformation)
            );
        }

        @Override
        public MapCodec<ExampleModelWrapper.Unbaked> type() {
            return MAP_CODEC;
        }
    }
}
```

通过[模组事件总线][modbus]上的 `RegisterItemModelsEvent` 注册 map codec：

```java
@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerItemModels(RegisterItemModelsEvent event) {
    event.register(
        Identifier.fromNamespaceAndPath("examplemod", "render_type"),
        ExampleModelWrapper.Unbaked.MAP_CODEC
    )
}
```

之后即可在 JSON 或数据生成中使用：

```json5
{
    "model": {
        "type": "examplemod:render_type",
        "model": "examplemod:item/example_item",
        "tints": []
    }
}
```

```java
@Override
protected void registerModels(BlockModelGenerators blockModels, ItemModelGenerators itemModels) {
    itemModels.itemModelOutput.accept(
        EXAMPLE_ITEM.get(),
        new ExampleModelWrapper.Unbaked(
            ModelLocationUtils.getModelLocation(EXAMPLE_ITEM.get()),
            List.of(),
            Optional.empty()
        )
    );
}
```

[assets]: ../../index.md#assets
[ber]: ../../../blockentities/ber.md
[capability]: ../../../inventories/capabilities.md#registering-capabilities
[composite]: modelloaders.md#composite-model
[features]: ../../../rendering/feature.md
[itemmodel]: #manually-rendering-an-item
[modbus]: ../../../concepts/events.md#event-buses
[models]: modelsystem.md
[rl]: ../../../misc/identifier.md
[screens]: ../../../rendering/screens.md#items
