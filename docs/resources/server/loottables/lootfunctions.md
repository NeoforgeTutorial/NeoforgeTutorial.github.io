# 战利品函数

战利品函数按顺序修改[战利品条目][entry]、[战利品池][pool]或[战利品表][table]的结果。数据生成时可用 `#apply` 添加。自定义函数见[自定义战利品函数][custom]。

除 `minecraft:sequence` 外，原版函数都可用 `conditions` 指定[战利品条件][conditions]；条件失败时不执行。战利品函数不能应用到复合战利品条目，必须分别加到每个单例条目。

## 原版函数

- `minecraft:set_item`：替换物品。
- `minecraft:set_count`：设置数量。
- `minecraft:explosion_decay`：应用爆炸衰减。
- `minecraft:limit_count`：限制数量范围。
- `minecraft:set_custom_data`：写入自定义数据。
- `minecraft:copy_custom_data`：复制实体或方块实体数据。
- `minecraft:set_components`：设置数据组件。
- `minecraft:copy_components`：复制数据组件。
- `minecraft:copy_state`：把方块状态属性复制到数据组件。
- `minecraft:set_contents`、`minecraft:modify_contents`：设置或修改容器内容。
- `minecraft:set_loot_table`：设置容器使用的战利品表。
- `minecraft:set_name`、`minecraft:copy_name`：设置或复制名称。
- `minecraft:set_lore`：设置描述文本。
- `minecraft:toggle_tooltips`：显示或隐藏提示框内容。
- `minecraft:enchant_with_levels`、`minecraft:enchant_randomly`、`minecraft:set_enchantments`：随机或指定魔咒。
- `minecraft:enchanted_count_increase`：按魔咒等级增加数量。
- `minecraft:apply_bonus`：应用原版加值公式。
- `minecraft:furnace_smelt`：替换为熔炉产物。
- `minecraft:set_damage`：设置耐久比例。
- `minecraft:set_attributes`：设置属性修饰符。
- `minecraft:set_potion`、`minecraft:set_random_potion`：设置或随机选择药水。
- `minecraft:set_random_dyes`：随机设置染料颜色。
- `minecraft:set_stew_effect`：设置炖菜效果。
- `minecraft:set_ominous_bottle_amplifier`：设置不祥之瓶强度。
- `minecraft:exploration_map`：创建探险家地图。
- `minecraft:fill_player_head`：填充玩家头颅拥有者。
- `minecraft:set_banner_pattern`：设置旗帜图案。
- `minecraft:set_instrument`：设置 goat horn 乐器。
- `minecraft:set_fireworks`、`minecraft:set_firework_explosion`：设置烟花属性。
- `minecraft:set_book_cover`、`set_written_book_pages`、`set_writable_book_pages`：设置书内容。
- `minecraft:set_custom_model_data`：设置物品模型数据。
- `minecraft:filtered`：按条件选择函数。
- `minecraft:reference`：引用谓词或函数文件。
- `minecraft:sequence`：按顺序应用函数，不直接支持普通条件。
- `minecraft:discard`：丢弃结果。

通用结构示例：

```json5
{
    "function": "minecraft:set_count",
    "conditions": [],
    "count": {
        "type": "minecraft:uniform",
        "min": 1,
        "max": 3
    }
}
```

数据生成时，在 builder 上调用 `#apply`，例如 `LootItem.lootTableItem(Items.DIRT).apply(SetItemCountFunction.setCount(ConstantValue.exactly(2)))`。

[entry]: index.md#loot-entry
[pool]: index.md#loot-pool
[table]: index.md#loot-table
[custom]: custom.md#custom-loot-functions
[conditions]: lootconditions.md
