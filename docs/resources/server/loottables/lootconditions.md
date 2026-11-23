# 战利品条件

战利品条件检查[战利品条目][entry]或[战利品池][pool]是否应在当前上下文使用。条件列表全部通过时才使用。数据生成时通过 `#when` 添加条件。自定义条件见[自定义战利品条件][custom]。

## 原版条件

- `minecraft:inverted`：反转另一条件；JSON 使用 `term`。
- `minecraft:all_of`：全部子条件通过；空列表为 false。
- `minecraft:any_of`：至少一个子条件通过；空列表为 false。
- `minecraft:random_chance`：按 [数值提供器][numberprovider]给出的 0 到 1 概率随机通过。
- `minecraft:random_chance_with_enchanted_bonus`：按攻击实体指定魔咒等级取值；没有魔咒或等级时使用固定回退概率。
- `minecraft:value_check`：数值提供器结果落在 `IntRange` 内时通过。
- `minecraft:time_check`：指定 `WorldClock` 的时间在范围内；`period` 可先把时间取模，如 24000 tick 为一天。
- `minecraft:weather_check`：检查下雨和雷暴状态。
- `minecraft:location_check`：用 `LocationPredicate` 检查位置、方块/流体、维度、生物群系、结构、光照等，并可设置三轴偏移。
- `minecraft:block_state_property`：检查被破坏方块的属性。
- `minecraft:survives_explosion`：掉落物保留概率为 `1 / explosion_radius`；参数缺失时总是通过。
- `minecraft:match_tool`：用 `ItemPredicate` 检查 `tool` 参数。
- `minecraft:enchantment_active`：检查魔咒是否生效。
- `minecraft:table_bonus`：按附魔等级在固定概率表中取概率。
- `minecraft:entity_properties`：用 `EntityPredicate` 检查指定实体目标。
- `minecraft:damage_source_properties`：用 `DamageSourcePredicate` 检查伤害来源。
- `minecraft:killed_by_player`：检查最后一次伤害是否来自玩家。
- `minecraft:entity_scores`：检查实体目标的计分板分数。
- `minecraft:reference`：引用 `data/<namespace>/predicate/<path>.json` 谓词文件。
- `minecraft:environment_attribute_check`：检查环境属性值；位置相关属性需要 `minecraft:origin`。

NeoForge 额外条件：

- `neoforge:loot_table_id`：只在指定战利品表 ID 中通过。
- `neoforge:can_item_perform_ability`：`tool` 参数中的物品具有指定 `ItemAbility` 时通过。

### `neoforge:loot_table_id` {#neoforgeloot_table_id}

只在指定战利品表 ID 中通过，常用于全局战利品修改器。

常用 JSON 示例：

```json5
{
    "condition": "minecraft:random_chance",
    "chance": 0.5
}
```

```json5
{
    "condition": "minecraft:weather_check",
    "raining": true,
    "thundering": false
}
```

```json5
{
    "condition": "minecraft:block_state_property",
    "block": "minecraft:oak_slab",
    "properties": {
        "type": "top"
    }
}
```

```json5
{
    "condition": "neoforge:loot_table_id",
    "loot_table_id": "minecraft:blocks/dirt"
}
```

数据生成常用构造方法：`InvertedLootItemCondition#invert`、`AllOfCondition#allOf`、`AnyOfCondition#anyOf`、`LootItemRandomChanceCondition#randomChance`、`ValueCheckCondition#hasValue`、`TimeCheck#time`、`WeatherCheck#weather`、`LocationCheck#checkLocation`、`LootItemBlockStatePropertyCondition#hasBlockStateProperties`、`ExplosionCondition#survivesExplosion`、`MatchTool#toolMatches`、`EnchantmentActiveCheck#enchantmentActiveCheck`、`BonusLevelTableCondition#bonusLevelFlatChance`、`LootItemEntityPropertyCondition#hasProperties`、`DamageSourceCondition#hasDamageSource`、`LootItemKilledByPlayerCondition#killedByPlayer`、`EntityHasScoreCondition#hasScores`、`ConditionReference#conditionReference`、`EnvironmentAttributeCheck#environmentAttribute`、`LootTableIdCondition#builder`、`CanItemPerformAbility#canItemPerformAbility`。

[custom]: custom.md#custom-loot-conditions
[entitytarget]: index.md#entity-targets
[entry]: index.md#loot-entry
[glm]: glm.md
[itemability]: ../../../items/tools.md#itemabilitys
[numberprovider]: index.md#number-provider
[pool]: index.md#loot-pool
[predicate]: https://minecraft.wiki/w/Predicate
[registry]: ../../../concepts/registries.md
