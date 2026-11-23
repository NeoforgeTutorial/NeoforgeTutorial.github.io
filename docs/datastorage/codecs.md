---
sidebar_position: 2
---
# Codec

Codec 是 Mojang [DataFixerUpper] 提供的序列化工具，用于描述对象如何在不同格式之间转换，例如 JSON 使用的 `JsonElement` 和 NBT 使用的 `Tag`。

## 使用 Codec

Codec 主要用于编码（序列化）Java 对象到某种数据格式，以及解码（反序列化）格式化数据回对应的 Java 类型。通常分别通过 `Codec#encodeStart` 和 `Codec#parse` 完成。

### `DynamicOps`

为了确定编码和解码使用的中间文件格式，`#encodeStart` 和 `#parse` 都需要一个 `DynamicOps` 实例来定义该格式中的数据。

[DataFixerUpper] 库包含 `JsonOps`，用于对保存在 [`Gson`][gson] `JsonElement` 中的 JSON 数据进行编解码。`JsonOps` 支持两种 `JsonElement` 序列化方式：定义标准 JSON 文件的 `JsonOps#INSTANCE`，以及允许把数据压缩为单个字符串的 `JsonOps#COMPRESSED`。

```java
// 假设 exampleCodec 表示 Codec<ExampleJavaObject>
// 假设 exampleObject 是 ExampleJavaObject
// 假设 exampleJson 是 JsonElement

// 把 Java 对象编码为普通 JsonElement
exampleCodec.encodeStart(JsonOps.INSTANCE, exampleObject);

// 把 Java 对象编码为压缩后的 JsonElement
exampleCodec.encodeStart(JsonOps.COMPRESSED, exampleObject);

// 把 JsonElement 解码为 Java 对象
// 假设 JsonElement 已按普通方式解析
exampleCodec.parse(JsonOps.INSTANCE, exampleJson);
```

Minecraft 还提供 `NbtOps`，用于对保存在 `Tag` 中的 NBT 数据进行编解码。可以通过 `NbtOps#INSTANCE` 引用它。

```java
// 假设 exampleCodec 表示 Codec<ExampleJavaObject>
// 假设 exampleObject 是 ExampleJavaObject
// 假设 exampleNbt 是 Tag

// 把 Java 对象编码为 Tag
exampleCodec.encodeStart(NbtOps.INSTANCE, exampleObject);

// 把 Tag 解码为 Java 对象
exampleCodec.parse(NbtOps.INSTANCE, exampleNbt);
```

Minecraft 提供 `RegistryOps` 来处理注册表条目。它包含一个查找提供器，可以取得可用的注册表元素。通过 `RegistryOps#create` 创建它，需要传入用于保存数据的指定类型 `DynamicOps`，以及能够访问可用注册表的查找提供器。NeoForge 扩展了 `RegistryOps` 来创建 `ConditionalOps`，后者是可以处理[条目加载条件][conditions]的注册表 codec 查找。

```java
// 假设 lookupProvider 是 HolderLookup.Provider
// 假设 exampleCodec 表示 Codec<ExampleJavaObject>
// 假设 exampleObject 是 ExampleJavaObject
// 假设 exampleJson 是 JsonElement

// 取得用于 JsonElement 的注册表 ops
RegistryOps<JsonElement> ops = RegistryOps.create(JsonOps.INSTANCE, lookupProvider);

// 把 Java 对象编码为 JsonElement
exampleCodec.encodeStart(ops, exampleObject);

// 把 JsonElement 解码为 Java 对象
exampleCodec.parse(ops, exampleJson);
```

#### 格式转换

`DynamicOps` 也可以单独用于在两种编码格式之间转换。通过 `#convertTo` 并传入目标 `DynamicOps` 格式及要转换的编码对象即可完成。

```java
// 把 Tag 转换为 JsonElement
// 假设 exampleTag 是 Tag
JsonElement convertedJson = NbtOps.INSTANCE.convertTo(JsonOps.INSTANCE, exampleTag);
```

