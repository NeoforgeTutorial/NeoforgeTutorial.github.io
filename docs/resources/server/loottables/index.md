# 战利品表

战利品表定义随机掉落，掷取后返回一组可能为空的物品堆栈。文件位于 `data/<mod_id>/loot_table/<name>.json`。方块、实体、箱子、钓鱼等都会使用战利品表；方块默认使用 `<namespace>:blocks/<name>`，实体默认使用 `<namespace>:entities/<name>`。交易礼物使用 [`neoforge:raid_hero_gifts` 数据映射][raidherogifts]，其他战利品表可通过 `reloadableRegistries().getLootTable(key)` 获取。

:::warning
通常只为自己的内容创建战利品表；修改现有战利品表应使用[全局战利品修改器][glm]。
:::

## 战利品条目 {#loot-entry}

战利品条目由 `LootPoolEntryContainer` 表示，分为单例条目（`LootPoolSingletonContainer`）和复合条目（`CompositeEntryBase`）。

原版单例类型：

- `minecraft:empty`：空条目。
- `minecraft:item`：掉落指定物品，可再用函数设置数量、数据组件等。
- `minecraft:tag`：掉落标签内物品；`expand` 为 true 时每个物品分别成为条目，否则所有物品作为一个条目。
- `minecraft:slots`：引用容器槽位，支持 `slot_range` 和 `contents` 来源。
- `minecraft:dynamic`：由代码注册的动态掉落。
- `minecraft:loot_table`：掷取另一个战利品表。

复合类型：

- `minecraft:group`：按顺序运行全部子条目。
- `minecraft:sequence`：遇到失败条目后停止。
- `minecraft:alternatives`：遇到成功条目后停止。

所有条目可通过 `conditions` 添加[战利品条件][lootcondition]。单例条目还支持：

- `weight`：权重，默认 1。
- `quality`：质量，默认 0，会按幸运值影响权重。
- `functions`：应用到输出上的[战利品函数][lootfunction]。

模组可实现[自定义战利品条目][customentry]。

## 战利品池 {#loot-pool}

战利品池是一组独立掷取的条目，支持：

- `entries`：条目列表。
- `conditions`：池条件。
- `functions`：应用到池输出的函数。
- `rolls`、`bonus_rolls`：掷取次数为 `rolls + bonus_rolls * luck`。
- `name`：NeoForge 添加的池名称，可供 GLM 使用。

## 数值提供器 {#number-provider}

用于生成随机或上下文相关数值：

- `minecraft:constant`：固定值。
- `minecraft:uniform`：min 到 max 均匀随机。
- `minecraft:binomial`：二项分布。
- `minecraft:score`：计分板值，可乘缩放系数。
- `minecraft:storage`：命令存储 NBT 值。
- `minecraft:sum`：其他提供器求和。
- `minecraft:enchantment_level`：基于魔咒等级的值，支持常量、`linear`、`levels_squared`、`fraction`、`clamped`、`exponent`、`lookup`。
- `minecraft:environment_attribute`：当前位置或维度的环境属性。

可注册[自定义数值提供器][customnumber]和[自定义等级值][customlevelbased]。

## 战利品参数

参数在代码中称为 `ContextKey<T>`，供条件和函数使用。原版参数包括 `this_entity`、`interacting_entity`、`target_entity`、`last_damage_player`、`damage_source`、`attacking_entity`、`direct_attacking_entity`、`origin`、`block_state`、`block_entity`、`tool`、`explosion_radius`、`enchantment_level`、`enchantment_active` 和 `additional_cost_component_allowed`。自定义参数用 `new ContextKey<T>(id)` 创建，无需注册。

### 实体目标 {#entity-targets}

`LootContext.EntityTarget` 可取 `this`、`attacker`、`direct_attacker`、`attacking_player`、`target_entity`、`interacting_entity`。

### 参数集

参数集（`ContextKeySet`）定义必需和可选参数，用于验证。常用集合包括 `EMPTY`、`ALL_PARAMS`、`COMMAND`、`SELECTOR`、`VILLAGER_TRADE`、`BLOCK`、`ENTITY`、`ENTITY_INTERACT`、`SHEARING`、`EQUIPMENT`、`GIFT`、`PIGLIN_BARTER`、`FISHING`、`ENCHANTED_ITEM`、`ENCHANTED_ENTITY`、`ENCHANTED_DAMAGE`、`ENCHANTED_LOCATION`、`ADVANCEMENT_ENTITY`、`ADVANCEMENT_LOCATION`、`ADVANCEMENT_REWARD`。完整必需/可选参数以 `LootContextParamSets` 为准。

