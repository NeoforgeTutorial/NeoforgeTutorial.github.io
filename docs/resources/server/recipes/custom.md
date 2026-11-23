# 自定义配方

自定义配方至少需要 `Recipe`、`RecipeType` 和 `RecipeSerializer`。必要时还需要自定义 `RecipeInput`、`RecipeDisplay`、`SlotDisplay`、`RecipeBookCategory` 和 `RecipePropertySet`。

## 配方输入

`RecipeInput` 保存当前实际输入，使用实际物品堆栈和方块状态，而不是标签或 `Ingredient`：

```java
public record RightClickBlockInput(BlockState state, ItemStack stack) implements RecipeInput {
    @Override
    public ItemStack getItem(int slot) {
        if (slot != 0) throw new IllegalArgumentException("No item for index " + slot);
        return this.stack();
    }

    @Override
    public int size() {
        return 1;
    }
}
```

输入按需创建，无需注册或序列化。多数情况可直接复用 `CraftingInput`、`SingleRecipeInput` 和 `SmithingRecipeInput`。

## 配方类

配方保存数据、匹配输入并生成结果：

```java
public class RightClickBlockRecipe implements Recipe<RightClickBlockInput> {
    private final Recipe.CommonInfo commonInfo;
    private final BlockBookInfo bookInfo;
    private final BlockState inputState;
    private final Ingredient inputItem;
    private final ItemStackTemplate result;

    @Override
    public boolean matches(RightClickBlockInput input, Level level) {
        return this.inputState == input.state() && this.inputItem.test(input.stack());
    }

    @Override
    public ItemStack assemble(RightClickBlockInput input) {
        return this.result.create();
    }

    @Override
    public boolean isSpecial() {
        return true;
    }
}
```

`isSpecial` 为 true 时不进入配方书，也不授予解锁。配方还应实现 `#getType` 和 `#getSerializer`。

### 通用信息

`Recipe.CommonInfo` 从 JSON 解析通用数据，目前包括 `show_notification`，并带 map codec 和 stream codec。配方中的 `#showNotification` 通常委托给 `commonInfo.showNotification()`。不要求一定使用该类。

### 配方书信息

`Recipe.BookInfo<CategoryType>` 保存配方书分类和分组。配方必须返回非空 `group()` 和 `recipeBookCategory()`。

```java
public record BlockBookInfo(CraftingBookCategory category, String group)
        implements Recipe.BookInfo<CraftingBookCategory> {
    public static final MapCodec<BlockBookInfo> MAP_CODEC = Recipe.BookInfo.mapCodec(
        CraftingBookCategory.CODEC, CraftingBookCategory.MISC, BlockBookInfo::new
    );
}
```

相同非空 `group` 的配方在配方书中合并；空字符串表示独立条目。

`RecipeBookCategory` 必须注册到 `BuiltInRegistries.RECIPE_BOOK_CATEGORY`。原版分类位于 `RecipeBookCategories`。配方书“查看全部”使用的搜索分类是 `ExtendedRecipeBookCategory`，可通过[模组事件总线]上的 `RegisterRecipeBookSearchCategoriesEvent#register` 注册。

## 放置信息

`PlacementInfo` 描述配方需要的物品和可放入的工作台位置，仅适用于物品原料。包含空槽时用 `createFromOptionals`；无法放置时使用 `PlacementInfo#NOT_PLACEABLE`。配方若包含方块、流体等非物品输入，可把这些槽位标记为空。

```java
@Override
public PlacementInfo placementInfo() {
    List<Optional<Ingredient>> ingredients = new ArrayList<>();
    Item stateItem = this.inputState.getBlock().asItem();
    ingredients.add(stateItem != Items.AIR ? Optional.of(Ingredient.of(stateItem)) : Optional.empty());
    ingredients.add(Optional.of(this.inputItem));
    return PlacementInfo.createFromOptionals(ingredients);
}
```