### `DataResult`

通过 codec 编码或解码数据会返回 `DataResult`。它保存转换后的实例，或根据转换是否成功保存错误数据。转换成功时，`#result` 返回的 `Optional` 包含成功转换的对象；转换失败时，`#error` 返回的 `Optional` 包含 `PartialResult`，其中保存错误消息以及 codec 可能生成的部分转换对象。

此外，`DataResult` 还提供许多方法，可以把结果或错误转换成所需格式。例如，`#resultOrPartial` 会在成功时返回包含结果的 `Optional`，失败时返回部分转换对象。该方法接收一个字符串消费者，用来决定如何报告错误消息（如果存在）。

```java
// 假设 exampleCodec 表示 Codec<ExampleJavaObject>
// 假设 exampleJson 是 JsonElement

// 把 JsonElement 解码为 Java 对象
DataResult<ExampleJavaObject> result = exampleCodec.parse(JsonOps.INSTANCE, exampleJson);

result
    // 成功时取得结果，失败时取得部分结果并报告错误消息
    .resultOrPartial(errorMessage -> /* 处理错误消息 */)
    // 如果存在结果或部分结果，就执行操作
    .ifPresent(decodedObject -> /* 处理解码后的对象 */);
```

## 现有 Codec

### 基本类型

`Codec` 类为一些定义好的基本类型提供静态 codec 实例。

Codec         | Java 类型
:---:         | :---
`BOOL`        | `Boolean`
`BYTE`        | `Byte`
`SHORT`       | `Short`
`INT`         | `Integer`
`LONG`        | `Long`
`FLOAT`       | `Float`
`DOUBLE`      | `Double`
`STRING`      | `String`\*
`BYTE_BUFFER` | `ByteBuffer`
`INT_STREAM`  | `IntStream`
`LONG_STREAM` | `LongStream`
`PASSTHROUGH` | `Dynamic<?>`\*\*
`EMPTY`       | `Unit`\*\*\*

\* `String` 可以通过 `Codec#string` 或 `Codec#sizeLimitedString` 限制字符数量。

\*\* `Dynamic` 是一个对象，保存以受支持 `DynamicOps` 格式编码的值。它通常用于把一种编码对象格式转换为另一种编码对象格式。

\*\*\* `Unit` 是用于表示 null 对象的对象。

### 原版与 NeoForge

Minecraft 和 NeoForge 为许多经常需要编码和解码的对象定义了 codec。例如，`Identifier#CODEC` 用于 `Identifier`，`ExtraCodecs#INSTANT_ISO8601` 用于 `DateTimeFormatter#ISO_INSTANT` 格式的 `Instant`，`CompoundTag#CODEC` 用于 `CompoundTag`。

:::caution
`CompoundTag` 无法使用 `JsonOps` 从 JSON 解码数字列表。`JsonOps` 在转换时会把数字设为最窄的类型，而 `ListTag` 强制其数据使用同一种类型，因此类型不同的数字（例如 `64` 会变成 byte，`384` 会变成 short）会在转换时抛出错误。
:::

原版和 NeoForge 注册表也为其包含的对象类型提供 codec（例如 `BuiltInRegistries#BLOCK` 具有 `Codec<Block>`）。`Registry#byNameCodec` 会把注册表对象编码为其注册名。原版注册表还提供 `Registry#holderByNameCodec`，它会编码为注册名，并把注册名解码为包装在 `Holder` 中的注册表对象。

## 创建 Codec

可以为任何对象创建用于编码和解码的 codec。为便于理解，下面同时展示等价的编码后 JSON。

### 记录类型 {#records}

Codec 可以通过 record 定义对象。每个 record codec 都用显式命名字段定义对象。创建 record codec 有多种方式，最简单的是使用 `RecordCodecBuilder#create`。

