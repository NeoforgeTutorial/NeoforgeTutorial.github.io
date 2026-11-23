# 粒子

粒子通常是使用其关联粒子类型生成的视觉效果。它们可以在客户端和服务端[端]生成，但粒子主要是视觉效果，关键部分只存在于物理（和逻辑）客户端。

本文介绍粒子类型和粒子描述的定义与使用。关于渲染的更多信息，请参阅配套的[客户端粒子][clientparticle]文章。

## 注册 `ParticleType`

粒子通过 `ParticleType` 注册。它们的工作方式与 `EntityType` 或 `BlockEntityType` 类似：有一个 `Particle` 类，每个生成的粒子都是该类实例；还有一个包含通用信息、用于注册的 `ParticleType` 类。`ParticleType` 属于[注册表]，因此要像其他注册对象一样使用 `DeferredRegister` 注册：

```java
public class MyParticleTypes {
    // 假设你的模组 ID 是 examplemod
    public static final DeferredRegister<ParticleType<?>> PARTICLE_TYPES =
        DeferredRegister.create(BuiltInRegistries.PARTICLE_TYPE, "examplemod");
    
    // 添加新粒子类型的最简单方式是复用原版的 SimpleParticleType。
    // 也可以实现自定义 ParticleType，见下文。
    public static final Supplier<SimpleParticleType> MY_QUAD_PARTICLE = PARTICLE_TYPES.register(
        // 粒子类型的名称。
        "my_quad_particle",
        // Supplier。布尔参数表示是否让视频设置中的 Particles 选项设为 Minimal 时影响该粒子类型；
        // 大多数原版粒子为 false，但爆炸、营火烟雾或鱿鱼墨汁等粒子为 true。
        () -> new SimpleParticleType(false)
    );
}
```

:::info
只有在服务端处理粒子时才需要 `ParticleType`。客户端也可以直接使用 `Particle`。
:::

## 自定义 `ParticleType`

大多数情况下 `SimpleParticleType` 已经足够，但有时需要在服务端为粒子附加额外数据。此时需要自定义 `ParticleType` 和关联的自定义 `ParticleOptions`。先从实际保存信息的 `ParticleOptions` 开始：

```java
public class MyParticleOptions implements ParticleOptions {
    
    // 定义粒子额外信息的 map codec，例如用于命令。
    // 由于我们的类型没有信息，所以使用 unit map codec；
    // 这相当于在命令中使用空字符串。
    public static final MapCodec<MyParticleOptions> CODEC = MapCodec.unit(new MyParticleOptions());

    // 从网络缓冲区读写信息。
    public static final StreamCodec<ByteBuf, MyParticleOptions> STREAM_CODEC = StreamCodec.unit(new MyParticleOptions());

    // 不需要参数，但可以定义粒子工作所需的字段。
    public MyParticleOptions() {}

    @Override
    public ParticleType<?> getType() {
        // 返回已注册的粒子类型
    }
}
```

然后在自定义 `ParticleType` 中使用这个 `ParticleOptions` 实现……

```java
public class MyParticleType extends ParticleType<MyParticleOptions> {
    // 布尔参数同样决定低粒子设置下是否限制该粒子。
    // 更多信息见本文开头的 MyParticleTypes 类实现。
    public MyParticleType(boolean overrideLimiter) {
        // 把反序列化器传给父类。
        super(overrideLimiter);
    }

    @Override
    public MapCodec<MyParticleOptions> codec() {
        return MyParticleOptions.CODEC;
    }

    @Override
    public StreamCodec<? super RegistryFriendlyByteBuf, MyParticleOptions> streamCodec() {
        return MyParticleOptions.STREAM_CODEC;
    }
}
```

……并在[注册][registry]时引用它：

```java
public static final Supplier<MyParticleType> MY_CUSTOM_PARTICLE = PARTICLE_TYPES.register(
    "my_custom_particle",
    () -> new MyParticleType(false)
);
```

随后在 `ParticleOptions#getType` 中返回已注册的粒子：

```java
public class MyParticleOptions implements ParticleOptions {
    
    // ...

    @Override
    public ParticleType<?> getType() {
        return MY_CUSTOM_PARTICLE.get();
    }
}
```

## 粒子描述

粒子描述是位于 `assets/<namespace>/particles` 目录中的 JSON 文件。粒子描述的名称与其关联的[粒子类型][particletype]相同，内容是一组相对于 `assets/<namespace>/textures/particles` 的纹理。

粒子描述类似下面这样：