标签与配方可能同时加载，因此该值常需延迟创建。

## 槽位显示 {#slot-displays}

`SlotDisplay` 定义配方查看器中槽位的显示内容。`resolve(ContextMap, DisplayContentsFactory<T>)` 把内容转换为显示对象，`type()` 返回注册类型及 codec。

原版和 NeoForge 提供 `Empty`、`ItemSlotDisplay`、`ItemStackSlotDisplay`、`TagSlotDisplay`、`OnlyWithComponent`、`WithAnyPotion`、`WithRemainder`、`AnyFuel`、`Composite`、`DyedSlotDemo`、`SmithingTrimDemoSlotDisplay`、`FluidSlotDisplay`、`FluidStackSlotDisplay`、`FluidTagSlotDisplay`。

非物品输入可自定义 `DisplayContentsFactory` 和 `SlotDisplay`，然后把类型注册到 `Registries.SLOT_DISPLAY`。

```java
public record BlockStateSlotDisplay(BlockState state) implements SlotDisplay {
    public static final MapCodec<BlockStateSlotDisplay> CODEC =
        BlockState.CODEC.fieldOf("state").xmap(BlockStateSlotDisplay::new, BlockStateSlotDisplay::state);

    @Override
    public <T> Stream<T> resolve(ContextMap context, DisplayContentsFactory<T> factory) {
        return factory instanceof ForBlockStates<T> states
            ? Stream.of(states.forState(this.state))
            : Stream.empty();
    }
}
```

## 配方显示

`RecipeDisplay` 表示整个配方，默认接口提供 `result()` 和 `craftingStation()`，并需要 `type()` 返回 codec 和显示类型。复杂配方可定义自己的 `RecipeDisplay`，其中每个槽位都使用 `SlotDisplay`。

```java
public record RightClickBlockRecipeDisplay(
    SlotDisplay inputState, SlotDisplay inputItem,
    SlotDisplay result, SlotDisplay craftingStation
) implements RecipeDisplay {
    @Override
    public Type<? extends RecipeDisplay> type() {
        return RIGHT_CLICK_BLOCK_RECIPE_DISPLAY.get();
    }
}
```

注册显示类型后，在配方中重写 `display()` 返回一个或多个 `RecipeDisplay`。

## 配方类型

```java
public static final DeferredRegister<RecipeType<?>> RECIPE_TYPES =
        DeferredRegister.create(Registries.RECIPE_TYPE, ExampleMod.MOD_ID);
public static final Supplier<RecipeType<RightClickBlockRecipe>> RIGHT_CLICK_BLOCK_TYPE =
        RECIPE_TYPES.register("right_click_block", RecipeType::simple);
```

配方类重写 `getType()` 返回该类型。

## 配方序列化器

配方类定义 JSON 的 `MapCodec` 和网络的 `StreamCodec`：

```java
public static final MapCodec<RightClickBlockRecipe> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
        Recipe.CommonInfo.MAP_CODEC.forGetter(recipe -> recipe.commonInfo),
        BlockBookInfo.MAP_CODEC.forGetter(recipe -> recipe.bookInfo),
        BlockState.CODEC.fieldOf("state").forGetter(RightClickBlockRecipe::getInputState),
        Ingredient.CODEC.fieldOf("ingredient").forGetter(RightClickBlockRecipe::getInputItem),
        ItemStack.CODEC.fieldOf("result").forGetter(RightClickBlockRecipe::getResult)
).apply(inst, RightClickBlockRecipe::new));
```

注册到 `Registries.RECIPE_SERIALIZER`：

```java
public static final DeferredRegister<RecipeSerializer<?>> RECIPE_SERIALIZERS =
        DeferredRegister.create(Registries.RECIPE_SERIALIZER, ExampleMod.MOD_ID);
public static final Supplier<RecipeSerializer<RightClickBlockRecipe>> RIGHT_CLICK_BLOCK =
        RECIPE_SERIALIZERS.register("right_click_block",
            () -> new RecipeSerializer<>(RightClickBlockRecipe.CODEC, RightClickBlockRecipe.STREAM_CODEC));
```