`RecordCodecBuilder#create` 接收一个定义 `Instance` 的函数，并返回对象的应用（`App`）。可以把这一过程类比为创建类*实例*，再用构造器把类*应用*到构造出的对象上。

```java
// 要为其创建 codec 的某个对象
public class SomeObject {

    public SomeObject(String s, int i, boolean b) { /* ... */ }

    public String s() { /* ... */ }

    public int i() { /* ... */ }

    public boolean b() { /* ... */ }
}
```

#### 字段 {#fields}

`Instance` 可以通过 `#group` 定义最多 16 个字段。每个字段都必须是应用，用于定义正在构造的对象实例以及对象类型。最简单的做法是取得一个 `Codec`，设置编码数据中用于解码的字段名，再设置编码字段时使用的 getter。

如果字段是必需的，可以用 `#fieldOf` 从 `Codec` 创建；如果字段包装在 `Optional` 中或具有默认值，则使用 `#optionalFieldOf`。两个方法都需要编码对象中字段名的字符串。随后通过 `#forGetter` 设置编码该字段时使用的 getter，它接收一个函数，给定对象并返回字段数据。

:::warning
如果某个元素在解析时抛出错误，`#optionalFieldOf` 也会抛出错误。如果希望消费该错误，请改用 `#lenientOptionalFieldOf`。
:::

之后，可以通过 `#apply` 应用得到的 product，定义实例应如何构造对象。为方便起见，分组字段的顺序应与构造器参数顺序一致，这样可以直接传入构造器方法引用。

```java
public static final Codec<SomeObject> RECORD_CODEC = RecordCodecBuilder.create(instance -> // 给定实例
    instance.group( // 定义实例中的字段
        Codec.STRING.fieldOf("s").forGetter(SomeObject::s), // String
        Codec.INT.optionalFieldOf("i", 0).forGetter(SomeObject::i), // Integer，字段不存在时默认为 0
        Codec.BOOL.fieldOf("b").forGetter(SomeObject::b) // Boolean
    ).apply(instance, SomeObject::new) // 定义如何创建对象
);
```

```json5
// SomeObject 的编码结果
{
    "s": "value",
    "i": 5,
    "b": false
}

// 另一个 SomeObject 编码结果
{
    "s": "value2",
    // 省略 i，默认为 0
    "b": true
}

// 另一个 SomeObject 编码结果
{
    "s": "value2",
    // 因为未使用 lenientOptionalFieldOf，这里会抛出错误
    "i": "bad_value",
    "b": true
}
```

### 转换器 {#transformer-codecs}

可以通过映射方法把 codec 转换为等价或部分等价的表示。每个映射方法接收两个函数：一个把当前类型转换为新类型，另一个把新类型转换回当前类型。这通过 `#xmap` 完成。

```java
// 一个类
public class ClassA {

    public ClassB toB() { /* ... */ }
}

// 另一个等价的类
public class ClassB {

    public ClassA toA() { /* ... */ }
}

// 假设存在某个 codec A_CODEC
public static final Codec<ClassB> B_CODEC = A_CODEC.xmap(ClassA::toB, ClassB::toA);
```

如果类型只是部分等价，即转换过程中存在限制，可以使用返回 `DataResult` 的映射函数，在遇到异常或无效状态时返回错误。

A 与 B 完全等价 | B 与 A 完全等价 | 转换方法
:---:            | :---:            | :---
是               | 是               | `#xmap`
是               | 否               | `#flatComapMap`
否               | 是               | `#comapFlatMap`
否               | 否               | `#flatXMap`

```java
// 给定字符串 codec 并转换为整数
// 并非所有字符串都能变成整数（A 与 B 不完全等价）
// 所有整数都能变成字符串（B 与 A 完全等价）
public static final Codec<Integer> INT_CODEC = Codec.STRING.comapFlatMap(
    s -> { // 失败时返回包含错误的 data result
        try {
            return DataResult.success(Integer.valueOf(s));
        } catch (NumberFormatException e) {
            return DataResult.error(s + " is not an integer.");
        }
    },
    Integer::toString // 普通函数
);
```

