---
sidebar_position: 4
---
# 工具

工具是主要用于破坏[方块][block]的[物品][item]。许多模组会添加新的工具套装（例如铜制工具）或新的工具类型（例如锤子）。

## 自定义工具套装

一套工具通常包含六件物品：镐、斧、锹、锄、剑和矛（剑和矛不属于传统意义上的工具，但为保持完整也列在这里）。这些工具都由以下十四种[数据组件][datacomponents]组合实现：

- `DataComponents#MAX_DAMAGE` 和 `#DAMAGE`：耐久度。
- `#MAX_STACK_SIZE`：把堆叠数量设为 `1`。
- `#REPAIRABLE`：在铁砧中修复工具。
- `#ENCHANTABLE`：最大[附魔][enchantment]值。
- `#ATTRIBUTE_MODIFIERS`：攻击伤害和攻击速度。
- `#TOOL`：挖掘信息。
- `#WEAPON`：物品受到的伤害以及禁用盾牌。
- `#ATTACK_RANGE`：挥动武器时的攻击范围。
- `#DAMAGE_TYPE`：造成的伤害类型。
- `#MINIMUM_ATTACK_CHARGE`：使用该武器攻击前所需的最少 tick 数。
- `#SWING_ANIMATION`：挥动武器时播放的动画。
- `#PIERCING_WEAPON`：可攻击多个实体的刺击。
- `#KINETIC_WEAPON`：根据动量攻击多个实体的物品使用攻击。
- `#USE_EFFECTS`：使用物品时对实体应用效果。

通常，每件工具通过 `Item.Properties#tool`、`#sword`、`#spear` 或工具委托方法（`pickaxe`、`axe`、`hoe`、`shovel`）设置这些属性，并传入实用 record `ToolMaterial`。注意，剪刀等通常也被视为工具的物品没有通过数据组件实现通用挖掘逻辑，而是直接继承 `Item` 并重写相关方法。交互行为（默认右键）也没有数据组件，因此锹、斧和锄分别拥有 `ShovelItem`、`AxeItem` 和 `HoeItem` 类。

要创建标准工具套装，首先定义 `ToolMaterial`。参考值可在 `ToolMaterial` 的常量中找到。下面以铜制工具为例，你可以使用自己的材料并调整数值。

```java
// 把铜放在石头和铁之间。
public static final ToolMaterial COPPER_MATERIAL = new ToolMaterial(
        // 决定该材料不能破坏哪些方块的标签。详见下文。
        MyBlockTags.INCORRECT_FOR_COPPER_TOOL,
        // 决定材料耐久度。
        // 石头为 131，铁为 250。
        200,
        // 决定材料挖掘速度。剑不使用此值。
        // 石头为 4，铁为 6。
        5f,
        // 决定攻击伤害加成。不同工具有不同用法。例如，剑造成 (getAttackDamageBonus() + 4) 点伤害。
        // 石头为 1，铁为 2，对应剑分别造成 5 和 6 点伤害；因此我们的剑现在造成 5.5 点伤害。
        1.5f,
        // 决定材料可附魔性，表示该工具附魔效果的好坏。
        // 金为 22，我们把铜设为略低于金。
        20,
        // 决定哪些物品可以修复该材料制成的工具。
        Tags.Items.INGOTS_COPPER
);
```

有了 `ToolMaterial` 后，就可以用它[注册][registering]工具。所有 `tool` 委托都有相同的三个参数：

