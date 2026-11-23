# 进度

进度是玩家可完成的任务。它根据进度条件授予，并在完成时执行相应行为。在命名空间的 `advancement` 子文件夹中创建 JSON 文件即可添加进度。例如 ID 为 `examplemod` 的模组添加名为 `example_name` 的进度时，文件位于 `data/examplemod/advancement/example_name.json`，进度 ID 为 `examplemod:example_name`。游戏会自动加载；只有需要添加新条件或从代码触发条件时才需要 Java 代码。

## 规范

- `parent`：父进度 ID。循环引用会导致加载失败。省略时为根进度。
- `display`：进度界面显示信息。省略时进度不可见但仍可触发。
    - `icon`：[物品堆栈 JSON][itemstackjson]。
    - `title`、`description`：[文本组件][text]。
    - `frame`：`challenge`、`goal` 或 `task`，默认 `task`。
    - `background`：进度树背景纹理，相对于 `textures` 目录，仅根进度有效。
    - `show_toast`、`announce_to_chat`：完成时是否显示提示或聊天公告，默认 true。
    - `hidden`：完成前是否隐藏该进度及子进度，默认 false。
- `criteria`：要跟踪的条件映射。原版触发器见 `CriteriaTriggers`，JSON 格式见 [Minecraft Wiki][triggers]。
- `requirements`：要求列表。外层 AND、内层 OR，每个子列表至少一条件满足；默认全部满足。
- `rewards`：奖励，全部可选，包括 `experience`、`recipes`、`loot` 和 `function`。
- `sends_telemetry_event`：是否收集遥测，只在 `minecraft` 命名空间有效，默认 false。
- `neoforge:conditions`：NeoForge 添加的[加载条件][conditions]。

### 进度树

进度文件可按目录分组，创建多个标签页。一个标签页根据根进度数量可包含多个进度树，空标签页自动隐藏。

:::tip
原版每个标签页只有一个名为 `root` 的根进度，建议沿用。
:::

## 条件触发器

自定义触发器由代码中通过 `#trigger` 激活的触发器，以及定义授予条件的实例组成。触发器继承 `SimpleCriterionTrigger<T>`，实例实现 `SimpleCriterionTrigger.SimpleInstance`。

### `SimpleCriterionTrigger.SimpleInstance`

实例保存条件，并判断输入是否匹配。接口要求 `#player` 返回玩家的 `Optional<ContextAwarePredicate>`。如果 record 有相应 `player` 参数，自动生成的方法即可满足。

```java
public record ExampleTriggerInstance(Optional<ContextAwarePredicate> player/*, 其他参数*/)
        implements SimpleCriterionTrigger.SimpleInstance {}
```

通常还提供静态辅助方法构造 `Criterion<T>`：

```java
// EXAMPLE_TRIGGER 是 DeferredHolder<CriterionTrigger<?>, ExampleTrigger>
public static Criterion<ExampleTriggerInstance> instance(ContextAwarePredicate player, ItemPredicate item) {
    return EXAMPLE_TRIGGER.get().createCriterion(new ExampleTriggerInstance(Optional.of(player), item));
}
```

实例还应提供根据输入判断条件的 `matches` 方法：

```java
public record ExampleTriggerInstance(Optional<ContextAwarePredicate> player, ItemPredicate predicate)
        implements SimpleCriterionTrigger.SimpleInstance {
    public boolean matches(ItemStack stack) {
        return this.predicate.test(stack);
    }
}
```

### `SimpleCriterionTrigger`

触发器负责检查实例、成功时运行监听器，并指定实例 [codec]。

```java
public class ExampleCriterionTrigger extends SimpleCriterionTrigger<ExampleTriggerInstance> {
    public void trigger(ServerPlayer player, ItemStack stack) {
        this.trigger(player, triggerInstance -> triggerInstance.matches(stack));
    }
}
```

注册到 `Registries.TRIGGER_TYPE`：

```java
public static final DeferredRegister<CriterionTrigger<?>> TRIGGER_TYPES =
        DeferredRegister.create(Registries.TRIGGER_TYPE, ExampleMod.MOD_ID);
public static final Supplier<ExampleCriterionTrigger> EXAMPLE_TRIGGER =
        TRIGGER_TYPES.register("example", ExampleCriterionTrigger::new);
```