```json5
// 返回 5
"5"

// 抛出错误，因为不是整数
"value"
```

#### 范围 Codec

范围 codec 是 `#flatXMap` 的一种实现。如果值不在设定的最小值和最大值之间（含边界），它会返回错误 `DataResult`。如果值越界，仍会把它作为部分结果提供。整数、float 和 double 分别通过 `#intRange`、`#floatRange` 和 `#doubleRange` 提供实现。

```java
public static final Codec<Integer> RANGE_CODEC = Codec.intRange(0, 4); 
```

```json5
// 有效，位于 [0, 4] 内
4

// 抛出错误，位于 [0, 4] 外
5
```

#### 字符串解析器

`Codec#stringResolver` 是 `flatXmap` 的一种实现，把字符串映射为某种对象。

```java
public record StringResolverObject(String name) { /* ... */ }

// 假设存在某个 Map<String, StringResolverObject> OBJECT_MAP
public static final Codec<StringResolverObject> STRING_RESOLVER_CODEC = Codec.stringResolver(StringResolverObject::name, OBJECT_MAP::get);
```

```json5
// 把此字符串映射到关联对象
"example_name"
```

### 默认值

如果编码或解码失败，可以通过 `Codec#orElse` 或 `Codec#orElseGet` 提供默认值。

```java
public static final Codec<Integer> DEFAULT_CODEC = Codec.INT.orElse(
    errorMessage -> /* 处理错误消息 */,
    0 // 也可以通过 #orElseGet 提供值
); 
```

```json5
// 不是整数，默认为 0
"value"
```

### 单位

如果一个 codec 提供代码中的值，并且编码时不产生任何数据，可以使用 `MapCodec#unitCodec` 表示。当数据对象包含不可编码的条目时，这很有用。

```java
public static final Codec<IEventBus> UNIT_CODEC = MapCodec.unitCodec(
    () -> NeoForge.EVENT_BUS // 也可以直接提供原始值
);
```

```json5
// 此处为空，解码时会返回 NeoForge 事件总线
```

### 延迟初始化

有些 codec 可能依赖构造时尚不存在的数据。在这些情况下，可以使用 `Codec#lazyInitialized`，让 codec 在首次编码/解码时构造自身。该方法接收一个提供 codec 的 supplier。

```java
public static final Codec<IEventBus> LAZY_CODEC = Codec.lazyInitialized(
    () -> MapCodec.unitCodec(NeoForge.EVENT_BUS)
);
```

```json5
// 此处为空，解码时会返回 NeoForge 事件总线
// 编码/解码结果与普通 codec 相同
```

### 列表

可以通过 `Codec#listOf` 从对象 codec 生成对象列表 codec。`listOf` 还可以接收整数，表示列表的最小和最大长度。`sizeLimitedListOf` 作用相同，但只指定最大长度。

```java
// BlockPos#CODEC 是 Codec<BlockPos>
public static final Codec<List<BlockPos>> LIST_CODEC = BlockPos.CODEC.listOf();
```

```json5
// List<BlockPos> 的编码结果
[
    [1, 2, 3], // BlockPos(1, 2, 3)
    [4, 5, 6], // BlockPos(4, 5, 6)
    [7, 8, 9]  // BlockPos(7, 8, 9)
]
```

通过列表 codec 解码得到的列表对象保存在**不可变**列表中。如果需要可变列表，应对列表 codec 应用[转换器]。

### 映射

可以通过 `Codec#unboundedMap` 从两个 codec 生成键和值对象的映射 codec。无界映射允许使用任何基于字符串或能转换为字符串的值作为键。

```java
// BlockPos#CODEC 是 Codec<BlockPos>
public static final Codec<Map<String, BlockPos>> MAP_CODEC = Codec.unboundedMap(Codec.STRING, BlockPos.CODEC);
```