### 战利品上下文 {#loot-context}

`LootContext` 包含关卡、随机源、参数、幸运值和动态掉落消费者，分别可通过 `#getLevel`、`#getRandom`、`#hasParameter`/`#getParameter`、`#getLuck` 访问。

## 战利品表格式 {#loot-table}

- `pools`：战利品池。
- `neoforge:conditions`：[数据加载条件][conditions]，不是战利品条件。
- `functions`：表级函数。
- `type`：参数集，用于验证。
- `random_sequence`：保证相同条件下结果一致的随机序列。

示例：

```json5
{
    "type": "chest",
    "neoforge:conditions": [],
    "functions": [],
    "pools": [
        {
            "rolls": 1,
            "bonus_rolls": 0.5,
            "name": "my_pool",
            "conditions": [],
            "functions": [],
            "entries": [
                {
                    "type": "minecraft:item",
                    "name": "minecraft:dirt",
                    "weight": 3,
                    "quality": 1,
                    "conditions": [],
                    "functions": []
                }
            ]
        }
    ]
}
```

## 掷取战利品表

```java
LootParams.Builder builder = new LootParams.Builder((ServerLevel) level);
builder.withParameter(LootContextParams.ORIGIN, position);
builder.withLuck(player.getLuck());

LootParams params = builder.create(LootContextParamSets.EMPTY);
LootTable table = level.getServer().reloadableRegistries().getLootTable(location);
List<ItemStack> list = table.getRandomItems(params);
```

容器内容可使用 `table.fill(container, params, seed)`。`#getRandomItemsRaw` 不应用全局战利品修改器，除非明确需要，否则不要使用。

## 数据生成 {#datagen}

```java
@SubscribeEvent // 在模组事件总线上
public static void onGatherData(GatherDataEvent.Client event) {
    event.createProvider((output, lookupProvider) -> new LootTableProvider(
        output, Set.of(), List.of(...), lookupProvider
    ));
}
```

实现 `LootTableSubProvider#generate`：

```java
public class MyLootTableSubProvider implements LootTableSubProvider {
    public MyLootTableSubProvider(HolderLookup.Provider lookupProvider) {
    }

    @Override
    public void generate(BiConsumer<ResourceKey<LootTable>, LootTable.Builder> consumer) {
        consumer.accept(
            ResourceKey.create(Registries.LOOT_TABLE,
                Identifier.fromNamespaceAndPath(ExampleMod.MOD_ID, "example_loot_table")),
            LootTable.lootTable()
                .apply(SetItemCountFunction.setCount(ConstantValue.exactly(5)))
                .withPool(LootPool.lootPool()
                    .when(WeatherCheck.weather().setRaining(true))
                    .setRolls(UniformGenerator.between(5, 9))
                    .setBonusRolls(ConstantValue.exactly(1))
                    .add(LootItem.lootTableItem(Items.DIRT)))
        );
    }
}
```

再用 `new SubProviderEntry(MyLootTableSubProvider::new, LootContextParamSets.EMPTY)` 加入 `LootTableProvider`。

方块可继承 `BlockLootSubProvider`，实现 `getKnownBlocks()` 和 `generate()`，使用 `dropSelf`、`createSingleItemTable`、`createSilkTouchOnlyTable`、`createSlabItemTable` 等辅助方法。实体可继承 `EntityLootSubProvider`，实现 `getKnownEntityTypes()` 和 `generate()`，并使用 `add` 添加战利品表。

[advancement]: ../advancements.md
[block]: ../../../blocks/index.md
[conditions]: ../conditions.md
[customentry]: custom.md#custom-loot-entries
[customlevelbased]: custom.md#custom-level-based-values
[customnumber]: custom.md#custom-number-providers
[datagen]: ../../index.md#data-generation
[entity]: ../../../entities/index.md
[glm]: glm.md
[lootcondition]: lootconditions.md
[lootfunction]: lootfunctions.md
[raidherogifts]: ../datamaps/builtin.md#neoforgeraid_hero_gifts
[tags]: ../tags.md
