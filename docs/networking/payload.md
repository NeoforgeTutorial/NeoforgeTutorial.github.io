---
sidebar_position: 1
---
# 注册载荷

载荷（payload）用于在客户端与服务端之间发送任意数据。需要监听 `RegisterPayloadHandlersEvent` 事件，并通过其中的 `PayloadRegistrar` 注册载荷。

```java
@SubscribeEvent // 在模组事件总线上
public static void register(RegisterPayloadHandlersEvent event) {
    // 设置当前网络版本
    final PayloadRegistrar registrar = event.registrar("1");
}
```

假设要发送以下数据：

```java
public record MyData(String name, int age) {}
```

那么可以实现 `CustomPacketPayload` 接口，创建一个可用来发送和接收这些数据的载荷：

```java
public record MyData(String name, int age) implements CustomPacketPayload {
    
    public static final CustomPacketPayload.Type<MyData> TYPE = new CustomPacketPayload.Type<>(Identifier.fromNamespaceAndPath("mymod", "my_data"));

    // 每对元素分别定义字段的流编解码器和编码时获取字段的函数。
    // 'name' 会按字符串编码和解码。
    // 'age' 会按整数编码和解码。
    // 最后一个参数按前面参数的顺序接收它们，用于构造载荷对象。
    public static final StreamCodec<ByteBuf, MyData> STREAM_CODEC = StreamCodec.composite(
        ByteBufCodecs.STRING_UTF8,
        MyData::name,
        ByteBufCodecs.VAR_INT,
        MyData::age,
        MyData::new
    );
    
    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
```

如上面的示例所示，`CustomPacketPayload` 接口要求实现 `type` 方法，该方法返回此载荷的唯一标识符。还需要一个读取器，也就是 `StreamCodec`，供之后注册时读写载荷数据。

最后，把载荷注册到注册器：

```java
// 在某个通用事件类中

@SubscribeEvent // 在模组事件总线上
public static void register(RegisterPayloadHandlersEvent event) {
    final PayloadRegistrar registrar = event.registrar("1");
    registrar.playBidirectional(
        MyData.TYPE,
        MyData.STREAM_CODEC,
        ServerPayloadHandler::handleDataOnMain
    );
}

// 在某个仅客户端事件类中

@SubscribeEvent // 仅在物理客户端上于模组事件总线触发
public static void register(RegisterClientPayloadHandlersEvent event) {
    event.register(
        MyData.TYPE,
        ClientPayloadHandler::handleDataOnMain
    );
}
```

代码中有以下几点值得注意：

- 注册器提供 `play*` 方法，用于注册游戏游玩阶段发送的载荷。
    - 示例中没有展示 `configuration*` 和 `common*` 方法。它们同样可以注册配置阶段使用的载荷；`common` 方法可以同时注册配置阶段和游玩阶段的载荷。
- 注册器使用 `*Bidirectional` 方法注册会同时发往逻辑服务端和逻辑客户端的载荷。
    - 示例中没有展示 `*ToClient` 和 `*ToServer` 方法。它们分别用于注册只发往逻辑客户端或只发往逻辑服务端的载荷。
- 载荷类型是载荷的唯一标识符。
- [流编解码器][streamcodec]用于在网络缓冲区中读写载荷。
- 载荷处理函数会在载荷到达某个逻辑端时被调用。
    - 使用 `*ToServer` 方法时，载荷处理函数是方法最后一个参数。
    - 使用 `*ToClient` 方法时，需要通过 `RegisterClientPayloadHandlersEvent` 注册载荷处理函数，并传入载荷类型和处理函数。
    - 使用 `*Bidirectional` 方法时，两端都需要注册载荷处理函数。

:::note
客户端载荷处理函数使用单独的事件 `RegisterClientPayloadHandlersEvent`，以避免代码跨越逻辑端和物理[端][sides]。
:::

载荷注册完成后，还需要实现处理函数。这里重点介绍客户端处理函数；服务端处理函数的写法非常相似。

```java
public class ClientPayloadHandler {
    
    public static void handleDataOnMain(final MyData data, final IPayloadContext context) {
        // 在主线程上处理数据
        blah(data.age());
    }
}
```

这里需要注意：

- 处理函数接收载荷，以及一个包含上下文的 `IPayloadContext` 对象。
- 默认情况下，载荷处理函数在主线程上调用。

