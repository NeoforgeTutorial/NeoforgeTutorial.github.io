---
sidebar_position: 2
---
# 数据与网络同步

没有数据的实体会非常无用，因此实体上的数据保存十分重要。所有实体都会保存一些默认数据，例如类型和位置。本文介绍如何添加自定义数据，以及如何同步这些数据。

添加数据最简单的方法是在 `Entity` 类中声明字段。随后可以任意操作这些数据。不过，一旦需要同步数据，这种做法很快就会变得非常麻烦。因为大多数实体逻辑只在服务端运行，只有偶尔（取决于 [`EntityType`][entitytype] 的 `clientUpdateInterval` 值）才会向客户端发送更新；服务端 tick 速度较慢时容易观察到的实体“延迟”也来自这一机制。

因此，原版引入了若干系统来解决此问题，每个系统有特定用途。必要时，也始终可以选择[发送自定义数据][custom]。

## `SynchedEntityData`

`SynchedEntityData` 用于在运行时保存值并通过网络同步。它分为三类：

- `EntityDataSerializer` 基本是 [`StreamCodec`][streamcodec] 的封装。
    - Minecraft 使用硬编码的序列化器映射。NeoForge 把此映射转换为注册表，因此新的 `EntityDataSerializer` 必须通过[注册][registration]添加。
    - Minecraft 在 `EntityDataSerializers` 类中定义了多种默认 `EntityDataSerializer`。
- `EntityDataAccessor` 由实体持有，用于取得和设置数据值。
- `SynchedEntityData` 保存实体的所有 `EntityDataAccessor`，并在需要时自动调用相应 `EntityDataSerializer` 同步值。

首先，在实体类中创建 `EntityDataAccessor`：

```java
public class MyEntity extends Entity {
    // 泛型必须与下面第二个参数的类型一致。
    public static final EntityDataAccessor<Integer> MY_DATA =
        SynchedEntityData.defineId(
            // 实体类。
            MyEntity.class,
            // 实体数据访问器类型。
            EntityDataSerializers.INT
        );
}
```

:::danger
虽然编译器允许在 `SynchedEntityData#defineId()` 的第一个参数中使用实体所属类以外的类，但这样做会导致难以调试的问题，因此无论如何都应避免。（通过 Mixin 等方式添加字段时也要注意。）
:::

然后必须在 `defineSynchedData` 方法中定义默认值：

```java
public class MyEntity extends Entity {
    public static final EntityDataAccessor<Integer> MY_DATA = SynchedEntityData.defineId(MyEntity.class, EntityDataSerializers.INT);

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder builder) {
        // 默认值为零。
        builder.define(MY_DATA, 0);
    }
}
```

最后，可以这样取得和设置实体数据（假设位于 `MyEntity` 内的方法中）：

```java
int data = this.getEntityData().get(MY_DATA);
this.getEntityData().set(MY_DATA, 1);
```

## `readAdditionalSaveData` 与 `addAdditionalSaveData`

这两个方法用于把数据读写到磁盘。它们通过[值 I/O][valueio]读取和保存值：

```java
// 假设类中存在 `int data`。
@Override
protected void readAdditionalSaveData(ValueInput input) {
    this.data = input.getIntOr("my_data", 0);
}

@Override
protected void addAdditionalSaveData(ValueOutput output) {
    output.putInt("my_data", this.data);
}
```

## 自定义生成数据

有时，实体生成时客户端需要一些自定义数据，但这些数据之后不会变化。此时可以在实体上实现 `IEntityWithComplexSpawn` 接口，并使用 `#writeSpawnData` 和 `#readSpawnData` 在网络缓冲区中读写数据：

```java
@Override
public void writeSpawnData(RegistryFriendlyByteBuf buf) {
    buf.writeInt(1234);
}

@Override
public void readSpawnData(RegistryFriendlyByteBuf buf) {
    int i = buf.readInt();
}
```

此外，也可以在实体生成时发送自定义数据包。为此，重写 `IEntityExtension#sendPairingData`，并像发送其他数据包一样发送：

```java
@Override
public void sendPairingData(ServerPlayer player, Consumer<CustomPacketPayload> packetConsumer) {
    // 调用父类实现以获得基础功能。
    super.sendPairingData(player, packetConsumer);
    // 添加自己的数据包。
    packetConsumer.accept(new MyPacket(...));
}
```

关于自定义网络数据包，请参阅[网络通信文章][networking]。

## 数据附件

实体已被修改为继承 `AttachmentHolder`，因此支持通过[数据附件][attachment]保存数据。其主要用途是为不属于自己的实体（例如 Minecraft 或其他模组添加的实体）定义自定义数据。更多信息见链接文章。

## 自定义网络消息 {#custom-network-messages}

同步时，也始终可以在需要时通过自定义数据包发送附加信息。更多信息请参阅[网络通信文章][networking]。

[attachment]: ../datastorage/attachments.md
[custom]: #custom-network-messages
[entitytype]: index.md#entitytype
[networking]: ../networking/index.md
[registration]: ../concepts/registries.md#methods-for-registering
[streamcodec]: ../networking/streamcodecs.md
[valueio]: ../datastorage/valueio.md