配方类重写 `getSerializer()` 返回该序列化器。

## 制作机制

配方完成后，如何应用由模组决定。示例在物品右击方块时查询配方。客户端和服务端需要相同的初始匹配数据，可同步输入状态集合，或使用[客户端完整配方同步][clientrecipes]。

服务端应通过重载监听器收集所有配方输入的方块状态和物品 holder，同步到客户端；实际交互时先在两端做轻量匹配，再仅在服务端调用 `RecipeManager#getRecipeFor` 获取完整配方并生成结果。处理完成后破坏方块并生成物品实体。

```java
@SubscribeEvent // 在游戏事件总线上
public static void useItemOnBlock(UseItemOnBlockEvent event) {
    if (event.getUsePhase() != UseItemOnBlockEvent.UsePhase.BLOCK) return;
    Level level = event.getLevel();
    BlockPos pos = event.getPos();
    BlockState state = level.getBlockState(pos);
    ItemStack stack = event.getItemStack();

    if (!RightClickBlockRecipes.inputs(level).test(state, stack)) return;

    if (!level.isClientSide() && level instanceof ServerLevel serverLevel) {
        RightClickBlockInput input = new RightClickBlockInput(state, stack);
        ItemStack result = serverLevel.recipeAccess()
            .getRecipeFor(RIGHT_CLICK_BLOCK_TYPE.get(), input, level)
            .map(RecipeHolder::value)
            .map(recipe -> recipe.assemble(input))
            .orElse(ItemStack.EMPTY);
        if (!result.isEmpty()) {
            level.removeBlock(pos, false);
            level.addFreshEntity(new ItemEntity(level,
                pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5, result));
        }
    }

    event.cancelWithResult(InteractionResult.SUCCESS_SERVER);
}
```

## 数据生成 {#data-generation}

实现 `RecipeBuilder` 创建自己的 builder。通常需要保存结果、配方书分组、通知设置、解锁进度和配方分类，并实现 `unlockedBy`、`group`、`defaultId` 和 `save`。

```java
public abstract class SimpleRecipeBuilder implements RecipeBuilder {
    protected final ItemStackTemplate result;
    protected String group = "";
    protected boolean showNotification = true;

    @Override
    public RecipeBuilder unlockedBy(String name, Criterion<?> criterion) {
        this.criteria.put(name, criterion);
        return this;
    }

    @Override
    public RecipeBuilder group(@Nullable String group) {
        this.group = Objects.requireNonNullElse(group, "");
        return this;
    }

    @Override
    public ResourceKey<Recipe<?>> defaultId() {
        return RecipeBuilder.getDefaultRecipeId(this.result);
    }
}
```

在 `save` 中构造实际 `Recipe`，并把标识符、配方和进度一起传给 `RecipeOutput`。随后在 `RecipeProvider#buildRecipes` 正常调用：

```java
new RightClickBlockRecipeBuilder(
        new ItemStackTemplate(Items.DIAMOND),
        RecipeCategory.MISC,
        Blocks.DIRT.defaultBlockState(),
        Ingredient.of(Items.APPLE)
)
    .unlockedBy("has_apple", this.has(Items.APPLE))
    .save(output);
```

[clientrecipes]: index.md#client-side-recipes
[codec]: ../../../datastorage/codecs.md
[datagen]: #data-generation
[event]: ../../../concepts/events.md
[gui]: ../../../rendering/screens.md
[ingredients]: ingredients.md
[networking]: ../../../networking/payload.md
[recipedatagen]: index.md#data-generation
[reloadlistener]: ../../reloadlisteners.md
[registry]: ../../../concepts/registries.md#methods-for-registering
[serializer]: #配方序列化器
[streamcodec]: ../../../networking/streamcodecs.md
