import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 内置魔咒效果组件

原版 Minecraft 为[魔咒]定义提供多种魔咒效果组件。本文说明各类组件、用途和代码定义。

## 数值效果组件

_另见 [Minecraft Wiki][Value Effect Components]。_

数值效果组件由 `EnchantmentValueEffect` 实现，用于修改游戏中的数值。多个效果组件会依次作用。支持操作：

- `minecraft:set`：覆盖基于等级的值。
- `minecraft:add`：加上基于等级的值。
- `minecraft:all_of`：按列表顺序应用多个效果。
- `minecraft:multiply`：乘以基于等级的系数。
- `minecraft:remove_binomial`：按二项分布检查等级相关概率，成功时减 1。
- `minecraft:exponential`：计算“基于等级”的底数的“基于等级”次幂，再乘旧值。

锋利使用 `minecraft:damage` 的 JSON 示例：

```json5
"effects": {
    "minecraft:damage": [
        {
            "effect": {
                "type": "minecraft:add",
                "value": {
                    "type": "minecraft:linear",
                    "base": 1.0,
                    "per_level_above_first": 0.5
                }
            }
        }
    ]
}
```

数据生成对应写法：

```java
DataComponentMap.builder().set(
    EnchantmentEffectComponents.DAMAGE,
    List.of(new ConditionalEffect<>(
        new AddValue(LevelBasedValue.perLevel(1.0F, 0.5F)),
        Optional.empty()))
).build()
```

`value` 是 [`LevelBasedValue`]，可随等级改变强度。代码中可用：

```java
float modifiedValue = valueEffect.process(enchantLevel, server.random, baseValue);
```

### 原版数值效果组件

类型为 `DataComponentType<EnchantmentValueEffect>`：

- `minecraft:crossbow_charge_time`：弩蓄力时间，快速装填使用。
- `minecraft:trident_spin_attack_strength`：三叉戟旋转攻击强度，激流使用。

类型为 `DataComponentType<List<ConditionalEffect<EnchantmentValueEffect>>>`：

- 盔甲：`minecraft:armor_effectiveness`（破甲）、`minecraft:damage_protection`（爆炸保护、摔落缓冲、火焰保护、保护、弹射物保护）。
- 攻击：`minecraft:damage`（锋利、穿刺、节肢杀手、力量、亡灵杀手）、`minecraft:smash_damage_per_fallen_block`（密度）、`minecraft:knockback`（击退、冲击）、`minecraft:mob_experience`（未使用）。
- 耐久：`minecraft:item_damage`（耐久）、`minecraft:repair_with_xp`（经验修补）。
- 投射物：`minecraft:ammo_use`（无限）、`minecraft:projectile_piercing`（穿透）、`minecraft:projectile_count`（多重射击）、`minecraft:projectile_spread`（多重射击）、`minecraft:trident_return_acceleration`（忠诚）。
- 其他：`minecraft:block_experience`（精准采集）、`minecraft:fishing_time_reduction`（饵钓）、`minecraft:fishing_luck_bonus`（海之眷顾）。

类型为 `DataComponentType<List<TargetedConditionalEffect<EnchantmentValueEffect>>>`：

- `minecraft:equipment_drops`：抢夺，修改击杀实体的装备掉落概率。

## 基于位置的效果组件

_另见 [Minecraft Wiki][Location Based Effect Components]。_

此类组件实现 `EnchantmentLocationBasedEffect`。它们使用 `EnchantmentEntityEffect#onChangedBlock`（装备时及持有者方块位置变化时）和 `onDeactivate`（卸下物品时）。

属性效果示例：

```json5
"minecraft:attributes": [
    {
        "amount": {
            "type": "minecraft:linear",
            "base": 1,
            "per_level_above_first": 1
        },
        "attribute": "minecraft:scale",
        "id": "examplemod:enchantment.size_change",
        "operation": "add_value"
    }
]
```

数据生成：

