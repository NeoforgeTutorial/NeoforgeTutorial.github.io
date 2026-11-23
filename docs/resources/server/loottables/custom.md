# 自定义战利品对象

战利品表系统涉及多个[注册表]。相关对象通常都遵循同一模式：继承类或实现接口来保存功能，定义 [codec] 进行序列化，再用 `DeferredRegister` 把 codec 注册到对应注册表。

## 自定义战利品条目 {#custom-loot-entries}

战利品条目可继承 `LootPoolEntryContainer`，或直接继承 `LootPoolSingletonContainer`、`CompositeEntryBase`。下面以“返回某实体掉落物”为例：

```java
public class EntityLootEntry extends LootPoolSingletonContainer {
    public static final MapCodec<EntityLootEntry> CODEC = RecordCodecBuilder.mapCodec(inst ->
        inst.group(
            BuiltInRegistries.ENTITY_TYPE.holderByNameCodec().fieldOf("entity").forGetter(e -> e.entity)
        ).and(singletonFields(inst)).apply(inst, EntityLootEntry::new)
    );

    private final Holder<EntityType<?>> entity;

    private EntityLootEntry(Holder<EntityType<?>> entity, int weight, int quality,
            List<LootItemCondition> conditions, List<LootItemFunction> functions) {
        super(weight, quality, conditions, functions);
        this.entity = entity;
    }

    public static LootPoolSingletonContainer.Builder<?> entityLoot(Holder<EntityType<?>> entity) {
        return simpleBuilder((weight, quality, conditions, functions) ->
            new EntityLootEntry(entity, weight, quality, conditions, functions));
    }

    @Override
    public void createItemStack(Consumer<ItemStack> consumer, LootContext context) {
        LootTable table = context.getLevel().reloadableRegistries()
            .getLootTable(entity.value().getDefaultLootTable());
        table.getRandomItemsRaw(context, consumer);
    }

    @Override
    public MapCodec<EntityLootEntry> codec() {
        return CODEC;
    }
}
```

注册：

```java
public static final DeferredRegister<MapCodec<? extends LootPoolEntryContainer>> LOOT_POOL_ENTRY_TYPES =
        DeferredRegister.create(Registries.LOOT_POOL_ENTRY_TYPE, ExampleMod.MOD_ID);
public static final Supplier<MapCodec<EntityLootEntry>> ENTITY_LOOT =
        LOOT_POOL_ENTRY_TYPES.register("entity_loot", () -> EntityLootEntry.CODEC);
```

## 自定义数值提供器 {#custom-number-providers}

实现 `NumberProvider`。示例把数值取反：

```java
public record InvertedSignProvider(NumberProvider base) implements NumberProvider {
    public static final MapCodec<InvertedSignProvider> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            NumberProviders.CODEC.fieldOf("base").forGetter(InvertedSignProvider::base)
    ).apply(inst, InvertedSignProvider::new));

    @Override
    public float getFloat(LootContext context) {
        return -this.base.getFloat(context);
    }

    @Override
    public int getInt(LootContext context) {
        return -this.base.getInt(context);
    }

    @Override
    public Set<ContextKey<?>> getReferencedContextParams() {
        return this.base.getReferencedContextParams();
    }

    @Override
    public MapCodec<InvertedSignProvider> codec() {
        return CODEC;
    }
}
```

注册到 `Registries.LOOT_NUMBER_PROVIDER_TYPE`。

## 自定义基于等级的值 {#custom-level-based-values}

实现 `LevelBasedValue`。示例同样取反：

```java
public record InvertedSignLevelBasedValue(LevelBasedValue base) implements LevelBasedValue {
    public static final MapCodec<InvertedSignLevelBasedValue> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            LevelBasedValue.CODEC.fieldOf("base").forGetter(InvertedSignLevelBasedValue::base)
    ).apply(inst, InvertedSignLevelBasedValue::new));

    @Override
    public float calculate(int level) {
        return -this.base.calculate(level);
    }

    @Override
    public MapCodec<InvertedSignLevelBasedValue> codec() {
        return CODEC;
    }
}
```

注册到 `Registries.ENCHANTMENT_LEVEL_BASED_VALUE_TYPE`。

## 自定义战利品条件 {#custom-loot-conditions}

实现 `LootItemCondition`。示例要求击杀者为指定经验等级：

```java
public record HasXpLevelCondition(int level) implements LootItemCondition {
    public static final MapCodec<HasXpLevelCondition> CODEC = RecordCodecBuilder.mapCodec(inst -> inst.group(
            Codec.INT.fieldOf("level").forGetter(HasXpLevelCondition::level)
    ).apply(inst, HasXpLevelCondition::new));

    @Override
    public boolean test(LootContext context) {
        @Nullable Entity entity = context.getOptionalParameter(LootContextParams.KILLER_ENTITY);
        return entity instanceof Player player && player.experienceLevel >= level;
    }

    @Override
    public Set<ContextKey<?>> getReferencedContextParams() {
        return ImmutableSet.of(LootContextParams.KILLER_ENTITY);
    }

    @Override
    public MapCodec<HasXpLevelCondition> codec() {
        return CODEC;
    }
}
```

注册到 `Registries.LOOT_CONDITION_TYPE`。

## 自定义战利品函数 {#custom-loot-functions}

函数通常继承 `LootItemConditionalFunction`，它继承 `LootItemFunction` 并支持条件。示例给物品随机附魔：

```java
public class RandomEnchantmentWithLevelFunction extends LootItemConditionalFunction {
    private final Optional<HolderSet<Enchantment>> enchantments;
    private final int level;

    public static final MapCodec<RandomEnchantmentWithLevelFunction> CODEC =
            RecordCodecBuilder.mapCodec(inst -> commonFields(inst).and(inst.group(
                    RegistryCodecs.homogeneousList(Registries.ENCHANTMENT)
                        .optionalFieldOf("enchantments").forGetter(e -> e.enchantments),
                    Codec.INT.fieldOf("level").forGetter(e -> e.level)
            ).apply(inst, RandomEnchantmentWithLevelFunction::new)));

    public RandomEnchantmentWithLevelFunction(List<LootItemCondition> conditions,
            Optional<HolderSet<Enchantment>> enchantments, int level) {
        super(conditions);
        this.enchantments = enchantments;
        this.level = level;
    }

    @Override
    public ItemStack run(ItemStack stack, LootContext context) {
        RandomSource random = context.getRandom();
        List<Holder<Enchantment>> list = this.enchantments
                .map(HolderSet::stream)
                .orElseGet(() -> context.getLevel().registryAccess()
                    .lookupOrThrow(Registries.ENCHANTMENT).listElements().map(Function.identity()))
                .filter(e -> e.value().canEnchant(stack))
                .toList();
        Optional<Holder<Enchantment>> optional = Util.getRandomSafe(list, random);
        if (optional.isEmpty()) {
            LOGGER.warn("Couldn't find a compatible enchantment for {}", stack);
        } else {
            Holder<Enchantment> enchantment = optional.get();
            if (stack.is(Items.BOOK)) {
                stack = new ItemStack(Items.ENCHANTED_BOOK);
            }
            stack.enchant(enchantment, this.level);
        }
        return stack;
    }

    @Override
    public MapCodec<RandomEnchantmentWithLevelFunction> codec() {
        return CODEC;
    }
}
```

注册到 `Registries.LOOT_FUNCTION_TYPE`。

[codec]: ../../../datastorage/codecs.md
[entity]: ../../../entities/index.md
[registries]: ../../../concepts/registries.md#methods-for-registering