```java
// ITEMS 是一个 DeferredRegister.Items
public static final DeferredItem<Item> COPPER_SWORD = ITEMS.registerItem(
    "copper_sword",
    props -> new Item(
        // 物品属性。
        props.sword(
            // 使用的材料。
            COPPER_MATERIAL,
            // 类型专属攻击伤害加成。剑为 3，锹为 1.5，镐为 1，斧和锄则各有不同。
            3,
            // 类型专属攻击速度修饰符。玩家默认攻击速度为 4，因此要达到目标值
            // 1.6f，需要 -2.4f。剑为 -2.4f，锹为 -3f，镐为 -2.8f，斧和锄则各有不同。
            -2.4f,
        )
    )
);

public static final DeferredItem<Item> COPPER_AXE = ITEMS.registerItem("copper_axe", props -> new Item(props.axe(...)));
public static final DeferredItem<Item> COPPER_PICKAXE = ITEMS.registerItem("copper_pickaxe", props -> new Item(props.pickaxe(...)));
public static final DeferredItem<Item> COPPER_SHOVEL = ITEMS.registerItem("copper_shovel", props -> new Item(props.shovel(...)));
public static final DeferredItem<Item> COPPER_HOE = ITEMS.registerItem("copper_hoe", props -> new Item(props.hoe(...)));

public static final DeferredItem<Item> COPPER_SPEAR = ITEMS.registerItem(
    "copper_spear",
    props -> new Item(
        props.spear(
            // 使用的材料。
            COPPER_MATERIAL,
            // 类型专属攻击速度修饰符。该值会先取倒数，再减去 4 后缩放。
            0.85f,
            // 满足条件之一时，把矛作为动能武器使用的伤害倍率。
            0.82f,
            // 矛可作为动能武器使用前必须经过的秒数。
            0.65f,
            // 使用动能武器击落命中实体时允许经过的最大秒数。
            4.0f,
            // 使用动能武器击落命中实体时，攻击者的最低速度（方块/秒）。
            9.0f,
            // 使用动能武器击退命中实体时允许经过的最大秒数。
            8.25f,
            // 使用动能武器击退命中实体时，攻击者的最低速度（方块/秒）。
            5.1f,
            // 使用动能武器伤害命中实体时允许经过的最大秒数。
            12.5f,
            // 使用动能武器伤害命中实体时，攻击者的最低速度（方块/秒）。相对于被攻击实体的速度。
            4.6f
        )
    )
);
```

:::note
`tool` 还接收两个额外参数：表示可挖掘方块的 `TagKey`，以及命中阻挡物（例如盾牌）时禁用它的秒数。
:::

### 标签

创建 `ToolMaterial` 时需要分配一个方块[标签][tags]，其中包含使用该工具破坏时不会掉落的方块。例如，`minecraft:incorrect_for_stone_tool` 包含钻石矿石等方块，`minecraft:incorrect_for_iron_tool` 包含黑曜石和远古残骸等方块。为便于把方块分配至正确的错误挖掘等级，还存在表示需要该工具才能挖掘的方块标签。例如，`minecraft:needs_iron_tool` 包含钻石矿石等方块，`minecraft:needs_diamond_tool` 包含黑曜石和远古残骸等方块。

如果愿意，可以直接复用现有的错误工具标签。例如，如果希望铜制工具只是更耐用的石制工具，可以传入 `BlockTags#INCORRECT_FOR_STONE_TOOL`。

也可以创建自己的标签：

```java
// 这个标签用于把方块加入对应“无法挖掘”的错误工具标签
public static final TagKey<Block> NEEDS_COPPER_TOOL = TagKey.create(BuiltInRegistries.BLOCK.key(), Identifier.fromNamespaceAndPath(MOD_ID, "needs_copper_tool"));

// 这个标签会传给我们的材料
public static final TagKey<Block> INCORRECT_FOR_COPPER_TOOL = TagKey.create(BuiltInRegistries.BLOCK.key(), Identifier.fromNamespaceAndPath(MOD_ID, "incorrect_for_cooper_tool"));
```

然后填充标签。例如，让铜能挖掘金矿石、金块和红石矿石，但不能挖掘钻石或绿宝石（红石块本来就可被石制工具挖掘）。标签文件位于 `src/main/resources/data/mod_id/tags/block/needs_copper_tool.json`，其中 `mod_id` 是模组 ID：

```json5
{
    "values": [
        "minecraft:gold_block",
        "minecraft:raw_gold_block",
        "minecraft:gold_ore",
        "minecraft:deepslate_gold_ore",
        "minecraft:redstone_ore",
        "minecraft:deepslate_redstone_ore"
    ]
}
```

接着为材料使用的“不正确工具”标签添加负向约束：包含所有不适合石制工具、但属于铜制工具标签的方块。标签文件位于 `src/main/resources/data/mod_id/tags/block/incorrect_for_cooper_tool.json`：

