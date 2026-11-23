---
sidebar_position: 2
---
# 流编解码器 {#stream-codecs}

流编解码器是一种序列化工具，用于描述对象应如何写入流，以及如何从流中读取。这里的流通常是缓冲区。流编解码器主要供原版[网络系统][networking]同步数据使用。

:::info
流编解码器与 [Codec 编解码器][codecs]大致类似，因此本页采用相同的排版方式，以便比较两者的相似之处。
:::

## 使用流编解码器 {#using-stream-codecs}

流编解码器分别通过 `StreamCodec#encode` 和 `StreamCodec#decode` 把对象编码到流中，或从流中解码对象。`encode` 接收流以及要编码到流中的对象；`decode` 接收流并返回解码出的对象。流通常是 `ByteBuf`、`FriendlyByteBuf` 或 `RegistryFriendlyByteBuf`。

```java
// 设 exampleStreamCodec 为一个 StreamCodec<ExampleJavaObject>
// 设 exampleObject 为一个 ExampleJavaObject
// 设 buffer 为一个 RegistryFriendlyByteBuf

// 把 Java 对象编码到缓冲区流中
exampleStreamCodec.encode(buffer, exampleObject);

// 从缓冲区流中读取 Java 对象
ExampleJavaObject obj = exampleStreamCodec.decode(buffer);
```

:::note
除非需要手动处理缓冲区对象，否则通常不会直接调用 `encode` 和 `decode`。
:::

## 现有流编解码器 {#existing-stream-codecs}

### `ByteBufCodecs` {#bytebufcodecs}

`ByteBufCodecs` 包含用于某些基本类型和对象的静态编解码器实例。

| 流编解码器 | Java 类型 |
|------------|-----------|
| `BOOL` | `Boolean` |
| `BYTE` | `Byte` |
| `SHORT` | `Short` |
| `INT` | `Integer` |
| `LONG` | `Long` |
| `FLOAT` | `Float` |
| `DOUBLE` | `Double` |
| `BYTE_ARRAY` | `byte[]`\* |
| `LONG_ARRAY` | `long[]` |
| `STRING_UTF8` | `String`\*\* |
| `TAG` | `Tag` |
| `COMPOUND_TAG` | `CompoundTag` |
| `VECTOR3F` | `Vector3fc` |
| `QUATERNIONF` | `Quaternionfc` |
| `GAME_PROFILE` | `GameProfile` |

\* 可以通过 `ByteBufCodecs#byteArray` 限制 `byte[]` 的元素数量。

\*\* 可以通过 `ByteBufCodecs#stringUtf8` 限制 `String` 的字符数量。

此外，还有一些静态实例使用不同的方法编码和解码基本类型或对象。

#### 无符号短整数 {#unsigned-shorts}

`UNSIGNED_SHORT` 是 `SHORT` 的替代方案，应作为无符号数处理。由于 Java 中的数值类型有符号，无符号短整数会以 `Integer` 发送和接收，并清除高两个字节。

#### 可变长度整数 {#variable-sized-number}

`VAR_INT` 和 `VAR_LONG` 是会把数值编码得尽可能小的流编解码器。它们每次编码七位，并使用最高位标记该数值是否还有后续数据。对于整数，0 到 2^28 - 1 之间的数值；对于长整数，0 到 2^56 - 1 之间的数值，会以不超过整数或长整数本身字节数的长度发送。如果数值通常处于这些范围内，并且大多位于范围较低的一端，就应使用这些可变长度流编解码器。

:::note
`VAR_INT` 和 `VAR_LONG` 分别是 `INT` 和 `LONG` 的替代方案。
:::

#### 可信标签 {#trusted-tags}

`TRUSTED_TAG` 和 `TRUSTED_COMPOUND_TAG` 分别是 `TAG` 和 `COMPOUND_TAG` 的变体。后者最多允许分配 2 MiB 内存，而可信变体没有为解码标签设置堆内存上限。可信标签流编解码器最好只用于服务端发往客户端的数据包，例如原版用于[方块实体数据包][blockentity]和[实体数据序列化器][entity]的方式。

