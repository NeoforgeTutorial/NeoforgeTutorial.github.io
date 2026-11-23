# 数据映射

数据映射保存可附加到已注册对象上的数据驱动、可重载对象，提供同步和冲突处理等功能。可把它理解为更灵活的 `注册对象 ➜ 对象` 映射，而[标签]类似 `注册对象 ➜ boolean`。同名数据映射默认追加，不会覆盖。

数据映射可附加到静态内置注册表和数据包注册表，并支持通过 `/reload` 等方式重载。NeoForge 的常见[内置数据映射][builtin]见链接文章。

## 文件位置

文件位于 `<mapNamespace>/data_maps/<registryNamespace>/<registryPath>/<mapPath>.json`：

- `<mapNamespace>`：数据映射 ID 的命名空间。
- `<mapPath>`：数据映射 ID 的路径。
- `<registryNamespace>`：注册表 ID 的命名空间，`minecraft` 时省略。
- `<registryPath>`：注册表 ID 的路径。

例如 `mymod:drop_healing` 对应 `minecraft:item` 的文件为 `mymod/data_maps/item/drop_healing.json`；若用于 `somemod:custom`，则为 `mymod/data_maps/somemod/custom/drop_healing.json`。

## JSON 结构

- `replace`：添加本文件值前是否清空数据映射。模组不应发布此设置，只供资源包开发者覆盖映射。
- `neoforge:conditions`：[加载条件][conditions]。
- `values`：注册表 ID 或标签 ID 到值的映射，值结构由数据映射 codec 定义。
- `remove`：要从数据映射中移除的注册表 ID 或标签 ID 列表。

### 添加值

假设数据映射值为 `minecraft:item` 上的 `amount` 和 `chance`：

```json5
{
    "values": {
        "minecraft:carrot": {
            "amount": 12,
            "chance": 1
        },
        "#minecraft:logs": {
            "amount": 1,
            "chance": 0.1
        }
    }
}
```

若数据映射支持[合并器][mergers]，元素级 `replace: true` 可跳过合并并直接用新值覆盖：

```json5
{
    "values": {
        "minecraft:carrot": {
            "replace": true,
            "value": {
                "amount": 12,
                "chance": 1
            }
        }
    }
}
```

### 移除已有值

```json5
{
    "remove": [
        "minecraft:potato"
    ]
}
```

移除在添加后执行，所以可以先添加标签，再排除其中一部分。若数据映射支持[移除器][removers]，`remove` 可改为对象，值会传给移除器：

```json5
{
    "remove": {
        "minecraft:carrot": "somekey1"
    }
}
```

## 自定义数据映射

数据映射条目必须不可变，record 很适合：

```java
public record ExampleData(float amount, float chance) {
    public static final Codec<ExampleData> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            Codec.FLOAT.fieldOf("amount").forGetter(ExampleData::amount),
            Codec.floatRange(0, 1).fieldOf("chance").forGetter(ExampleData::chance)
    ).apply(instance, ExampleData::new));
}
```

创建数据映射类型：

```java
public static final DataMapType<Item, ExampleData> EXAMPLE_DATA = DataMapType.builder(
        Identifier.fromNamespaceAndPath("examplemod", "example_data"),
        Registries.ITEM,
        ExampleData.CODEC
).build();
```

在[模组事件总线][modbus]的 `RegisterDataMapTypesEvent` 中注册：

```java
@SubscribeEvent // 在模组事件总线上
public static void registerDataMapTypes(RegisterDataMapTypesEvent event) {
    event.register(EXAMPLE_DATA);
}
```

### 同步

调用 builder 的 `#synced` 可把值同步到客户端：

```java
public static final DataMapType<Item, ExampleData> EXAMPLE_DATA = DataMapType.builder(...)
        .synced(
                // 同步 codec，可省略客户端不需要的字段
                ExampleData.CODEC,
                // 是否强制要求。强制后缺少该映射的客户端（包括原版客户端）会断开连接
                false
        ).build();
```

### 使用