```json5
{
    "values": [
        "#minecraft:incorrect_for_stone_tool"
    ],
    "remove": [
        "#mod_id:needs_copper_tool"
    ]
}
```

最后，如前面的示例所示，把该标签传入 `ToolMaterial`。

要检查工具能否让某个方块状态产生掉落物，调用 `Tool#isCorrectForDrops`。可以通过 `ItemStack#get` 和 `DataComponents#TOOL` 取得 `Tool`。

## 自定义工具

可以通过 `Item.Properties#component` 把 `Tool` [数据组件][datacomponents]（`DataComponents#TOOL`）加入物品默认组件，从而创建自定义工具。

`Tool` 包含 `Tool.Rule` 列表、手持工具时的默认挖掘速度（默认 `1`），以及挖掘方块时工具应受到的伤害（默认 `1`）。`Tool.Rule` 包含三项信息：规则适用的方块 `HolderSet`、可选的挖掘速度，以及可选的布尔值，用于确定这些方块能否由该工具产生掉落。如果可选值未设置，就继续检查其他规则；所有规则都失败时，使用默认挖掘速度，并且方块不会掉落。

:::note
可以通过 `Registry#getOrThrow` 从 `TagKey` 创建 `HolderSet`。
:::

创建任意工具或复合工具（把两种或更多工具合成一件，例如斧镐合一）时，不一定需要使用现有的 `ToolMaterial`。可以组合以下内容实现：

- 通过 `Item.Properties#component` 设置 `DataComponents#TOOL`，添加自己的 `Tool` 规则。
- 通过 `Item.Properties#attributes` 添加[属性修饰符][attributemodifier]（例如攻击伤害、攻击速度）。
- 通过 `Item.Properties#durability` 添加耐久。
- 通过 `Item.Properties#repariable` 允许修复物品。
- 通过 `Item.Properties#enchantable` 允许物品附魔。
- 通过 `Item.Properties#component` 设置 `DataComponents#WEAPON`，把物品作为武器使用，并可能禁用盾牌。
- 重写 `IItemExtension#canPerformAction`，决定物品能执行哪些 [`ItemAbility`][itemability]。
- 如果希望物品根据 `ItemAbility` 在右键时修改方块状态，调用 `IBlockExtension#getToolModifiedState`。
- 把工具加入部分 `minecraft:enchantable/*` `ItemTags`，使其可获得特定附魔。
- 把工具加入部分 `minecraft:*_preferred_weapons` 标签，使生物更倾向于拾取并使用该武器。

对于盾牌，可以为副手应用 [`DataComponents#EQUIPPABLE`][equippable] 数据组件，并使用 `DataComponents#BLOCKS_ATTACKS` 在激活时减少手持实体受到的伤害。

## `ItemAbility` {#itemabilitys}

`ItemAbility` 是物品能执行和不能执行之行为的抽象，包括左键和右键行为。NeoForge 在 `ItemAbilities` 类中提供默认 `ItemAbility`：

- 斧的右键能力：去皮（原木）、刮除（氧化铜）和脱蜡（涂蜡铜）。
- 锹的右键能力：压平（土径）和灭火（营火）。
- 剪刀能力：挖掘（破坏方块）、收获（蜜脾）、移除盔甲（穿盔甲的狼）、雕刻（南瓜）、解除陷阱（绊线）和修剪（阻止植物生长）。
- 剑横扫、锄耕地、钓竿抛竿、三叉戟投掷、刷子刷扫、打火石点火和望远镜观察能力。

要创建自己的 `ItemAbility`，使用 `ItemAbility#get`；如需要，它会创建新的 `ItemAbility`。然后在自定义工具类型中按需重写 `IItemExtension#canPerformAction`。

要查询 `ItemStack` 能否执行某个 `ItemAbility`，调用 `IItemStackExtension#canPerformAction`。注意，它适用于任何 `Item`，不只适用于工具。

[block]: ../blocks/index.md
[datacomponents]: datacomponents.md
[enchantment]: ../../26.1/resources/server/enchantments/index.md#enchantment-costs-and-levels
[equippable]: armor.md#equippable
[item]: index.md
[itemability]: #itemabilitys
[registering]: ../concepts/registries.md#methods-for-registering
[tags]: ../../26.1/resources/server/tags.md
