---
sidebar_position: 4
---
# 数据附件

数据附件系统允许模组在方块实体、区块、实体和关卡上附加并保存额外数据。

_如果需要保存额外的关卡数据，可以使用[保存数据][saveddata]。_

:::note
物品堆栈的数据附件已由原版的[数据组件][datacomponents]取代。
:::

## 创建附件类型

要使用该系统，需要注册一个 `AttachmentType`。附件类型包含以下配置：

- 默认值提供器，在首次访问数据时创建实例。
- 可选的序列化器，用于持久化附件。
- （如果配置了序列化器）`copyOnDeath` 标志，用于在实体死亡时自动复制实体数据（见下文）。

:::tip
如果不需要持久化附件，就不要提供序列化器。
:::

提供附件序列化器有几种方式：直接实现 `IAttachmentSerializer`；实现 [`ValueIOSerializable`][valueio] 并使用静态方法 `AttachmentType#serializable` 创建构建器；或向构建器提供 map codec。

无论使用哪种方式，附件都**必须注册**到 `NeoForgeRegistries.ATTACHMENT_TYPES`。例如：

```java
// 为附件类型创建 DeferredRegister
private static final DeferredRegister<AttachmentType<?>> ATTACHMENT_TYPES = DeferredRegister.create(NeoForgeRegistries.ATTACHMENT_TYPES, MOD_ID);

// 通过 ValueIOSerializable 序列化
private static final Supplier<AttachmentType<ItemStacksResourceHandler>> HANDLER = ATTACHMENT_TYPES.register(
    "handler", () -> AttachmentType.serializable(() -> new ItemStacksResourceHandler(1)).build()
);
// 通过 map codec 序列化
private static final Supplier<AttachmentType<Integer>> MANA = ATTACHMENT_TYPES.register(
    "mana", () -> AttachmentType.builder(() -> 0).serialize(Codec.INT.fieldOf("mana")).build()
);
// 不序列化
private static final Supplier<AttachmentType<SomeCache>> SOME_CACHE = ATTACHMENT_TYPES.register(
    "some_cache", () -> AttachmentType.builder(() -> new SomeCache()).build()
);

// 在模组构造器中，别忘了把 DeferredRegister 注册到模组事件总线：
ATTACHMENT_TYPES.register(modBus);
```

## 使用附件类型

注册附件类型后，就可以在任何持有者对象上使用它。如果尚无数据，调用 `getData` 会附加一个新的默认实例。

```java
// 如果已经存在 ItemStacksResourceHandler，就取得它；否则附加一个新实例：
ItemStacksResourceHandler handler = chunk.getData(HANDLER);
// 如果玩家魔力可用就取得当前值，否则附加 0：
int playerMana = player.getData(MANA);
// 以此类推……
```

如果不希望附加默认实例，可以先使用 `hasData` 检查：

```java
// 执行任何操作前，检查区块是否具有 HANDLER 附件。
if (chunk.hasData(HANDLER)) {
    ItemStacksResourceHandler handler = chunk.getData(HANDLER);
    // 对 chunk.getData(HANDLER) 执行操作。
}
```

也可以使用 `setData` 更新数据：

```java
// 把魔力增加 10。
player.setData(MANA, player.getData(MANA) + 10);
```

:::important
通常，方块实体和区块被修改后需要标记为脏数据（通过 `setChanged` 和 `setUnsaved(true)`）。调用 `setData` 时会自动完成这一操作：

```java
chunk.setData(MANA, chunk.getData(MANA) + 10); // 会自动调用 setUnsaved
```

但如果修改的是通过 `getData` 取得的数据（包括新建的默认实例），就必须显式把方块实体和区块标记为脏数据：

```java
var mana = chunk.getData(MUTABLE_MANA);
mana.set(10);
chunk.setUnsaved(true); // 因为未使用 setData，必须手动调用
```
:::

## 与客户端共享数据

要把方块实体、区块、关卡或实体的附件同步到客户端，可以在构建器中实现 `sync`。当附件通过 `AttachmentHolder#getData` 按默认值创建、通过 `AttachmentHolder#setData` 更新，或通过 `AttachmentHolder#removeData` 移除时，它会被发送到客户端。如果需要在其他时机发送，可以调用 `AttachmentHolder#syncData` 并传入对应的 `AttachmentType`。

