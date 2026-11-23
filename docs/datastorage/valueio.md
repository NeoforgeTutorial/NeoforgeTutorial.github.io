---
sidebar_position: 3
---
# 值 I/O

值 I/O 系统是一种标准化的序列化方式，用于操作某个目标对象中的数据，例如 [NBT][nbt] 中的 `CompoundTag`。

## 输入与输出

值 I/O 系统由两部分组成：序列化时向对象写入数据的 `ValueOutput`，以及反序列化时从对象读取数据的 `ValueInput`。相关实现方法通常只接收 `ValueOutput` 或 `ValueInput`，不返回任何值。值 I/O 期望目标对象是字符串键到对象值的字典。通过提供的方法，值 I/O 随后从目标对象读取信息，或把信息写入其中。

```java
// 某个 BlockEntity 子类
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    // 向输出写入数据
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);
    // 从输入读取数据
}

// 某个 Entity 子类
@Override
protected void addAdditionalSaveData(ValueOutput output) {
    super.addAdditionalSaveData(output);
    // 向输出写入数据
}

@Override
protected void readAdditionalSaveData(ValueInput input) {
    super.readAdditionalSaveData(input);
    // 从输入读取数据
}
```

### 基本类型

值 I/O 提供读写若干基本类型的方法。`ValueOutput` 方法以 `put*` 为前缀，接收键和基本类型值。`ValueInput` 方法名为 `get*Or`，接收键以及值不存在时使用的默认值。

| Java 类型 | `ValueOutput` | `ValueInput` |
|:---------:|:-------------:|:------------:|
| `boolean` | `putBoolean` | `getBooleanOr` |
| `byte` | `putByte` | `getByteOr` |
| `short` | `putShort` | `getShortOr` |
| `int` | `putInt` | `getInt`\*、`getIntOr` |
| `long` | `putLong` | `getLong`\*、`getLongOr` |
| `float` | `putFloat` | `getFloatOr` |
| `double` | `putDouble` | `getDoubleOr` |
| `String` | `putString` | `getString`\*、`getStringOr` |
| `int[]` | `putIntArray` | `getIntArray`\* |

\* 这些 `ValueInput` 方法会返回包装在 `Optional` 中的基本类型，而不是接收并返回某个默认值。

```java
// 某个 BlockEntity 子类
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // 向输出写入数据
    output.putBoolean(
        // 字符串键
        "boolValue",
        // 与此键关联的值
        true
    );
    output.putString("stringValue", "Hello world!");
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // 从输入读取数据

    // 值不存在时默认为 false
    boolean boolValue = input.getBooleanOr(
        // 要读取的字符串键
        "boolValue",
        // 键不存在时返回的默认值
        false
    );

    // 值不存在时默认为 'Dummy!'
    String stringValue = input.getStringOr("stringValue", "Dummy!");
    // 返回包装在 Optional 中的值
    Optional<String> stringValueOpt = input.getString("stringValue");
}
```

### Codec

也可以使用 [`Codec`][codec] 向值 I/O 写入值或从中读取值。在原版中，所有 `Codec` 都由 `RegistryOps` 处理，因此可以保存数据包条目。`ValueOutput#store` 和 `storeNullable` 接收键、用于写入对象的 codec，以及对象本身。对象为 `null` 时，`storeNullable` 不会写入任何内容。`ValueInput#read` 接收键和 codec，返回包装在 `Optional` 中的对象。

```java
// 某个 BlockEntity 子类
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // 向输出写入数据
    output.storeNullable("codecValue", Rarity.CODEC, Rarity.EPIC);
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // 从输入读取数据
    Optional<Rarity> codecValue = input.read("codecValue", Rarity.CODEC);
}
```

`ValueOutput` 和 `ValueInput` 还为 `MapCodec` 提供 `store` / `read` 方法。与 `Codec` 相比，`MapCodec` 版本会把值合并到当前根值中。

