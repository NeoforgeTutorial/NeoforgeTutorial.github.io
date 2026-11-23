# 内置数据映射

NeoForge 为常见场景提供了多种内置[数据映射][datamap]，用来替代硬编码的原版字段。原版值由 NeoForge 中的数据映射文件提供，因此对玩家而言没有功能差异。

## `neoforge:acceptable_villager_distances`

用于配置村民发现实体的最大方块距离，替代 `VillagerHostilesSensor.ACCEPTABLE_DISTANCE_FROM_HOSTILES`（在 26.2 中将不再使用）。该数据映射位于 `neoforge/data_maps/entity_type/acceptable_villager_distances.json`，其对象结构如下：

```json5
{
    // 村民将该实体视为敌对实体的最大方块距离
    "acceptable_villager_distance": 4.0
}
```

示例：

```json5
{
    "values": {
        // 烈焰人距离村民 4 格以内时，村民会将其视为敌对实体
        "minecraft:blaze": {
            "acceptable_villager_distance": 4.0
        }
    }
}
```

## `neoforge:compostables`

用于配置堆肥桶数值，替代 `ComposterBlock.COMPOSTABLES`（现已不再使用）。该数据映射位于 `neoforge/data_maps/item/compostables.json`，其对象结构如下：

```json5
{
    // 0 到 1（含两端）的 float，表示物品提升堆肥桶层数的概率
    "chance": 1,
    // 可选，默认 false：村民农民能否堆肥该物品
    "can_villager_compost": false
}
```

示例：

```json5
{
    "values": {
        // 金合欢原木有 50% 概率提升堆肥桶层数
        "minecraft:acacia_log": {
            "chance": 0.5
        }
    }
}
```

## `neoforge:furnace_fuels`

用于配置物品的燃烧时间。该数据映射位于 `neoforge/data_maps/item/furnace_fuels.json`，其对象结构如下：

```json5
{
    // 正整数，表示物品燃烧时间，单位为 tick
    "burn_time": 1000
}
```

示例：

```json5
{
    "values": {
        // 铁砧燃烧 2 秒
        "minecraft:anvil": {
            "burn_time": 40
        }
    }
}
```

:::info
NeoForge 还添加了 `IItemExtension#getBurnTime` 方法，可在自定义物品中重写并覆盖此数据映射。只有在数据映射不够用时才应使用 `#getBurnTime`，例如燃烧时间依赖[数据组件][datacomponent]的情况。
:::

:::warning
原版为 `#minecraft:logs` 和 `#minecraft:planks` 隐式添加了 300 tick（15 秒）的燃烧时间，然后硬编码移除了绯红木与诡异木物品。这意味着如果你添加另一种不可燃木材，应像下面这样从该映射中移除该木材的物品：

```json5
{
    "replace": false,
    "values": [
        // 此处填值
    ],
    "remove": [
        "examplemod:example_nether_wood_planks",
        "#examplemod:example_nether_wood_stems",
        "examplemod:example_nether_wood_door",
        // 等等。
        // 其他要移除的值
    ]
}
```
:::

## `neoforge:monster_room_mobs`

用于配置怪物房间刷怪笼中可能生成的生物，替代 `MonsterRoomFeature#MOBS`（现已不再使用）。该数据映射位于 `neoforge/data_maps/entity_type/monster_room_mobs.json`，其对象结构如下：

```json5
{
    // 该生物相对于数据映射中其他生物的权重
    "weight": 100
}
```

示例：

```json5
{
    "values": {
        // 让鱿鱼以 100 的权重出现在怪物房间刷怪笼中
        "minecraft:squid": {
            "weight": 100
        }
    }
}
```

## `neoforge:oxidizables`

用于配置氧化阶段，替代 `WeatheringCopper#NEXT_BY_BLOCK`。该数据映射还用于构建反向的除氧化映射（用斧头刮除）。它位于 `neoforge/data_maps/block/oxidizables.json`，其对象结构如下：

```json5
{
    // 该方块氧化后变成的方块
    "next_oxidation_stage": "examplemod:oxidized_block"
}
```

:::note
自定义方块必须实现 `WeatheringCopperFullBlock` 或 `WeatheringCopper`，并在 `randomTick` 中调用 `changeOverTime`，才能自然氧化。
:::

示例：