```json5
// Map<String, BlockPos> 的编码结果
{
    "key1": [1, 2, 3], // key1 -> BlockPos(1, 2, 3)
    "key2": [4, 5, 6], // key2 -> BlockPos(4, 5, 6)
    "key3": [7, 8, 9]  // key3 -> BlockPos(7, 8, 9)
}
```

通过无界映射 codec 解码得到的映射对象保存在**不可变**映射中。如果需要可变映射，应对映射 codec 应用[转换器]。

:::caution
无界映射只支持能够与字符串相互编码/解码的键。可以使用键值[对][pair]列表 codec 绕过这一限制。
:::

### 对 {#pair}

可以通过 `Codec#pair` 从两个 codec 生成对象对的 codec。

对 codec 解码对象时，先解码对中的左侧对象，再从编码对象的剩余部分解码右侧对象。因此，这些 codec 要么必须能在解码后表达编码对象的某些信息（例如[记录类型][records]），要么必须被增强为 `MapCodec`，再通过 `#codec` 转换为普通 codec。通常可以把 codec 设为某个对象的[字段][field]来实现。

```java
public static final Codec<Pair<Integer, String>> PAIR_CODEC = Codec.pair(
    Codec.INT.fieldOf("left").codec(),
    Codec.STRING.fieldOf("right").codec()
);
```

```json5
// Pair<Integer, String> 的编码结果
{
    "left": 5,       // fieldOf 为左侧对象查找 'left' 键
    "right": "value" // fieldOf 为右侧对象查找 'right' 键
}
```

:::tip
如果 map codec 使用非字符串键，可以先编码为键值对列表，再应用[转换器]进行编码/解码。
:::

### Either {#either}

可以通过 `Codec#either` 从两个 codec 生成同一个对象数据的两种编码/解码方式。

Either codec 会先用第一个 codec 尝试解码对象；如果失败，再用第二个 codec 尝试。如果两者都失败，`DataResult` 只会包含第二个 codec 失败产生的错误。

```java
public static final Codec<Either<Integer, String>> EITHER_CODEC = Codec.either(
    Codec.INT,
    Codec.STRING
);
```

```json5
// Either.Left<Integer, String> 的编码结果
5

// Either.Right<Integer, String> 的编码结果
"value"
```

:::tip
可以把它和[转换器]一起使用，通过两种不同编码方式取得特定对象。
:::

#### Xor

`Codec#xor` 是 [either] codec 的特殊情况：只有两种方式中恰好一种处理成功时，结果才成功。如果两个 codec 都能处理，反而会抛出错误。

```java
public static final Codec<Either<Integer, String>> XOR_CODEC = Codec.xor(
    Codec.INT.fieldOf("number").codec(),
    Codec.STRING.fieldOf("text").codec()
);
```

```json5
// Either.Left<Integer, String> 的编码结果
{
    "number": 4
}

// Either.Right<Integer, String> 的编码结果
{
    "text": "value"
}

// 两者都能解码，因此抛出错误
{
    "number": 4,
    "text": "value"
}
```

#### Alternative

`Codec#withAlternative` 是 [either] codec 的特殊情况：两个 codec 都尝试解码同一个对象，但对象存储格式不同。第一个（主）codec 会尝试解码对象，失败时改用第二个 codec。编码时始终使用主 codec。

```java
public static final Codec<BlockPos> ALTERNATIVE_CODEC = Codec.withAlternative(
    BlockPos.CODEC,
    RecordCodecBuilder.create(instance -> instance.group(
        Codec.INT.fieldOf("x").forGetter(BlockPos::getX),
        Codec.INT.fieldOf("y").forGetter(BlockPos::getY),
        Codec.INT.fieldOf("z").forGetter(BlockPos::getZ)
    ), BlockPos::new)
);
```