数据映射必须通过引用型 `Holder` 查询，不能通过注册对象或 `Direct` holder 查询。`Registry#wrapAsHolder`、`Registry#getHolder`、`builtInRegistryHolder` 等通常返回引用型 holder。

```java
@SubscribeEvent // 在游戏事件总线上
public static void itemPickup(ItemEntityPickupEvent.Post event) {
    ItemStack stack = event.getOriginalStack();
    Holder<Item> holder = stack.getItemHolder();
    ExampleData data = holder.getData(EXAMPLE_DATA);
    if (data != null) {
        Player player = event.getPlayer();
        if (player.getLevel().getRandom().nextFloat() > data.chance()) {
            player.heal(data.amount());
        }
    }
}
```

## 高级数据映射

`AdvancedDataMapType` 支持自定义合并器和移除器，适合值为 `List`、`Map` 等集合的数据映射。除 `R`（注册表类型）和 `T`（值类型）外，它还有 `VR extends DataMapValueRemover<R, T>` 泛型。使用 `AdvancedDataMapType#builder()` 创建，并通过 `#merger`、`#remover` 设置。

### 合并器 {#mergers}

默认合并器用新值覆盖旧值。自定义合并器接收冲突的两个值、其来源和目标注册表，返回最终值：

```java
public class IntMerger implements DataMapValueMerger<Item, Integer> {
    @Override
    public Integer merge(Registry<Item> registry,
            Either<TagKey<Item>, ResourceKey<Item>> first, Integer firstValue,
            Either<TagKey<Item>, ResourceKey<Item>> second, Integer secondValue) {
        return firstValue + secondValue;
    }
}

AdvancedDataMapType<Item, Integer> ADVANCED_MAP = AdvancedDataMapType.builder(...)
        .merger(new IntMerger())
        .build();
```

若任一条目指定 `"replace": true`，则使用对应值；都指定时使用较高优先级数据包的值。

### 移除器 {#removers}

默认移除器删除对象的全部映射值。自定义移除器接收当前值和来源，返回替换值，返回空 `Optional` 表示完全删除：

```java
public record MapRemover(String key) implements DataMapValueRemover<Item, Map<String, String>> {
    public static final Codec<MapRemover> CODEC = Codec.STRING.xmap(MapRemover::new, MapRemover::key);

    @Override
    public Optional<Map<String, String>> remove(Map<String, String> value, Registry<Item> registry,
            Either<TagKey<Item>, ResourceKey<Item>> source, Item object) {
        final Map<String, String> newMap = new HashMap<>(value);
        newMap.remove(key);
        return Optional.of(newMap);
    }
}

AdvancedDataMapType<Item, AdvancedData> ADVANCED_MAP = AdvancedDataMapType.builder(...)
        .remover(MapRemover.CODEC)
        .build();
```

## 数据生成 {#data-generation}

继承 `DataMapProvider` 并重写 `#gather`：

```java
public class MyDataMapProvider extends DataMapProvider {
    public MyDataMapProvider(PackOutput packOutput, CompletableFuture<HolderLookup.Provider> lookupProvider) {
        super(packOutput, lookupProvider);
    }

    @Override
    protected void gather() {
        this.builder(EXAMPLE_DATA)
                .replace(true)
                .add(ItemTags.SLABS, new ExampleData(10, 1), false)
                .add(Items.APPLE.builtInRegistryHolder(), new ExampleData(5, 0.2f), false)
                .remove(ItemTags.WOODEN_SLABS)
                .conditions(new ModLoadedCondition("botania"));
    }
}

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MyDataMapProvider::new);
}
```

其中第三个 `add` 参数控制元素级替换，模组中应始终为 `false`；`replace(true)` 仅用于示例，不应随模组发布。

[builtin]: builtin.md
[codecs]: ../../../datastorage/codecs.md
[conditions]: ../conditions.md
[datagen]: ../../index.md#data-generation
[events]: ../../../concepts/events.md
[add]: #adding-values
[mergers]: #mergers
[modbus]: ../../../concepts/events.md#event-buses
[reloading]: ../../reloadlisteners.md#reloading
[removers]: #removers
[tags]: ../tags.md