```java
// 某个 BlockEntity 子类
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // 向输出写入数据
    output.store(
        SingleFile.MAP_CODEC,
        new SingleFile(Identifier.fromNamespaceAndPath("examplemod", "example"))
    );
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // 从输入读取数据

    // 因为值保存在根值访问中，所以不需要键
    Optional<SingleFile> file = input.read(SingleFile.MAP_CODEC);
    // 由于 `SingleFile` 写入了 `resource` 参数，所以这里能读到该值
    String resource = input.getStringOr("resource", "Not present!");
}
```

:::warning
`MapCodec` 会向值访问写入它包含的所有键，可能覆盖已有数据。务必保证 `MapCodec` 中的键与其他键不同。
:::

### 列表

创建和读取列表有两种方式：使用子值 I/O，或使用 [`Codec`][codec]。

通过 `ValueOutput#childrenList` 并传入某个键可以创建列表。它会返回 `ValueOutput.ValueOutputList`，这是一个只写的值对象列表。可以调用 `ValueOutputList#addChild` 向列表添加新值对象，该方法返回一个 `ValueOutput`，用于写入该值对象的数据。随后可以使用 `ValueInput#childrenList` 读取列表；值不存在时也可以用 `childrenListOrEmpty` 默认为空列表。这些方法返回 `ValueInput.ValueInputList`，它是只读的可迭代对象，也可以通过 `stream` 转为流。

```java
// 某个 BlockEntity 子类
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // 向输出写入数据

    // 创建列表
    ValueOutput.ValueOutputList listValue = output.childrenList("listValue");
    // 添加元素
    ValueOutput childIdx0 = listValue.addChild();
    childIdx0.putBoolean("boolChild", false);
    ValueOutput childIdx1 = listValue.addChild();
    childIdx1.putInt("boolChild", true);
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // 从输入读取数据

    // 读取列表中的值
    for (ValueInput childInput : input.childrenListOrEmpty("listValue")) {
        boolean boolChild = childInput.getBooleanOr("boolChild", false);
    }
}
```

`Codec` 可以通过 `ValueOutput#list` 为数据对象提供列表版本。该方法接收键和某个 `Codec`，返回 `ValueOutput.TypedOutputList`。`TypedOutputList` 与 `ValueOutputList` 基本相同，区别在于它直接操作数据对象，而不是使用另一个值 I/O。可以通过 `TypedOutputList#add` 添加元素。随后同样可以使用 `ValueInput#list` 或 `listOrEmpty` 读取列表，返回 `TypedValueInput`。

:::note
`TypedValueOutput` / `TypedValueInput` 与 `Codec#listOf` 的主要区别在于错误处理方式。使用 `Codec#listOf` 时，只要有一个条目失败，整个对象都会被标记为错误的 `DataResult`。类型化值 I/O 通常通过 `ProblemReporter` 处理错误。在原版中，`Codec#listOf` 的灵活性更高，因为 `ProblemReporter` 是在创建值 I/O 时指定的。不过自定义值 I/O 可以根据用途选择实现其中一种行为。
:::

```java
// 某个 BlockEntity 子类
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // 向输出写入数据

    // 创建列表
    ValueOutput.TypedInputList<Rarity> listValue = output.list("listValue", Rarity.CODEC);
    // 添加元素
    listValue.add(Rarity.COMMON);
    listValue.add(Rarity.EPIC);
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // 从输入读取数据

    // 读取列表中的值
    for (Rarity rarity : input.listOrEmpty("listValue", Rarity.CODEC)) {
        // ...
    }
}
```

:::warning
即使列表为空，它仍会被写入 `ValueOutput`。如果不希望写入列表，应检查 `TypedOutputList` 或 `ValueOutputList` 是否 `isEmpty`，然后使用列表键调用 `discard`。

