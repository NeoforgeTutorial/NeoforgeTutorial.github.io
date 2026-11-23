---
sidebar_position: 5
---
# 保存数据（Saved Data）

保存数据（Saved Data，SD）系统可用于在关卡上保存附加数据。

_如果数据只属于某些方块实体、区块或实体，可以考虑改用[数据附件][attachments]。_

## `SavedData`

每个 SD 实现都必须继承 `SavedData` 类。它可以像其他对象一样提供自己的字段和方法，但如果要保存数据或把改动写入磁盘，就必须调用 `setDirty`。`setDirty` 会通知游戏存在需要写入的更改。如果没有调用，数据只会保留到当前关卡（使用 `MinecraftServer` 时则是当前世界）被卸载为止。

```java
// 某个保存数据实现
public class ExampleSavedData extends SavedData {

    public void foo() {
        // 修改保存数据中的数据
        // 数据发生变化时调用 setDirty
        this.setDirty();
    }
}
```

## `SavedDataType`

由于 `SavedData` 只是一个对象，还需要某种关联标识符。此外，还需要把数据读写到磁盘。这些工作由 `SavedDataType` 负责。它接收保存数据的标识符、没有数据时使用的默认构造器，以及用于编码和解码数据的 [codec]。标识符会被当作关联世界文件夹和各个关卡维度内的路径位置：

- 服务端数据：`./<world_folder>/data/<identifier_namespace>/<identifier_path>.dat`
- 单个关卡的数据：`./<world_folder>/dimensions/<level_namespace>/<level_path>/data/<identifier_namespace>/<identifier_path>.dat`

所有缺失的目录都会自动创建，包括标识符路径中使用的目录。

:::note
构造函数还有第四个 `DataFixTypes` 参数。不过 NeoForge 不支持数据修复器，因此所有原版用法都已修改为允许传入 null。
:::

`SavedDataType` 有两种构造方式。第一种接收用于创建对象的简单 `Supplier`，以及负责磁盘读写的普通 `Codec`。如果还需要访问当前 `ServerLevel` 或世界种子，可以使用 NeoForge 添加的重载，它会为两部分都接收 `SavedDataType.Factory`，并提供 `ServerLevel`。

```java
// 某个不带上下文的保存数据实现
public class NoContextExampleSavedData extends SavedData {

    public static final SavedDataType<NoContextExampleSavedData> ID = new SavedDataType<>(
        // 保存数据的标识符
        // 用作 `data` 文件夹内的路径
        Identifier.fromNamespaceAndPath("examplemod", "example"),
        // 初始构造器
        NoContextExampleSavedData::new,
        // 用于序列化数据的 codec
        RecordCodecBuilder.create(instance -> instance.group(
            Codec.INT.fieldOf("val1").forGetter(sd -> sd.val1),
            BuiltInRegistries.BLOCK.byNameCodec().fieldOf("val2").forGetter(sd -> sd.val2)
        ).apply(instance, NoContextExampleSavedData::new))
    );

    // 初始构造器
    public NoContextExampleSavedData() {
        // ...
    }

    // 数据构造器
    public NoContextExampleSavedData(int val1, Block val2) {
        // ...
    }

    public void foo() {
        // 修改保存数据中的数据
        // 数据发生变化时调用 setDirty
        this.setDirty();
    }
}

// 某个带上下文的保存数据实现
public class ContextExampleSavedData extends SavedData {

    public static final SavedDataType<ContextExampleSavedData> ID = new SavedDataType<>(
        // 保存数据的标识符
        // 用作 `data` 文件夹内的路径
        Identifier.fromNamespaceAndPath("examplemod", "example"),
        // 初始构造器
        ContextExampleSavedData::new,
        // 用于序列化数据的 codec
        level -> RecordCodecBuilder.create(instance -> instance.group(
            RecordCodecBuilder.point(level),
            Codec.INT.fieldOf("val1").forGetter(sd -> sd.val1),
            BuiltInRegistries.BLOCK.byNameCodec().fieldOf("val2").forGetter(sd -> sd.val2)
        ).apply(instance, ContextExampleSavedData::new))
    );

    // 初始构造器
    public ContextExampleSavedData(ServerLevel level) {
        // ...
    }

    // 数据构造器
    public ContextExampleSavedData(ServerLevel level, int val1, Block val2) {
        // ...
    }

    public void foo() {
        // 修改保存数据中的数据
        // 数据发生变化时调用 setDirty
        this.setDirty();
    }
}
```

## 附加到关卡

任何 `SavedData` 都会动态加载并附加到某个关卡或服务端。因此，如果从未在某个关卡或服务端创建它，它就不会存在。

`SavedData` 由 `SavedDataStorage` 创建和加载。可以通过 `ServerChunkCache#getDataStorage` 或 `ServerLevel#getDataStorage` 取得它，然后调用 `SavedDataStorage#computeIfAbsent` 并传入 `SavedDataType`，取得或创建对应的实例。该方法会在实例存在时取得当前 SD，否则创建一个新实例并加载所有可用数据。

```java
// 在某个可以访问 SavedDataStorage 的方法中
netherDataStorage.computeIfAbsent(ContextExampleSavedData.ID);
```

如果某个 SD 并不专属于某个关卡，应通过 `MinecraftServer#getDataStorage` 把它附加到 `MinecraftServer`。

[attachments]: attachments.md
[codec]: codecs.md
