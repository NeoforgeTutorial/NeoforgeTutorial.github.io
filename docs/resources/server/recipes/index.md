# 配方

配方把一组对象转换为其他对象。Minecraft 主要用其处理物品转换，但系统也支持方块、实体等任意对象。配方文件位于 `data/<namespace>/recipe/<path>.json`。

## 术语

- 配方 JSON：由 `RecipeManager` 加载保存的文件。
- `Recipe`：JSON 字段的代码表示和匹配逻辑。
- `RecipeInput`：配方输入，例如 `CraftingInput`、`SingleRecipeInput`。
- 原料：单个输入，详见[原料文章][ingredients]。
- `PlacementInfo`：物品应放到哪些索引，无法还原位置时为 `NOT_PLACEABLE`。
- `SlotDisplay`、`RecipeDisplay`：配方查看器中的槽位和完整显示数据。
- `RecipeManager`：服务端保存所有配方的单例对象。
- `RecipeSerializer`：包装 `MapCodec` 和 `StreamCodec`。
- `RecipeType`：配方的注册类型。不同制作容器通常使用不同 `RecipeType`。
- `RecipePropertySet`：菜单输入槽允许的原料集合。
- `RecipeBuilder`：数据生成用的配方构建器。
- 配方进度：解锁配方书的[进度]，数据生成会自动创建。

## JSON 规范

所有配方都有 `type` 和可选 [`neoforge:conditions`][conditions]：

```json5
{
    "type": "minecraft:crafting_shaped",
    "neoforge:conditions": []
}
```

原版类型见[内置配方类型][builtin]，模组可[自定义配方类型][customrecipes]。

## 使用配方

通过 `ServerLevel#recipeAccess` 或 `ServerLifecycleHooks.getCurrentServer()#getRecipeManager` 取得 `RecipeManager`。服务端默认只同步菜单槽位限制和配方书解锁显示，因此配方逻辑应在服务端运行。

```java
RecipeManager recipes = serverLevel.recipeAccess();
Optional<RecipeHolder<?>> optional = recipes.byKey(
    ResourceKey.create(Registries.RECIPE, Identifier.withDefaultNamespace("diamond_block"))
);
optional.map(RecipeHolder::value).ifPresent(recipe -> {
    // 配方可能是任意类型
});
```

按输入查找：

```java
CraftingInput input = CraftingInput.of(1, 1, List.of(new ItemStack(Items.DIAMOND_BLOCK)));
Optional<RecipeHolder<? extends CraftingRecipe>> optional = recipes.getRecipeFor(
        RecipeType.CRAFTING, input, serverLevel
);
ItemStack result = optional.map(RecipeHolder::value)
        .map(recipe -> recipe.assemble(input))
        .orElse(ItemStack.EMPTY);
```

遍历某类型配方：

```java
Collection<RecipeHolder<?>> list = recipes.recipeMap().byType(RecipeType.CRAFTING);
```

## 配方优先级 {#recipe-priorities}

多个配方可能同时匹配。NeoForge 允许在 `data/<namespace>/recipe_priorities.json` 指定整数优先级，越大越先检查，未指定为 0。文件默认合并，`replace: true` 清空之前条目。数据生成可继承 `RecipePrioritiesProvider` 并重写 `start()`。

```json5
{
    "replace": false,
    "entries": {
        "examplemod:higher_priority": 1,
        "examplemod:lower_priority": -1
    }
}
```

## 其他配方机制

### 铁砧

铁砧通过 `AnvilUpdateEvent` 设置输出、经验成本和材料消耗，也可取消事件。

```java
@SubscribeEvent // 在游戏事件总线上
public static void onAnvilUpdate(AnvilUpdateEvent event) {
    ItemStack left = event.getLeft();
    ItemStack right = event.getRight();
    if (left.is(Items.STONE_PICKAXE) && right.is(Items.DIRT) && right.getCount() >= 32) {
        event.setOutput(new ItemStack(Items.STONE_PICKAXE));
        event.setMaterialCost(32);
        event.setXpCost(3);
    }
}
```

### 工作台尺寸

NeoForge 添加 `ShapedRecipePattern#setCraftingSize(int width, int height)`，应在 `FMLCommonSetupEvent` 中调用，多个模组设置时取最大值。该方法不是线程安全的，必须通过 `event#enqueueWork` 调用。

### 客户端配方 {#client-side-recipes}

监听 `OnDatapackSyncEvent#sendRecipes` 指定同步类型，再通过 `RecipesReceivedEvent#getRecipeMap` 读取；`ClientPlayerNetworkEvent.LoggingOut` 时清空缓存。

```java
@SubscribeEvent // 在游戏事件总线上
public static void datapackSync(OnDatapackSyncEvent event) {
    event.sendRecipes(EXAMPLE_RECIPE_TYPE);
}

@SubscribeEvent // 仅在物理客户端的游戏事件总线上
public static void recipesReceived(RecipesReceivedEvent event) {
    EXAMPLE_RECIPES.clear();
    EXAMPLE_RECIPES.addAll(event.getRecipeMap().byType(EXAMPLE_RECIPE_TYPE));
}

@SubscribeEvent // 仅在物理客户端的游戏事件总线上
public static void clientLogOut(ClientPlayerNetworkEvent.LoggingOut event) {
    EXAMPLE_RECIPES.clear();
}
```

:::warning
自定义配方同步时，`OnDatapackSyncEvent` 应在两个物理端都调用。单机世界也有逻辑服务端与客户端边界。
:::

## 数据生成 {#data-generation}

```java
public class MyRecipeProvider extends RecipeProvider {
    protected MyRecipeProvider(HolderLookup.Provider provider, RecipeOutput output) {
        super(provider, output);
    }

    @Override
    protected void buildRecipes() {
        // 在此添加配方
    }

    public static class Runner extends RecipeProvider.Runner {
        public Runner(PackOutput output, CompletableFuture<HolderLookup.Provider> lookupProvider) {
            super(output, lookupProvider);
        }

        @Override
        protected RecipeProvider createRecipeProvider(HolderLookup.Provider provider, RecipeOutput output) {
            return new MyRecipeProvider(provider, output);
        }
    }
}

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MyRecipeProvider.Runner::new);
}
```

`RecipeOutput` 自动生成配方进度，并通过 `#withConditions` 支持[加载条件][conditions]。常用辅助方法包括 `twoByTwoPacker`、`threeByThreePacker` 和 `nineBlockStorageRecipes`。

[advancement]: ../advancements.md
[brewing]: ../../../items/mobeffects.md#brewing
[builtin]: builtin.md
[conditions]: ../conditions.md
[customrecipes]: custom.md
[ingredients]: ingredients.md
