# 全局战利品修改器

全局战利品修改器（GLM）以数据驱动方式修改掉落，无需覆盖大量战利品表。GLM 先掷取关联战利品表，再处理结果；多个模组可叠加修改。

注册需要：`data/<namespace>/loot_modifiers/<path>.json`、实现 `IGlobalLootModifier` 或继承 `LootModifier` 的类，以及 codec。

## JSON

- `type`：修改器注册名。
- `conditions`：战利品条件。
- `priority`：执行优先级，高到低，通常默认 1000。
- 其他字段由 codec 定义。

```json5
{
    "type": "examplemod:my_loot_modifier",
    "conditions": [],
    "priority": 900,
    "field1": "somestring",
    "field2": 10,
    "field3": "minecraft:dirt"
}
```

只修改一个表时可使用 `neoforge:loot_table_id` 条件。

## `IGlobalLootModifier` 与 `LootModifier`

```java
public class MyLootModifier extends LootModifier {
    public static final MapCodec<MyLootModifier> CODEC = ...;
    private final String field1;
    private final int field2;
    private final Item field3;

    public MyLootModifier(LootItemCondition[] conditions, int priority,
            String field1, int field2, Item field3) {
        super(conditions, priority);
        this.field1 = field1;
        this.field2 = field2;
        this.field3 = field3;
    }

    @Override
    public MapCodec<? extends IGlobalLootModifier> codec() {
        return CODEC;
    }

    @Override
    protected ObjectArrayList<ItemStack> doApply(ObjectArrayList<ItemStack> generatedLoot, LootContext context) {
        // 在此修改 generatedLoot
        return generatedLoot;
    }
}
```

返回结果还会传给其他修改器。

## Codec 与注册

```java
public static final MapCodec<MyLootModifier> CODEC = RecordCodecBuilder.mapCodec(inst ->
        LootModifier.codecStart(inst).and(inst.group(
                Codec.STRING.fieldOf("field1").forGetter(e -> e.field1),
                Codec.INT.fieldOf("field2").forGetter(e -> e.field2),
                BuiltInRegistries.ITEM.byNameCodec().fieldOf("field3").forGetter(e -> e.field3)
        )).apply(inst, MyLootModifier::new)
);

public static final DeferredRegister<MapCodec<? extends IGlobalLootModifier>> GLOBAL_LOOT_MODIFIER_SERIALIZERS =
        DeferredRegister.create(NeoForgeRegistries.Keys.GLOBAL_LOOT_MODIFIER_SERIALIZERS, ExampleMod.MOD_ID);

public static final Supplier<MapCodec<MyLootModifier>> MY_LOOT_MODIFIER =
        GLOBAL_LOOT_MODIFIER_SERIALIZERS.register("my_loot_modifier", () -> MyLootModifier.CODEC);
```

## 内置修改器

`neoforge:add_table` 会追加另一个战利品表的结果：

```json5
{
    "type": "neoforge:add_table",
    "conditions": [],
    "priority": 1000,
    "table": "minecraft:chests/abandoned_mineshaft"
}
```

## 数据生成 {#datagen}

```java
public class MyGlobalLootModifierProvider extends GlobalLootModifierProvider {
    public MyGlobalLootModifierProvider(PackOutput output, CompletableFuture<HolderLookup.Provider> registries) {
        super(output, registries, ExampleMod.MOD_ID);
    }

    @Override
    protected void start() {
        this.add(
            "my_loot_modifier_instance",
            new MyLootModifier(new LootItemCondition[] {
                WeatherCheck.weather().setRaining(true).build()
            }, 900, "somestring", 10, Items.DIRT),
            List.of(new ModLoadedCondition("create"))
        );
    }
}

@SubscribeEvent // 在模组事件总线上
public static void onGatherData(GatherDataEvent.Client event) {
    event.createProvider(MyGlobalLootModifierProvider::new);
}
```

[codec]: ../../../datastorage/codecs.md
[datagen]: ../../index.md#data-generation
[loottable]: index.md
[loottableid]: lootconditions.md#neoforgeloot_table_id
[register]: ../../../concepts/registries.md#methods-for-registering
[identifier]: ../../../misc/identifier.md
[tags]: ../tags.md