```java
// 某个 BlockEntity 子类
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // 向输出写入数据

    // 创建列表
    ValueOutput.TypedInputList<Rarity> listValue = output.list("listValue", Rarity.CODEC);
    
    // 检查列表是否为空
    if (listValue.isEmpty()) {
        // 从输出中丢弃列表
        output.discard("listValue");
    }
}
```
:::

### 对象

对象可以通过子值创建和读取。`ValueOutput#child` 根据键创建新的 `ValueObject`。随后可以使用 `ValueInput#child` 读取该对象；如果希望在对象不存在时得到目标值为空的 `ValueInput`，也可以使用 `childOrEmpty`。

```java
// 某个 BlockEntity 子类
@Override
protected void saveAdditional(ValueOutput output) {
    super.saveAdditional(output);
    
    // 向输出写入数据

    // 创建对象
    ValueOutput objectValue = output.child("objectValue");
    // 向对象添加数据
    objectValue.putBoolean("boolChild", true);
    objectValue.putInt("intChild", 20);
}

@Override
protected void loadAdditional(ValueInput input) {
    super.loadAdditional(input);

    // 从输入读取数据

    // 读取对象
    ValueInput objectValue = input.childOrEmpty("objectValue");
    // 从对象读取数据
    boolean boolChild = objectValue.getBooleanOr("boolChild", false);
    int intChild = objectValue.getIntOr("intChild", 0);
}
```

## `ValueIOSerializable` {#valueioserializable}

`ValueIOSerializable` 是 NeoForge 添加的接口，供能够通过值 I/O 序列化和反序列化的对象使用。NeoForge 使用此 API 处理[数据附件][attachments]。该接口提供两个方法：`serialize` 把对象写入 `ValueOutput`，`deserialize` 从 `ValueInput` 读取对象。

```java
public class ExampleObject implements ValueIOSerializable {
    
    @Override
    public void serialize(ValueOutput output) {
        // 在这里写入对象数据
    }

    @Override
    public void deserialize(ValueInput input) {
        // 在这里读取对象数据
    }
}
```

也可以通过 NeoForge 添加的 `ValueOutputExtension#putChild` 和 `ValueInputExtension#readChild` 写入和读取 `ValueIOSerializable`。

## 实现

### NBT

[NBT][nbt] 的值 I/O 由 `TagValueOutput` 和 `TagValueInput` 处理。

可以通过 `createWithContext` 或 `createWithoutContext` 创建 `TagValueOutput`。`createWithContext` 表示输出可以访问 `HolderLookup.Provider`，从而取得所有注册表条目（静态和数据包），而 `createWithoutContext` 不提供任何数据包访问。原版只使用 `createWithContext`。使用完 `ValueOutput` 后，可以通过 `TagValueOutput#buildResult` 取得 `CompoundTag`。另一方面，可以通过 `create` 创建 `TagValueInput`，它接收 `HolderLookup.Provider` 和输入要访问的 `CompoundTag`。

两种值 I/O 还都接收一个 `ProblemReporter`。`ProblemReporter` 用于收集读写过程中出现的所有内部错误。目前它只跟踪 `Codec` 错误。如何处理错误由模组开发者决定。原版实现会在 `ProblemReporter` 非空时抛出异常。

```java
// 假设可以访问 HolderLookup.Provider lookupProvider

TagValueOutput output = TagValueOutput.createWithContext(
    ProblemReporter.DISCARDING, // 选择丢弃所有错误
    lookupProvider
);

// 向输出写入数据……

CompoundTag tag = output.buildResult();

// 收集错误
ProblemReporter.Collector reporter = new ProblemReporter.Collector(
    // 可选：接收根路径元素
    // 某些对象（例如方块实体、实体）提供 #problemPath() 方法，可以直接传入
    new RootFieldPathElement("example_object")
);

TagValueInput input = TagValueInput.create(
    reporter,
    lookupProvider,
    tag
);

// 从输入读取数据……
```

[attachments]: attachments.md
[codec]: codecs.md
[nbt]: nbt.md