```json5
{
    "values": {
        "mymod:custom_copper": {
            // 让自定义铜块氧化成自定义氧化铜块
            "next_oxidation_stage": "mymod:custom_oxidized_copper"
        }
    }
}
```

## `neoforge:parrot_imitations`

用于配置鹦鹉模仿生物时发出的声音，替代 `Parrot#MOB_SOUND_MAP`（现已不再使用）。该数据映射位于 `neoforge/data_maps/entity_type/parrot_imitations.json`，其对象结构如下：

```json5
{
    // 鹦鹉模仿该生物时发出声音的 ID
    "sound": "minecraft:entity.parrot.imitate.creeper"
}
```

示例：

```json5
{
    "values": {
        // 让鹦鹉模仿悦灵时发出洞穴环境音
        "minecraft:allay": {
            "sound": "minecraft:ambient.cave"
        }
    }
}
```

## `neoforge:raid_hero_gifts` {#neoforgeraid_hero_gifts}

用于配置具有特定 `VillagerProfession` 的村民在你阻止袭击后可能赠送的礼物，替代 `GiveGiftToHero#GIFTS`（现已不再使用）。该数据映射位于 `neoforge/data_maps/villager_profession/raid_hero_gifts.json`，其对象结构如下：

```json5
{
    // 村民职业在袭击后发放的战利品表 ID
    "loot_table": "minecraft:gameplay/hero_of_the_village/armorer_gift"
}
```

示例：

```json5
{
    "values": {
        "minecraft:armorer": {
            // 让盔甲匠给袭击英雄发放盔甲匠礼物战利品表
            "loot_table": "minecraft:gameplay/hero_of_the_village/armorer_gift"
        }
    }
}
```

## `neoforge:strippables`

用于配置方块被去皮后变成的方块（用斧头或带有 `ItemAbilities#AXE_STRIP` 物品能力的物品右击），替代 `AxeItem#STRIPPABLES`（在 26.2 中将不再使用）。该数据映射位于 `neoforge/data_maps/block/strippables.json`，其对象结构如下：

```json5
{
    // 使用具有 `ItemAbilities#AXE_STRIP` 物品能力的工具去皮后，该方块变成的方块
    "stripped_block": "examplemod:stripped_wood"
}
```

示例：

```json5
{
    "values": {
        "examplemod:wood": {
            // 让自定义木方块去皮成自定义去皮木方块
            "stripped_block": "examplemod:stripped_wood"
        }
    }
}
```

## `neoforge:vibration_frequencies`

用于配置游戏事件发出的幽匿振动频率，替代 `VibrationSystem#VIBRATION_FREQUENCY_FOR_EVENT`（现已不再使用）。该数据映射位于 `neoforge/data_maps/game_event/vibration_frequencies.json`，其对象结构如下：

```json5
{
    // 1 到 15（含两端）的整数，表示该事件的振动频率
    "frequency": 2
}
```

示例：

```json5
{
    "values": {
        // 让入水游戏事件以第二频率振动
        "minecraft:splash": {
            "frequency": 2
        }
    }
}
```

## `neoforge:villager_types`

用于配置基于生物群系生成的村民类型，替代 `VillagerType#BY_BIOME`（在 26.2 中将不再使用）。它位于 `neoforge/data_maps/worldgen/biome/villager_types.json`，其对象结构如下：

```json5
{
    // 在该生物群系生成的村民类型
    // 如果生物群系没有指定村民类型，则使用 `minecraft:plains`
    "villager_type": "minecraft:desert"
    
}
```

示例：

```json5
{
    "values": {
        // 让丛林生物群系中的村民属于沙漠类型
        "minecraft:jungle": {
            "villager_type": "minecraft:desert"
        }
    }
}
```

## `neoforge:waxables`

用于配置方块涂蜡后变成的方块（用蜜脾右击），替代 `HoneycombItem#WAXABLES`。该数据映射还用于构建反向的脱蜡映射（用斧头刮除）。它位于 `neoforge/data_maps/block/waxables.json`，其对象结构如下：

```json5
{
    // 该方块的涂蜡变体
    "waxed": "minecraft:iron_block"
}
```

示例：

```json5
{
    "values": {
        // 让金块涂蜡后变成铁块
        "minecraft:gold_block": {
            "waxed": "minecraft:iron_block"
        }
    }
}
```

[datacomponent]: ../../../items/datacomponents.md
[datamap]: index.md
