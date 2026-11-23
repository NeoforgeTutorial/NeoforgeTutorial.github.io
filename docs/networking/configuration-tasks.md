---
sidebar_position: 3
---
# 使用配置任务

客户端与服务端的网络协议包含一个特殊阶段：在玩家真正加入游戏之前，服务端可以配置客户端。这个阶段称为配置阶段，例如原版服务端会在此阶段向客户端发送资源包信息。

模组也可以利用这个阶段，在玩家加入游戏前配置客户端。

## 注册配置任务

使用配置阶段的第一步，是注册一个配置任务。可以在 `RegisterConfigurationTasksEvent` 事件中注册新的配置任务：

```java
@SubscribeEvent // 在模组事件总线上
public static void register(final RegisterConfigurationTasksEvent event) {
    event.register(new MyConfigurationTask());
}
```

`RegisterConfigurationTasksEvent` 在模组事件总线上触发，并提供服务端当前用于配置客户端的监听器。模组开发者可以使用这个监听器判断客户端是否运行了本模组；如果运行了，再注册配置任务。

## 实现配置任务

配置任务的接口很简洁：`ICustomConfigurationTask`。该接口包含两个方法：`void run(Consumer<CustomPacketPayload> sender);` 和 `ConfigurationTask.Type type();`。后者返回配置任务的类型，用于标识配置任务。下面是一个配置任务示例：

```java
public record MyConfigurationTask implements ICustomConfigurationTask {
    public static final ConfigurationTask.Type TYPE = new ConfigurationTask.Type(Identifier.fromNamespaceAndPath("mymod", "my_task"));
    
    @Override
    public void run(final Consumer<CustomPacketPayload> sender) {
        final MyData payload = new MyData();
        sender.accept(payload);
    }

    @Override
    public ConfigurationTask.Type type() {
        return TYPE;
    }
}
```

## 确认配置任务

配置任务在服务端执行，因此服务端需要知道何时可以执行下一个配置任务。这通过确认当前配置任务已经完成来实现。

主要有两种确认方式。

### 捕获监听器

如果客户端不需要确认配置任务，可以捕获监听器，并直接在服务端确认配置任务：

```java
public record MyConfigurationTask(ServerConfigurationPacketListener listener) implements ICustomConfigurationTask {
    public static final ConfigurationTask.Type TYPE = new ConfigurationTask.Type(Identifier.fromNamespaceAndPath("mymod", "my_task"));
    
    @Override
    public void run(final Consumer<CustomPacketPayload> sender) {
        final MyData payload = new MyData();
        sender.accept(payload);
        this.listener().finishCurrentTask(this.type());
    }

    @Override
    public ConfigurationTask.Type type() {
        return TYPE;
    }
}
```

要使用这种配置任务，需要在 `RegisterConfigurationTasksEvent` 事件中捕获监听器：

```java
@SubscribeEvent // 在模组事件总线上
public static void register(final RegisterConfigurationTasksEvent event) {
    event.register(new MyConfigurationTask(event.getListener()));
}
```

这样，当前配置任务完成后，服务端会立即执行下一个配置任务，客户端无需确认。同时，服务端不会等待客户端处理完已发送的载荷。

### 确认配置任务

如果客户端需要确认配置任务，就必须向客户端发送自己的载荷：

```java
public record AckPayload() implements CustomPacketPayload {
    public static final CustomPacketPayload.Type<AckPayload> TYPE = new CustomPacketPayload.Type<>(Identifier.fromNamespaceAndPath("mymod", "ack"));
    
    // 不写入任何数据的 unit 编解码器
    public static final StreamCodec<ByteBuf, AckPayload> STREAM_CODEC = StreamCodec.unit(new AckPayload());

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
```

服务端配置任务发送的载荷被正确处理完后，可以向服务端发送这个载荷，以确认配置任务：

```java
public void onMyData(MyData data, IPayloadContext context) {
    context.enqueueWork(() -> {
        blah(data.name());
    })
    .exceptionally(e -> {
        // 处理异常
        context.disconnect(Component.translatable("my_mod.configuration.failed", e.getMessage()));
        return null;
    })
    .thenAccept(v -> {
        context.reply(new AckPayload());
    });     
}
```

这里的 `onMyData` 是服务端配置任务所发送载荷的处理函数。

服务端收到这个载荷后，会确认配置任务，并开始执行下一个配置任务：

```java
public void onAck(AckPayload payload, IPayloadContext context) {
    context.finishCurrentTask(MyConfigurationTask.TYPE);
}
```

这里的 `onAck` 是客户端发送载荷的处理函数。

## 阻塞登录流程

如果没有确认配置任务，服务端会一直等待，客户端永远无法加入游戏。因此，务必确认配置任务；如果配置任务失败，则应断开客户端连接。