如果需要使用其他上限，可以通过 `ByteBufCodecs#tagCodec` 或 `#compoundTagCodec` 传入指定大小的 `NbtAccounter`。还可以使用 `#optionalTagCodec` 取得包装在 `Optional` 中的 `Tag`。

#### 宽松 JSON {#lenient-json}

`ByteBufCodecs#lenientJson` 可以处理任意 `JsonElement`，允许 `nan`、`infinite` 等多种浮点数表示方式，也允许多个顶层对象。它接收 JSON 允许的最大长度。

### 原版与 NeoForge {#vanilla-and-neoforge}

Minecraft 和 NeoForge 为许多经常编码和解码的对象定义了流编解码器。例如，`Identifier` 使用 `Identifier#STREAM_CODEC`，`ChunkPos` 使用 `NeoForgeStreamCodecs#CHUNK_POS`。

大部分流编解码器都可以在对象自己的类中，或 `StreamCodec`、`ByteBufCodecs`、`NeoForgeStreamCodecs` 中找到。

## 创建流编解码器 {#creating-stream-codecs}

可以为任意对象创建向流读取或写入的流编解码器。本文主要关注以缓冲区为流的用法，因为这是它的主要用途。

流编解码器有两个泛型：`B` 表示缓冲区，`V` 表示对象值。`B` 通常为 `ByteBuf`、`FriendlyByteBuf` 或 `RegistryFriendlyByteBuf` 之一，三者依次继承。`FriendlyByteBuf` 增加了 Minecraft 专用的读写方法；`RegistryFriendlyByteBuf` 则提供对注册表列表及其对象的访问。

构造流编解码器时，`B` 应选择能够完成读写的最小缓冲区类型。例如，`Identifier` 会按字符串发送，而普通 `ByteBuf` 已支持字符串，因此类型应为 `StreamCodec<ByteBuf, Identifier>`。`FriendlyByteBuf` 提供写入 `ChunkPos` 的方法，因此类型应为 `StreamCodec<FriendlyByteBuf, ChunkPos>`。`Item` 需要访问注册表，因此类型应为 `StreamCodec<RegistryFriendlyByteBuf, Item>`。

大多数接收流编解码器的方法会把缓冲区类型声明为 `? super B`，因此当实际缓冲区是 `RegistryFriendlyByteBuf` 时，上面三种流编解码器都可以使用。

### 成员编码器 {#member-encoders}

`StreamMemberEncoder` 是 `StreamEncoder` 的替代方案，只是把编码对象放在第一位，把缓冲区放在第二位。它通常用于编码对象自身包含实例方法、可直接写入缓冲区的情况。可以调用 `StreamCodec#ofMember`，使用 `StreamMemberEncoder` 创建 `StreamCodec`。

```java
// 要为其创建流编解码器的对象
public class ExampleObject {
    
    // 普通构造函数
    public ExampleObject(String arg1, int arg2, boolean arg3) { /* ... */ }

    // 流解码器引用
    public ExampleObject(ByteBuf buffer) { /* ... */ }

    // 流编码器引用
    public void encode(ByteBuf buffer) { /* ... */ }
}

// 生成的流编解码器
public static StreamCodec<ByteBuf, ExampleObject> STREAM_CODEC =
    StreamCodec.ofMember(ExampleObject::encode, ExampleObject::new);
```

### 组合 {#composites}

流编解码器可以通过 `StreamCodec#composite` 读写对象。每个组合流编解码器都按给定顺序定义一组用于读写的流编解码器和取值函数。`composite` 最多提供十二个参数的重载。

`composite` 中每两个参数表示一个字段：用于读写该字段的流编解码器，以及从对象中取得该字段值的函数。最后一个参数是在解码时创建对象实例的函数。