```json5
{
    // 按顺序循环播放的纹理列表。必要时会循环。
    // 纹理位置相对于 textures/particle 文件夹。
    "textures": [
        // 指向 `assets/examplemod/textures/particle/my_particle_0.png`
        "examplemod:my_particle_0",
        "examplemod:my_particle_1",
        "examplemod:my_particle_2",
        "examplemod:my_particle_3"
    ]
}
```

在[资源重载][reload]期间，`ParticleResources` 会加载所有粒子描述，并把纹理拼接到 `TextureAtlas#LOCATION_PARTICLES` 图集中。然后为每个描述创建一个 `SpriteSet`，其中包含指定的 `TextureAtlasSprite` 列表。

### 使用粒子描述

要让[粒子]使用其描述，必须通过[客户端][side][模组总线][modbus][事件] `RegisterParticleProvidersEvent`，把 `ParticleType` 与接收 `SpriteSet` 的 [`ParticleProvider`][provider] 关联：

```java
public class MyParticleProvider implements ParticleProvider<SimpleParticleType> {

    private final SpriteSet spriteSet;

    // 接收 `ParticleResources` 提供的精灵集合。
    public MyParticleProvider(SpriteSet spriteSet) {
        this.spriteSet = spriteSet;
    }

    // ...
}

// 在某个仅客户端事件处理器中

@SubscribeEvent // 仅在物理客户端的模组事件总线上
public static void registerParticleProviders(RegisterParticleProvidersEvent event) {
    // 使用粒子描述时 MUST 调用 #registerSpriteSet。
    event.registerSpriteSet(MyParticleTypes.MY_PARTICLE.get(), MyParticleProvider::new);
}
```

:::warning
如果为某个粒子类型创建了粒子描述，却没有通过 `RegisterParticleProvidersEvent#registerSpriteSet` 关联 `ParticleProvider`，日志中会输出“Redundant texture list”消息。
:::

### 数据生成 {#datagen}

粒子定义文件也可以通过继承 `ParticleDescriptionProvider` 并重写 `#addDescriptions()` 来[数据生成][datagen]：

```java
public class MyParticleDescriptionProvider extends ParticleDescriptionProvider {
    // 从 `GatherDataEvent.Client` 获取参数。
    public MyParticleDescriptionProvider(PackOutput output) {
        super(output);
    }

    // 假设所有引用的粒子确实存在。把 "examplemod" 替换为你的模组 ID。
    @Override
    protected void addDescriptions() {
        // 添加一个单精灵粒子定义，其文件位于
        // assets/examplemod/textures/particle/my_single_particle.png。
        spriteSet(MyParticleTypes.MY_SINGLE_PARTICLE.get(), Identifier.fromNamespaceAndPath("examplemod", "my_single_particle"));
        // 添加一个多精灵粒子定义，使用可变参数；也接受可迭代对象。
        spriteSet(MyParticleTypes.MY_MULTI_PARTICLE.get(),
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle_0"),
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle_1"),
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle_2")
        );
        // 上一种用法的替代方式：在给定基础名称后追加 "_<索引>"，并指定纹理数量。
        spriteSet(MyParticleTypes.MY_ALT_MULTI_PARTICLE.get(),
            // 基础名称。
            Identifier.fromNamespaceAndPath("examplemod", "my_multi_particle"),
            // 纹理数量。
            3,
            // 是否反转列表，即从最后一个元素而非第一个元素开始。
            false
        );
    }
}
```

不要忘记把 provider 添加到 `GatherDataEvent.Client`：

```java
@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MyParticleDescriptionProvider::new);
}
```

## 生成粒子

再次提醒，服务端只知道[`ParticleType`][particletype]和 [`ParticleOption`][options]，客户端则直接使用与 `ParticleType` 关联的 `ParticleProvider` 提供的 `Particle`。因此，粒子生成方式在两端有明显差异。

- **通用代码**：调用 `Level#addParticle` 或 `Level#addAlwaysVisibleParticle`。这是创建所有玩家都能看到的粒子的首选方式。
- **客户端代码**：使用通用代码的方式；或者用所选粒子类创建 `new Particle()`，再调用 `Minecraft.getInstance().particleEngine#add(Particle)` 添加。注意，这样添加的粒子只会在当前客户端显示，其他玩家看不到。
- **服务端代码**：调用 `ServerLevel#sendParticles`。原版 `/particle` 命令使用此方法。

[clientparticle]: ../../../26.1/rendering/particles.md
[datagen]: ../index.md#data-generation
[event]: ../../concepts/events.md
[modbus]: ../../concepts/events.md#event-buses
[options]: #custom-particletypes
[particle]: ../../../26.1/rendering/particles.md
[particletype]: #registering-particletypes
[provider]: ../../../26.1/rendering/particles.md#particleprovider
[reload]: ../reloadlisteners.md#reloading
[side]: ../../concepts/sides.md