```java
DataComponentMap.builder().set(
    EnchantmentEffectComponents.ATTRIBUTES,
    List.of(new EnchantmentAttributeEffect(
        Identifier.fromNamespaceAndPath("examplemod", "enchantment.size_change"),
        Attributes.SCALE,
        LevelBasedValue.perLevel(1F, 1F),
        AttributeModifier.Operation.ADD_VALUE
    ))
).build()
```

原版基于位置的事件包括：`all_of`、`apply_mob_effect`、`attribute`、`change_item_damage`、`damage_entity`、`explode`、`ignite`、`apply_impulse`、`apply_exhaustion`、`play_sound`、`replace_block`、`replace_disk`、`run_function`、`set_block_properties`、`spawn_particles`、`summon_entity`。

### 原版基于位置效果组件

- `DataComponentType<List<ConditionalEffect<EnchantmentLocationBasedEffect>>>`：`minecraft:location_changed`，冰霜行者、灵魂疾行使用。
- `DataComponentType<List<EnchantmentAttributeEffect>>`：`minecraft:attributes`，应用属性修饰符并在卸下时移除。

## 实体效果组件

_另见 [Minecraft Wiki][Entity Effect Components]。_

实体效果组件实现 `EnchantmentEntityEffect`（`EnchantmentLocationBasedEffect` 的子类型）。它们重写 `onChangedBlock` 来运行 `apply`，具体组件也可能在其他代码位置直接调用 `apply`。除仅注册为位置效果的 `minecraft:attribute` 外，所有位置效果都可作为实体效果。

火焰附加示例：

```json5
"minecraft:post_attack": [
    {
        "affected": "victim",
        "effect": {
            "type": "minecraft:ignite",
            "duration": {
                "type": "minecraft:linear",
                "base": 4.0,
                "per_level_above_first": 4.0
            }
        },
        "enchanted": "attacker",
        "requirements": {
            "condition": "minecraft:damage_source_properties",
            "predicate": {
                "is_direct": true
            }
        }
    }
]
```

数据生成：

```java
DataComponentMap.builder().set(
    EnchantmentEffectComponents.POST_ATTACK,
    List.of(new TargetedConditionalEffect<>(
        EnchantmentTarget.ATTACKER,
        EnchantmentTarget.VICTIM,
        new Ignite(LevelBasedValue.perLevel(4.0F, 4.0F)),
        Optional.of(new DamageSourceCondition(Optional.of(new DamageSourcePredicate(
            List.of(), Optional.empty(), Optional.empty(), Optional.of(true)
        ))))
    ))
).build()
```

### 原版实体效果组件

- `DataComponentType<List<ConditionalEffect<EnchantmentEntityEffect>>>`：`post_piercing_attack`（突进）、`hit_block`（引雷）、`tick`（灵魂疾行）、`projectile_spawned`（火矢）。
- `DataComponentType<List<TargetedConditionalEffect<EnchantmentEntityEffect>>>`：`post_attack`（节肢杀手、引雷、火焰附加、荆棘、风爆）。

## 其他原版组件

- `DataComponentType<List<ConditionalEffect<DamageImmunity>>>`：`minecraft:damage_immunity`（冰霜行者）。
- `DataComponentType<Unit>`：`prevent_equipment_drop`（消失诅咒）、`prevent_armor_change`（绑定诅咒）。
- `DataComponentType<List<CrossbowItem.ChargingSounds>>`：`crossbow_charge_sounds`。
- `DataComponentType<List<Holder<SoundEvent>>>`：`trident_sound`。

[enchantment]: index.md
[Value Effect Components]: https://minecraft.wiki/w/Enchantment_definition#Components_with_value_effects
[Entity Effect Components]: https://minecraft.wiki/w/Enchantment_definition#Components_with_entity_effects
[Location Based Effect Components]: https://minecraft.wiki/w/Enchantment_definition#location_changed
[LevelBasedValue]: ../loottables/index.md#number-provider