`AttachmentType.Builder#sync` 有三个重载，它们都会创建 `AttachmentSyncHandler<T>`，其中 `T` 是数据附件的类型。该处理器有三个方法：两个分别用于网络 `read` 和 `write`，另一个用于判断指定玩家能否看到持有者广播的数据（`sendToPlayer`）。如果数据附件被移除，同步处理器会被忽略。

```java
public class ExampleSyncHandler implements AttachmentSyncHandler<ExampleData> {

    @Override
    public void write(RegistryFriendlyByteBuf buf, ExampleData attachment, boolean initialSync) {
        // 把附件数据写入缓冲区
        // 如果 `initialSync` 为 true，应写入完整附件，因为客户端之前没有数据
        // 如果 `initialSync` 为 false，可以只写入需要更新的数据

        // 示例：
        if (initialSync) {
            // 写入完整附件
            ExampleData.STREAM_CODEC.encode(buf, attachment);
        } else {
            // 写入更新数据
        }
    }

    @Override
    @Nullable
    public ExampleData read(IAttachmentHolder holder, RegistryFriendlyByteBuf buf, @Nullable ExampleData previousValue) {
        // 从缓冲区读取数据并返回新的数据附件
        // 如果客户端之前没有数据，`previousValue` 为 `null`
        // 如果需要移除数据附件，结果应返回 `null`

        // 示例：
        if (previousValue == null) {
            // 读取完整附件
            return ExampleData.STREAM_CODEC.decode(buf);
        } else {
            // 读取更新数据并合并到之前的值
            return previousValue;
        }
    }

    @Override
    public boolean sendToPlayer(IAttachmentHolder holder, ServerPlayer to) {
        // 返回持有者数据是否同步给指定玩家客户端
        // 检查的玩家因附件持有者而异：
        // - 方块实体：所有正在跟踪该方块实体所在区块的玩家
        // - 区块：所有正在跟踪该区块的玩家
        // - 实体：所有正在跟踪当前实体的玩家；如果当前玩家就是持有者，也包括该玩家
        // - 关卡：当前维度/关卡中的所有玩家

        // 示例：
        // 仅当玩家就是附件持有者时发送附件
        return holder == to;
    }
}
```

另外两个重载会委托给 `AttachmentSyncHandler`，分别接收用于 `read` 和 `write` 的 [`StreamCodec`][streamcodec]，以及可选的 `sendToPlayer` 谓词。

```java
// 假设 ExampleData 具有某个 STREAM_CODEC

// 同步处理器
public static final Supplier<AttachmentType<ExampleData>> WITH_SYNC_HANDLER = ATTACHMENT_TYPES.register(
    "with_sync_handler", () -> AttachmentType.builder(() -> new ExampleData())
        .sync(new ExampleSyncHandler())
        .build()
);


// Stream codec
public static final Supplier<AttachmentType<ExampleData>> WITH_STREAM_CODEC = ATTACHMENT_TYPES.register(
    "with_stream_codec", () -> AttachmentType.builder(() -> new ExampleData())
        .sync(ExampleData.STREAM_CODEC)
        .build()
);

// 带谓词的 stream codec
public static final Supplier<AttachmentType<ExampleData>> WITH_PREDICATE = ATTACHMENT_TYPES.register(
    "with_predicate", () -> AttachmentType.builder(() -> new ExampleData())
        .sync((holder, to) -> holder == to, ExampleData.STREAM_CODEC)
        .build()
);
```

:::note
使用 `StreamCodec` 重载时，每次都会同步完整数据附件，忽略客户端之前已有的数据。
:::

## 玩家死亡时复制数据

默认情况下，玩家死亡时不会复制[实体]数据附件。要在玩家死亡时自动复制附件，请在附件构建器中设置 `copyOnDeath`。

更复杂的处理可以通过 `PlayerEvent.Clone` 实现：从原实体读取数据并赋给新实体。在此事件中，可以使用 `#isWasDeath` 区分死亡后重生和从末地返回。这个区分很重要，因为从末地返回时数据已经存在，必须避免在这种情况下重复添加值。

例如：

```java
@SubscribeEvent // 在游戏事件总线上
public static void onClone(PlayerEvent.Clone event) {
    if (event.isWasDeath() && event.getOriginal().hasData(MY_DATA)) {
        event.getEntity().getData(MY_DATA).fieldToCopy = event.getOriginal().getData(MY_DATA).fieldToCopy;
    }
}
```

[datacomponents]: ../items/datacomponents.md
[entity]: ../entities/index.md
[saveddata]: saveddata.md
[streamcodec]: ../../26.1/networking/streamcodecs.md
[valueio]: valueio.md#valueioserializable