```java
// 要为其创建流编解码器的对象
public record SimpleExample(String arg1, int arg2, boolean arg3) {}
public record RegistryExample(double arg1, Holder<Item> arg2) {}

// 流编解码器
public static final StreamCodec<ByteBuf, SimpleExample> SIMPLE_STREAM_CODEC =
    StreamCodec.composite(
        // 流编解码器与取值函数组成的参数对
        ByteBufCodecs.STRING_UTF8, SimpleExample::arg1,
        ByteBufCodecs.VAR_INT, SimpleExample::arg2,
        ByteBufCodecs.BOOL, SimpleExample::arg3,
        SimpleExample::new
    );

// 由于包含 holder，因此使用 RegistryFriendlyByteBuf
public static final StreamCodec<RegistryFriendlyByteBuf, RegistryExample> REGISTRY_STREAM_CODEC =
    StreamCodec.composite(
        // ByteBuf 流编解码器可以在这里使用
        ByteBufCodecs.DOUBLE, RegistryExample::arg1,
        ByteBufCodecs.holderRegistry(Registries.ITEM), RegistryExample::arg2,
        RegistryExample::new
    );
```

### 转换器 {#transformers}

可以通过映射方法把流编解码器转换为等价或部分等价的表示。其中两个方法映射对象值，另一个方法映射缓冲区。

`map` 方法使用两个函数转换对象值：一个把当前类型转换为新类型，另一个把新类型转换回当前类型。它类似于 [Codec 转换器][transformers]。

```java
public static final StreamCodec<ByteBuf, Identifier> STREAM_CODEC = 
    ByteBufCodecs.STRING_UTF8.map(
        // String -> Identifier
        Identifier::new,
        // Identifier -> String
        Identifier::toString
    );
```

`apply` 方法使用 `StreamCodec.CodecOperation` 转换对象值。`StreamCodec.CodecOperation` 接收当前类型的流编解码器，并返回新类型的流编解码器。这类方法通常封装 `map`，或接收辅助方法。

```java
public static final StreamCodec<ByteBuf, List<Identifier>> STREAM_CODEC =
    Identifier.STREAM_CODEC.apply(ByteBufCodecs.list());
```

`mapStream` 方法使用函数转换缓冲区：函数接收新缓冲区类型，并返回当前缓冲区类型。大多数接收流编解码器的方法不需要改变缓冲区类型，因此很少需要使用此方法。

```java
public static final StreamCodec<RegistryFriendlyByteBuf, Integer> STREAM_CODEC =
    ByteBufCodecs.VAR_INT.mapStream(buffer -> (ByteBuf) buffer);
```

### 单位值 {#unit}

只提供代码中固定值、不写入任何数据的流编解码器，可以通过 `StreamCodec#unit` 表示。如果不需要通过网络同步任何信息，就可以使用它。

:::warning
单位值流编解码器要求被编码的对象必须与指定的单位值相等，否则会抛出错误。因此，对象必须具有合适的 `equals` 实现，使单位值对象返回 `true`；或者在编码时始终传入提供给流编解码器的同一个实例。
:::

```java
public static final StreamCodec<ByteBuf, Item> UNIT_STREAM_CODEC =
    StreamCodec.unit(Items.AIR);
```

### 延迟初始化 {#lazy-initialized}

有时，流编解码器可能依赖构造时尚不存在的数据。此时可以使用 `NeoForgeStreamCodecs#lazy`，让流编解码器在第一次读写时再构造自身。该方法接收一个提供流编解码器的 `Supplier`。

```java
public static final StreamCodec<ByteBuf, Item> LAZY_STREAM_CODEC = 
    NeoForgeStreamCodecs.lazy(
        () -> StreamCodec.unit(Items.AIR)
    );
```

### 集合 {#collections}

可以通过 `collection`，基于对象的流编解码器生成集合的流编解码器。`collection` 接收一个用于构造空集合的 `IntFunction`、对象的流编解码器，以及可选的最大长度。

