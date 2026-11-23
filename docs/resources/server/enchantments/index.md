import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 魔咒

魔咒是可应用到工具及其他物品的特殊效果。自 1.21 起，魔咒以[数据组件]形式保存在物品上，由 JSON 定义，并由多个魔咒效果组件组成。物品上的魔咒保存在 `DataComponents.ENCHANTMENTS` 的 `ItemEnchantments` 实例中。

在命名空间的 `enchantment` 数据包子文件夹中创建 JSON 即可添加魔咒。例如 `examplemod:example_enchant` 位于 `data/examplemod/enchantment/example_enchantment.json`。

## 魔咒 JSON 格式

```json5
{
    // 游戏内名称文本组件，可使用翻译键
    "description": {
        "translate": "enchantment.examplemod.enchant_name"
    },
    // 可应用此魔咒的物品：物品 ID、物品 ID 列表或物品标签
    "supported_items": "#examplemod:enchantable/enchant_name",
    // 可选，附魔台或魔咒提供器中作为主物品显示的物品。
    // 若要在附魔台出现，还须加入 `minecraft:in_enchanting_table`
    "primary_items": [
        "examplemod:item_a",
        "examplemod:item_b"
    ],
    // 可选，不兼容魔咒：ID、列表或标签
    "exclusive_set": "#examplemod:exclusive_to_enchant_name",
    // 附魔台出现概率权重，范围 [1, 1024]
    "weight": 6,
    // 最高等级，范围 [1, 255]
    "max_level": 3,
    // 最大附魔能力消耗
    "max_cost": {
        "base": 45,
        "per_level_above_first": 9
    },
    // 最小附魔能力消耗
    "min_cost": {
        "base": 2,
        "per_level_above_first": 8
    },
    // 铁砧修理增加的成本，会乘以魔咒等级
    "anvil_cost": 2,
    // 可选，生效的装备槽组
    "slots": [
        "mainhand"
    ],
    // 魔咒效果组件，具体见下文
    "effects": {
        "examplemod:custom_effect": [
            {
                "effect": {
                    "type": "minecraft:add",
                    "value": {
                        "type": "minecraft:linear",
                        "base": 1,
                        "per_level_above_first": 1
                    }
                }
            }
        ]
    }
}
```

### 成本与等级

附魔台先计算周围方块提供的附魔能力，再调用 `EnchantmentHelper#getEnchantmentCost` 得到基础等级。物品可附魔性 `e` 会随机调整等级：

`修改等级 = 基础等级 + random.nextInt(e / 4 + 1) + random.nextInt(e / 4 + 1)`

随后随机上下调整 15%，最终值必须落在魔咒的 `min_cost` 与 `max_cost` 之间。因此成本经常高于 30；例如可附魔性为 10 的物品最高可达到 `1.15 * (30 + 2 * (10 / 4) + 1) = 40`。

## 魔咒效果组件

魔咒效果组件是特殊注册的[数据组件]，定义魔咒行为：组件类型决定效果种类，组件数据用于参数化效果。例如 `minecraft:damage` 控制武器伤害。原版所有魔咒都由[内置魔咒效果组件]实现。

### 自定义魔咒效果组件

效果逻辑完全由创建者实现。先定义保存效果数据的类或 record：

```java
public record Increment(int value) {
    public static final Codec<Increment> CODEC = RecordCodecBuilder.create(instance ->
            instance.group(
                    Codec.INT.fieldOf("value").forGetter(Increment::value)
            ).apply(instance, Increment::new)
    );

    public int add(int x) {
        return value() + x;
    }
}
```

把效果组件类型注册到 `BuiltInRegistries.ENCHANTMENT_EFFECT_COMPONENT_TYPE`：

```java
public static final DeferredRegister.DataComponents ENCHANTMENT_COMPONENT_TYPES =
    DeferredRegister.createDataComponents(BuiltInRegistries.ENCHANTMENT_EFFECT_COMPONENT_TYPE, "examplemod");

public static final Supplier<DataComponentType<Increment>> INCREMENT =
    ENCHANTMENT_COMPONENT_TYPES.registerComponentType(
        "increment",
        builder -> builder.persistent(Increment.CODEC)
    );
```