如果计算量很大，应改为在网络线程上完成，避免阻塞主线程。对于客户端发往服务端的连接，可以在注册载荷前通过 `PayloadRegistrar#executesOn` 把 `PayloadRegistrar` 的 `HandlerThread` 设为 `HandlerThread#NETWORK`；对于服务端发往客户端的连接，则需要在 `RegisterClientPayloadHandlersEvent#register` 中传入 `HandlerThread`。

```java
// 在某个通用事件类中

@SubscribeEvent // 在模组事件总线上
public static void register(RegisterPayloadHandlersEvent event) {
    final PayloadRegistrar registrar = event.registrar("1")
        .executesOn(HandlerThread.NETWORK); // 之后注册的载荷都在网络线程上处理
    registrar.playBidirectional(
        MyData.TYPE,
        MyData.STREAM_CODEC,
        ServerPayloadHandler::handleDataOnNetwork
    );
}

// 在某个仅客户端事件类中

@SubscribeEvent // 仅在物理客户端上于模组事件总线触发
public static void register(RegisterClientPayloadHandlersEvent event) {
    event.register(
        MyData.TYPE,
        HandlerThread.NETWORK, // 载荷处理函数将在网络线程上调用
        ClientPayloadHandler::handleDataOnNetwork
    );
}
```

:::note
调用 `executesOn` 后注册的所有载荷都会沿用相同的线程设置，直到再次调用 `executesOn`。

```java
PayloadRegistrar registrar = event.registrar("1");

registrar.playBidirectional(...); // 在主线程上处理
registrar.playBidirectional(...); // 在主线程上处理

// 这些配置方法会创建新的注册器实例，因此必须保存返回值。
registrar = registrar.executesOn(HandlerThread.NETWORK);

registrar.playBidirectional(...); // 在网络线程上处理
registrar.playBidirectional(...); // 在网络线程上处理

registrar = registrar.executesOn(HandlerThread.MAIN);

registrar.playBidirectional(...); // 在主线程上处理
registrar.playBidirectional(...); // 在主线程上处理
```
:::

处理函数还有以下注意事项：

- 如果需要在主游戏线程上执行代码，可以使用 `enqueueWork` 向主线程提交任务。
    - 该方法返回一个 `CompletableFuture`，并会在主线程上完成。
    - 由于返回的是 `CompletableFuture`，可以把多个任务串联起来，并在同一处处理异常。
    - 如果没有处理 `CompletableFuture` 中的异常，异常会被吞掉，**不会收到任何提示**。

```java
public class ClientPayloadHandler {
    
    public static void handleDataOnNetwork(final MyData data, final IPayloadContext context) {
        // 在网络线程上处理数据
        blah(data.name());
        
        // 在主线程上处理数据
        context.enqueueWork(() -> {
            blah(data.age());
        })
        .exceptionally(e -> {
            // 处理异常
            context.disconnect(Component.translatable("my_mod.networking.failed", e.getMessage()));
            return null;
        });
    }
}
```

之后就可以结合自定义载荷与[配置任务][configuration]，配置客户端和服务端。

## 发送载荷

`CustomPacketPayload` 通过原版数据包系统发送：发往服务端时包装为 `ServerboundCustomPayloadPacket`，发往客户端时包装为 `ClientboundCustomPayloadPacket`。发往客户端的载荷最多只能包含 1 MiB 数据，而发往服务端的载荷必须小于 32 KiB。

所有载荷最终都通过某种抽象层调用 `Connection#send` 发送。不过，如果要根据条件把数据包发给多名玩家，直接调用这些方法通常并不方便。因此，`PacketDistributor` 提供了一组便捷方法，用于向客户端发送载荷；`ClientPacketDistributor` 则提供一个向服务端发送数据包的方法 `sendToServer`。

```java
// 在客户端

// 向服务端发送载荷
ClientPacketDistributor.sendToServer(new MyData(...));

// 在服务端

// 发给一名玩家（ServerPlayer serverPlayer）
PacketDistributor.sendToPlayer(serverPlayer, new MyData(...));

// 发给所有正在追踪该区块的玩家（ServerLevel serverLevel, ChunkPos chunkPos）
PacketDistributor.sendToPlayersTrackingChunk(serverLevel, chunkPos, new MyData(...));

// 发给所有已连接的玩家
PacketDistributor.sendToAllPlayers(new MyData(...));
```

更多实现请查看 `PacketDistributor` 和 `ClientPacketDistributor` 类。

[configuration]: configuration-tasks.md
[sides]: ../concepts/sides.md
[streamcodec]: streamcodecs.md