```java
public static final StreamCodec<ByteBuf, Set<BlockPos>> COLLECTION_STREAM_CODEC =
    ByteBufCodecs.collection(
        HashSet::new, // 构造具有指定容量的集合
        BlockPos.STREAM_CODEC,
        256 // 集合最多包含 256 个元素
    );
```

还可以通过 `StreamCodec#apply` 使用 `collection` 的另一个重载：

```java
public static final StreamCodec<ByteBuf, Set<BlockPos>> COLLECTION_STREAM_CODEC =
    BlockPos.STREAM_CODEC.apply(
        ByteBufCodecs.collection(HashSet::new)
    );
```

列表类集合也可以在 `StreamCodec#apply` 中调用 `ByteBufCodecs#list` 来生成，并可以指定最大长度：

```java
public static final StreamCodec<ByteBuf, List<BlockPos>> LIST_STREAM_CODEC =
    BlockPos.STREAM_CODEC.apply(
        // 列表最多包含 256 个元素
        ByteBufCodecs.list(256)
    );
```

### 映射 {#map}

可以通过 `ByteBufCodecs#map` 和两个流编解码器生成键值映射的流编解码器。该函数还接收一个用于构造空映射的 `IntFunction` 和可选的最大尺寸。

```java
public static final StreamCodec<ByteBuf, Map<String, BlockPos>> MAP_STREAM_CODEC =
    ByteBufCodecs.map(
        HashMap::new, // 构造具有指定容量的映射
        ByteBufCodecs.STRING_UTF8,
        BlockPos.STREAM_CODEC,
        256 // 映射最多包含 256 个元素
    );
```

### Either {#either}

如果需要用两种不同的方式读写对象数据，可以通过 `ByteBufCodecs#either` 和两个流编解码器生成流编解码器。该方法会先读写一个布尔值，表示接下来使用第一个还是第二个流编解码器。

```java
public static final StreamCodec<ByteBuf, Either<Integer, String>> EITHER_STREAM_CODEC = 
    ByteBufCodecs.either(
        ByteBufCodecs.VAR_INT,
        ByteBufCodecs.STRING_UTF8
    );
```

### ID 映射器 {#id-mapper}

在网络上发送两端都存在的对象时，通常只发送表示对象 ID 的整数，以减少需要同步的信息量。枚举和注册表都采用了这种方式。

`ByteBufCodecs#idMapper` 提供了一种发送对象 ID 的便捷方式。它可以接收两个分别把对象转换为整数、把整数转换回对象的函数，也可以接收一个 `IdMap`。

```java
// 某个枚举
public enum ExampleIdObject {
    ;

    // ID -> 枚举值
    public static final IntFunction<ExampleIdObject> BY_ID = 
        ByIdMap.continuous(
            ExampleIdObject::getId,
            ExampleIdObject.values(),
            ByIdMap.OutOfBoundsStrategy.ZERO
    );
    
    ExampleIdObject(int id) { /* ... */ }
}

// 生成的流编解码器
public static final StreamCodec<ByteBuf, ExampleIdObject> ID_STREAM_CODEC =
    ByteBufCodecs.idMapper(ExampleIdObject.BY_ID, ExampleIdObject::getId);
```

### 可选值 {#optional}

通过向 `ByteBufCodecs#optional` 传入流编解码器，可以生成用于发送 `Optional` 包装值的流编解码器。该方法会先读写一个布尔值，表示是否存在要读写的对象。

```java
public static final StreamCodec<RegistryFriendlyByteBuf, Optional<DataComponentType<?>>> OPTIONAL_STREAM_CODEC =
    DataComponentType.STREAM_CODEC.apply(ByteBufCodecs::optional);
```

### 注册表对象 {#registry-objects}

可以通过三种方法发送注册表对象：`registry`、`holderRegistry` 和 `holder`。每种方法都接收一个 `ResourceKey`，表示注册表对象所属的注册表。

:::warning
自定义注册表必须通过调用 `RegistryBuilder#sync` 并把值设为 `true` 来启用同步，否则编码器会抛出异常。
:::