遍历物品魔咒并应用效果：

```java
AtomicInteger atomicValue = new AtomicInteger(value);

EnchantmentHelper.runIterationOnItem(stack, (enchantmentHolder, enchantLevel) -> {
    Increment increment = enchantmentHolder.value().effects().get(INCREMENT.get());
    if (increment != null) {
        atomicValue.set(increment.add(atomicValue.get()));
    }
});

int modifiedValue = atomicValue.get();
```

`runIterationOnItem` 会对物品的每个魔咒调用 `EnchantmentHelper.EnchantmentVisitor`。多个相同效果组件会叠加。

### `ConditionalEffect`

`ConditionalEffect<?>` 允许效果根据 [LootContext] 条件生效。`ConditionalEffect#matches` 判断条件；`Enchantment#applyEffects` 接收 `List<ConditionalEffect<T>>`，对条件通过的元素运行 `Consumer<T>`：

```java
enchant.applyEffects(
    enchant.getEffects(EnchantmentEffectComponents.KNOCKBACK),
    lootContext,
    effectData -> {
        // 使用 effectData
    }
);
```

注册条件效果组件：

```java
public static final DeferredHolder<DataComponentType<?>, DataComponentType<ConditionalEffect<Increment>>> CONDITIONAL_INCREMENT =
    ENCHANTMENT_COMPONENT_TYPES.register("conditional_increment",
        () -> DataComponentType.ConditionalEffect.<Increment>builder()
            .persistent(ConditionalEffect.codec(Increment.CODEC, LootContextParamSets.ENCHANTED_DAMAGE))
            .build());
```

`ContextKeySet` 取决于效果需要哪些上下文，例如 `ENCHANTED_DAMAGE`、`ENCHANTED_ITEM`、`ENCHANTED_LOCATION`、`ENCHANTED_ENTITY` 或 `HIT_BLOCK`。

## 魔咒数据生成

通过 `GatherDataEvent#createDatapackRegistryObjects` 把 `RegistrySetBuilder` 传给 `DatapackBuiltinEntriesProvider`，即可生成魔咒 JSON 到 `src/generated/data/<modid>/enchantment/<path>.json`。

<Tabs>
<TabItem value="datagen" label="数据生成">

```java
RegistrySetBuilder BUILDER = new RegistrySetBuilder();
BUILDER.add(
    Registries.ENCHANTMENT,
    bootstrap -> bootstrap.register(
        ResourceKey.create(
            Registries.ENCHANTMENT,
            Identifier.fromNamespaceAndPath("examplemod", "example_enchantment")
        ),
        new Enchantment(
            Component.literal("Example Enchantment"),
            new Enchantment.EnchantmentDefinition(
                HolderSet.direct(...),
                Optional.empty(),
                30,
                3,
                Enchantment.dynamicCost(3, 1),
                Enchantment.dynamicCost(4, 2),
                2,
                List.of(EquipmentSlotGroup.ANY)
            ),
            HolderSet.empty(),
            DataComponentMap.builder()
                .set(MY_ENCHANTMENT_EFFECT_COMPONENT_TYPE, new ExampleData())
                .build()
        )
    )
);
```

</TabItem>
<TabItem value="json" label="JSON">

```json5
{
    "anvil_cost": 2,
    "description": "Example Enchantment",
    "effects": {
    },
    "max_cost": {
        "base": 4,
        "per_level_above_first": 2
    },
    "max_level": 3,
    "min_cost": {
        "base": 3,
        "per_level_above_first": 1
    },
    "slots": ["any"],
    "supported_items": "examplemod:example_item",
    "weight": 30
}
```

</TabItem>
</Tabs>

[Data Components]: ../../../items/datacomponents.md
[Codec]: ../../../datastorage/codecs.md
[registered]: ../../../concepts/registries.md
[data generation]: ../../index.md#data-generation
[built-in enchantment effect components]: builtin.md
[LootContext]: ../loottables/index.md#loot-context