```json5
// 解码 BlockPos 的普通方式
[ 1, 2, 3 ]

// 解码 BlockPos 的替代方式
{
    "x": 1,
    "y": 2,
    "z": 3
}
```

### 递归

有时对象会以字段形式引用同一类型的对象。例如，`EntityPredicate` 为载具、乘客和目标实体分别接收一个 `EntityPredicate`。此时可以使用 `Codec#recursive`，在创建 codec 的函数中提供该 codec 本身。

```java
// 定义递归对象
public record RecursiveObject(Optional<RecursiveObject> inner) { /* ... */ }

public static final Codec<RecursiveObject> RECURSIVE_CODEC = Codec.recursive(
    RecursiveObject.class.getSimpleName(), // 用于 toString 方法
    recursedCodec -> RecordCodecBuilder.create(instance -> instance.group(
        recursedCodec.optionalFieldOf("inner").forGetter(RecursiveObject::inner)
    ).apply(instance, RecursiveObject::new))
);
```

```json5
// 递归对象的编码结果
{
    "inner": {
        "inner": {}
    }
}
```

### 分发

Codec 可以包含子 codec，并根据某种指定类型解码特定对象。这通过 `Codec#dispatch` 完成，常用于包含 codec 的注册表，例如规则测试或方块放置器。

分发 codec 首先从某个字符串键（通常是 `type`）取得编码类型。随后解码类型，并调用 getter 取得用于解码实际对象的特定 codec。如果解码所用的 `DynamicOps` 会压缩映射，或者对象 codec 本身没有被增强为 `MapCodec`（例如 record 或带字段的基本类型），对象就需要保存在 `value` 键中。否则，对象与其他数据处于同一层级进行解码。

```java
// 定义对象
public abstract class ExampleObject {

    // 定义编码时用于指定对象类型的方法
    public abstract MapCodec<? extends ExampleObject> type();
}

// 创建只保存字符串的简单对象
public class StringObject extends ExampleObject {

    public StringObject(String s) { /* ... */ }

    public String s() { /* ... */ }

    public MapCodec<? extends ExampleObject> type() {
        // 已注册的注册表对象
        // "string":
        //   Codec.STRING.xmap(StringObject::new, StringObject::s).fieldOf("string")
        return STRING_OBJECT_CODEC.get();
    }
}

// 创建保存字符串和整数的复杂对象
public class ComplexObject extends ExampleObject {

    public ComplexObject(String s, int i) { /* ... */ }

    public String s() { /* ... */ }

    public int i() { /* ... */ }

    public MapCodec<? extends ExampleObject> type() {
        // 已注册的注册表对象
        // "complex":
        //   RecordCodecBuilder.mapCodec(instance ->
        //     instance.group(
        //       Codec.STRING.fieldOf("s").forGetter(ComplexObject::s),
        //       Codec.INT.fieldOf("i").forGetter(ComplexObject::i)
        //     ).apply(instance, ComplexObject::new)
        //   )
        return COMPLEX_OBJECT_CODEC.get();
    }
}

// 假设存在 Registry<MapCodec<? extends ExampleObject>> DISPATCH
public static final Codec<ExampleObject> = DISPATCH.byNameCodec() // 取得 Codec<MapCodec<? extends ExampleObject>>
    .dispatch(
        ExampleObject::type, // 从特定对象取得 codec
        Function.identity() // 从注册表取得 codec
    );
```

```json5
// 简单对象
{
    "type": "string", // StringObject
    "value": "value" // codec 类型不是由 MapCodec 增强而来，需要字段
}

// 复杂对象
{
    "type": "complex", // ComplexObject

    // codec 类型由 MapCodec 增强而来，可以内联
    "s": "value",
    "i": 0
}
```

[DataFixerUpper]: https://github.com/Mojang/DataFixerUpper
[gson]: https://github.com/google/gson
[conditions]: ../resources/server/conditions.md
[transformer]: #transformer-codecs
[pair]: #pair
[records]: #records
[field]: #fields
[either]: #either