`registry` 返回注册表对象；`holderRegistry` 返回由 holder 包装的注册表对象。这两种方法都会发送表示注册表对象的 ID。

```java
// 注册表对象
public static final StreamCodec<RegistryFriendlyByteBuf, Item> VALUE_STREAM_CODEC =
    ByteBufCodecs.registry(Registries.ITEM);

// 注册表对象的 holder
public static final StreamCodec<RegistryFriendlyByteBuf, Holder<Item>> HOLDER_STREAM_CODEC =
    ByteBufCodecs.holderRegistry(Registries.ITEM);
```

`holder` 返回由 holder 包装的注册表对象。该方法会发送表示注册表对象的 ID；如果提供的 `Holder` 是直接引用，则发送注册表对象本身。为此，`holder` 还接收注册表对象的流编解码器。

```java
public static final StreamCodec<RegistryFriendlyByteBuf, Holder<SoundEvent>> STREAM_CODEC =
    ByteBufCodecs.holder(
        Registries.SOUND_EVENT, SoundEvent.DIRECT_STREAM_CODEC
    );
```

:::note
只有在 holder 不是直接引用时，`holder` 才会因自定义注册表未启用同步而抛出异常。
:::

### Holder 集合 {#holder-sets}

可以使用 `holderSet` 发送标签或 holder 包装的注册表对象集合。该方法接收一个 `ResourceKey`，表示注册表对象所属的注册表。

```java
public static final StreamCodec<RegistryFriendlyByteBuf, HolderSet<Item>> HOLDER_SET_STREAM_CODEC =
    ByteBufCodecs.holderSet(Registries.ITEM);
```

### 递归对象 {#recursive}

有时，对象的字段可能引用同一类型的对象。例如，如果 `MobEffectInstance` 具有隐藏效果，就会接收一个可选的 `MobEffectInstance`。此时可以使用 `StreamCodec#recursive`，在构造流编解码器的函数中把自己作为参数提供。

```java
// 定义递归对象
public record RecursiveObject(Optional<RecursiveObject> inner) { /* ... */ }

public static final StreamCodec<ByteBuf, RecursiveObject> RECURSIVE_CODEC = StreamCodec.recursive(
    recursedStreamCodec -> StreamCodec.composite(
        recursedStreamCodec.apply(ByteBufCodecs::optional),
        RecursiveObject::inner,
        RecursiveObject::new
    )
);
```

### 分派 {#dispatch}

流编解码器可以通过 `StreamCodec#dispatch` 根据指定类型，把对象分派给不同的子流编解码器。这通常用于表示类型的注册表对象，例如 `ParticleOptions` 使用的 `ParticleType`，或 `Stat` 使用的 `StatType`。

分派流编解码器会先尝试读写类型对象，然后使用方法中提供的函数之一读写当前对象。第一个 `Function` 接收当前对象并返回用于写入值的类型对象；第二个 `Function` 接收类型对象并返回用于读取当前对象的 `StreamCodec`。

```java
// 定义对象
public abstract class ExampleObject {

    // 定义用于指定编码对象类型的方法
    public abstract StreamCodec<? super RegistryFriendlyByteBuf, ? extends ExampleObject> streamCodec();
}

// 假设存在 DISPATCH，类型为 ResourceKey<StreamCodec<? super RegistryFriendlyByteBuf, ? extends ExampleObject>>
public static final StreamCodec<RegistryFriendlyByteBuf, ExampleObject> DISPATCH_STREAM_CODEC =
    ByteBufCodecs.registry(DISPATCH).dispatch(
        // 从特定对象取得流编解码器
        ExampleObject::streamCodec,
        // 从注册表对象取得流编解码器
        Function.identity()
    );
```

[networking]: payload.md
[codecs]: ../datastorage/codecs.md
[blockentity]: ../blockentities/index.md#syncing-on-block-update
[entity]: ../entities/data.md
[transformers]: ../datastorage/codecs.md#transformer-codecs
