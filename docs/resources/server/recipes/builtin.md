# 内置配方类型

Minecraft 提供多种配方类型和序列化器。下面说明各类型及数据生成方式。

## 工作台配方

工作台配方类型为 `minecraft:crafting`。

### 有序配方

`minecraft:crafting_shaped` 使用 `key` 定义字符对应原料，用 `pattern` 定义最多三行、每行最多三字符的矩形图案；空格表示空槽。`category` 是配方书分类，`result` 是物品堆栈模板。`group` 合并配方书分组，`show_notification` 控制解锁提示。

```json5
{
    "type": "minecraft:crafting_shaped",
    "category": "equipment",
    "key": {
        "#": "minecraft:stick",
        "X": "minecraft:iron_ingot"
    },
    "pattern": ["XXX", " # ", " # "],
    "result": {
        "count": 1,
        "id": "minecraft:iron_pickaxe"
    }
}
```

```java
ShapedRecipeBuilder.shaped(this.registries.lookupOrThrow(Registries.ITEM),
        RecipeCategory.TOOLS, Items.IRON_PICKAXE)
    .pattern("XXX").pattern(" # ").pattern(" # ")
    .define('X', Items.IRON_INGOT)
    .define('#', Items.STICK)
    .unlockedBy("has_iron_ingot", this.has(Items.IRON_INGOT))
    .save(this.output);
```

### 无序配方

`minecraft:crafting_shapeless` 使用 `ingredients` 列表，不关心顺序。单物品配方按原版惯例应使用无序配方。

```json5
{
    "type": "minecraft:crafting_shapeless",
    "category": "misc",
    "ingredients": [
        "minecraft:brown_mushroom",
        "minecraft:red_mushroom",
        "minecraft:bowl"
    ],
    "result": {
        "count": 1,
        "id": "minecraft:mushroom_stew"
    }
}
```

```java
ShapelessRecipeBuilder.shapeless(this.registries.lookupOrThrow(Registries.ITEM),
        RecipeCategory.MISC, Items.MUSHROOM_STEW)
    .requires(Blocks.BROWN_MUSHROOM)
    .requires(Blocks.RED_MUSHROOM)
    .requires(Items.BOWL)
    .unlockedBy("has_mushroom_stew", this.has(Items.MUSHROOM_STEW))
    .save(this.output);
```

### 灌注配方

`minecraft:crafting_imbue` 把来源物品的药水内容复制到结果。字段为 `source`、`material`、`result`。数据生成使用 `CustomCraftingRecipeBuilder.customCrafting` 和 `ImbueRecipe`。

```json5
{
    "type": "minecraft:crafting_imbue",
    "category": "misc",
    "material": "minecraft:arrow",
    "source": "minecraft:lingering_potion",
    "result": {
        "count": 8,
        "id": "minecraft:tipped_arrow"
    }
}
```

### 转化配方

`minecraft:crafting_transmute` 把输入堆栈的全部数据组件复制到结果。字段包括 `input`、`material`、`material_count`、`result` 和 `add_material_count_to_result`。数据生成使用 `TransmuteRecipeBuilder.transmute`。

### 染色配方

`minecraft:crafting_dye` 把染料物品的 `DataComponents#DYE` 合并为 `DataComponents#DYED_COLOR`，并把目标堆栈其他组件复制到结果。字段为 `target`、`dye`、`result`。数据生成使用 `CustomCraftingRecipeBuilder.customCrafting` 和 `DyeRecipe`。

### 特殊配方

特殊配方通常只处理特定目标，例如复制书、烟花、旗帜复制、地图扩展、物品修复和盾牌装饰。字段由序列化器决定：

```json5
{
    "type": "minecraft:crafting_special_firework_rocket",
    "fuel": "minecraft:gunpowder",
    "shell": "minecraft:paper",
    "star": "minecraft:firework_star",
    "result": {
        "count": 3,
        "id": "minecraft:firework_rocket"
    }
}
```

```java
SpecialRecipeBuilder.special(
    () -> new FireworkRocketRecipe(
        Ingredient.of(Items.PAPER),
        Ingredient.of(Items.GUNPOWDER),
        Ingredient.of(Items.FIREWORK_STAR),
        new ItemStackTemplate(Items.FIREWORK_ROCKET, 3)
    )
).save(this.output, "firework_rocket");
```

原版特殊序列化器包括 `bannerduplicate`、`bookcloning`、`firework_rocket`、`firework_star`、`firework_star_fade`、`mapextending`、`repairitem`、`shielddecoration` 和 `crafting_decorated_pot`。

## 熔炉类配方

熔炉 `minecraft:smelting`、烟熏炉 `minecraft:smoking`、高炉 `minecraft:blasting`、营火 `minecraft:campfire_cooking` 使用同一格式：

```json5
{
    "type": "minecraft:smelting",
    "category": "food",
    "cookingtime": 200,
    "experience": 0.1,
    "ingredient": {"item": "minecraft:kelp"},
    "result": {"id": "minecraft:dried_kelp"}
}
```

`cookingtime` 单位为 tick；原版熔炉 200、烟熏炉/高炉 100、营火 600。`experience` 可选。

```java
SimpleCookingRecipeBuilder.smelting(
        Ingredient.of(Items.KELP),
        RecipeCategory.FOOD,
        CookingBookCategory.FOOD,
        Items.DRIED_KELP,
        0.1f,
        200
)
    .unlockedBy("has_kelp", this.has(Blocks.KELP))
    .save(this.output, "dried_kelp_smelting");
```

烟熏、高炉和营火分别使用 `#smoking`、`#blasting`、`#campfireCooking`。

## 切石机配方

`minecraft:stonecutting` 只需要 `ingredient` 和 `result`，可选 `group`：

```json5
{
    "type": "minecraft:stonecutting",
    "ingredient": "minecraft:andesite",
    "result": {
        "count": 2,
        "id": "minecraft:andesite_slab"
    }
}
```

```java
SingleItemRecipeBuilder.stonecutting(Ingredient.of(Items.ANDESITE),
        RecipeCategory.BUILDING_BLOCKS, Items.ANDESITE_SLAB, 2)
    .unlockedBy("has_andesite", this.has(Items.ANDESITE))
    .save(this.output, "andesite_slab_from_andesite_stonecutting");
```

这个 builder 不支持带数据组件的物品堆栈结果；codec 支持，但需要自定义 builder。

## 锻造台配方

`minecraft:smithing_transform` 把两个物品转化为结果并保留基础物品数据组件，字段为 `base`、`template`、`addition`、`result`。数据生成使用 `SmithingTransformRecipeBuilder#smithing`。

`minecraft:smithing_trim` 给基础物品应用纹饰，字段为 `base`、`template`、`addition`、`pattern`，没有 `result`，因为输出由基础物品应用纹饰产生。数据生成使用 `SmithingTrimRecipeBuilder#smithingTrim`。

[datacomponent]: ../../../items/datacomponents.md
[ingredient]: ingredients.md
[itemjson]: ../../../items/index.md#json-representation