触发器重写 `#codec` 返回实例 codec：

```java
public record ExampleTriggerInstance(Optional<ContextAwarePredicate> player/*, 其他参数*/)
        implements SimpleCriterionTrigger.SimpleInstance {
    public static final Codec<ExampleTriggerInstance> CODEC = ...;
}

public class ExampleTrigger extends SimpleCriterionTrigger<ExampleTriggerInstance> {
    @Override
    public Codec<ExampleTriggerInstance> codec() {
        return ExampleTriggerInstance.CODEC;
    }
}
```

例如：

```java
public static final Codec<ExampleTriggerInstance> CODEC = RecordCodecBuilder.create(instance -> instance.group(
        EntityPredicate.ADVANCEMENT_CODEC.optionalFieldOf("player").forGetter(ExampleTriggerInstance::player),
        ItemPredicate.CODEC.fieldOf("item").forGetter(ExampleTriggerInstance::item)
).apply(instance, ExampleTriggerInstance::new));
```

### 调用条件触发器

动作发生时调用触发器，也可调用 `CriteriaTriggers` 中的原版触发器：

```java
public void performExampleAction(ServerPlayer player, additionalContextParametersHere) {
    // 执行动作
    EXAMPLE_TRIGGER.get().trigger(player, additionalContextParametersHere);
}
```

## 数据生成 {#data-generation}

进度可用 `AdvancementProvider` 数据生成。它接收一组 `AdvancementSubProvider`，实际使用 `Advancement.Builder` 生成进度。

```java
@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    // 添加数据包对象时，先调用 event.createDatapackRegistryObjects(...)
    event.createProvider((output, lookupProvider) -> new AdvancementProvider(
        output, lookupProvider, List.of(...)
    ));
}
```

生成器可以是类或 lambda：

```java
public class MyAdvancementGenerator implements AdvancementSubProvider {
    @Override
    public void generate(HolderLookup.Provider registries, Consumer<AdvancementHolder> saver) {
        // 在此生成进度。
    }
}

public static void generateExampleAdvancements(HolderLookup.Provider registries, Consumer<AdvancementHolder> saver) {
    // 在此生成进度。
}
```

典型构建流程：

```java
// 所有方法遵循构建器模式。为便于说明，这里不链式调用。
Advancement.Builder builder = Advancement.Builder.advancement();
builder.parent(AdvancementSubProvider.createPlaceholder("minecraft:story/root"));
builder.display(
        new ItemStackTemplate(Items.GRASS_BLOCK),
        Component.translatable("advancements.examplemod.example_advancement.title"),
        Component.translatable("advancements.examplemod.example_advancement.description"),
        null,
        AdvancementType.GOAL,
        true,
        true,
        false
);
builder.rewards(
    AdvancementRewards.Builder.experience(100)
    .addLootTable(ResourceKey.create(Registries.LOOT_TABLE, Identifier.fromNamespaceAndPath("minecraft", "chests/igloo")))
    .addRecipe(ResourceKey.create(Registries.RECIPE, Identifier.fromNamespaceAndPath("minecraft", "iron_ingot")))
    .runs(Identifier.fromNamespaceAndPath("examplemod", "example_function"))
);
builder.addCriterion("pickup_dirt", InventoryChangeTrigger.TriggerInstance.hasItems(Items.DIRT));
builder.requirements(AdvancementRequirements.allOf(List.of("pickup_dirt")));
builder.save(saver, Identifier.fromNamespaceAndPath("examplemod", "example_advancement"));
```

`#advancement()` 自动启用遥测；不需要时可用 `#recipeAdvancement()`，两者没有其他功能差异。

[codec]: ../../datastorage/codecs.md
[conditions]: conditions.md
[datagen]: ../index.md#data-generation
[entity]: ../../entities/index.md
[function]: https://minecraft.wiki/w/Function_(Java_Edition)
[itemstackjson]: ../../items/index.md#json-representation
[loottable]: loottables/index.md
[recipe]: recipes/index.md
[registration]: ../../concepts/registries.md#methods-for-registering
[root]: #root-advancements
[text]: ../client/i18n.md#components
[tree]: #advancement-trees
[triggers]: https://minecraft.wiki/w/Advancement/JSON_format#List_of_triggers
